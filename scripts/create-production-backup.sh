#!/usr/bin/env bash
# Authorized backup only: no migrations, production restart or config writes.
set -euo pipefail
umask 077
test "${BACKUP_CONFIRMATION:-}" = create-verified-backup
source_dir=$(realpath "${1:?}")
run_id="${GITHUB_RUN_ID:?}"
[[ "$run_id" =~ ^[0-9]+$ ]]
backup="/var/backups/itapoa/site-$(date -u +%Y%m%dT%H%M%SZ)-$run_id"
test ! -e "$backup"
mkdir -p "$backup/uploads/current" "$backup/legacy-containers" "$backup/legacy-host"
chmod 700 "$backup"
app=$(docker ps --filter 'label=com.docker.swarm.service.name=itapoa_itapoa-app' --format '{{.ID}}')
db=$(docker ps --filter 'label=com.docker.swarm.service.name=itapoa_itapoa-db' --format '{{.ID}}')
[[ "$app" =~ ^[a-f0-9]+$ ]] && [[ "$db" =~ ^[a-f0-9]+$ ]]
app_image=$(docker inspect "$app" --format '{{.Image}}')
db_image=$(docker inspect "$db" --format '{{.Image}}')
restore="itapoa-backup-restore-$run_id"
cleanup(){
  if docker container inspect "$restore" >/dev/null 2>&1;then
    test "$(docker inspect "$restore" --format '{{index .Config.Labels "itapoa.backup-restore"}}')" = "$run_id"
    docker rm -f "$restore" >/dev/null
  fi
}
trap cleanup EXIT
docker service inspect itapoa_itapoa-app > "$backup/app-service.json"
docker service inspect itapoa_itapoa-db > "$backup/db-service.json"
docker exec -i "$app" node - manifest < "$source_dir/scripts/payment-db-maintenance.cjs" > "$backup/db-before.json"
docker exec "$db" sh -eu -c '
  export MYSQL_PWD="${MARIADB_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-}}"
  test -n "$MYSQL_PWD"
  exec mariadb-dump --user=root --single-transaction --quick --routines --events --triggers --hex-blob itapoa_db
' > "$backup/database.sql"
test -s "$backup/database.sql"
docker exec -i "$app" node - manifest < "$source_dir/scripts/payment-db-maintenance.cjs" > "$backup/db-after.json"
cmp -s "$backup/db-before.json" "$backup/db-after.json"

upload_dir=$(docker exec "$app" node -e 'console.log(require("path").resolve(process.env.UPLOAD_DIR||"uploads"))')
[[ "$upload_dir" = /app/* && "$upload_dir" != /app/ ]]
docker exec -i "$app" node - "$upload_dir" < "$source_dir/scripts/upload-backup-manifest.cjs" > "$backup/uploads-before.json"
docker cp "$app:$upload_dir/." "$backup/uploads/current/"
docker exec -i "$app" node - "$upload_dir" < "$source_dir/scripts/upload-backup-manifest.cjs" > "$backup/uploads-after.json"
cmp -s "$backup/uploads-before.json" "$backup/uploads-after.json"
docker run --rm -i --network none --mount "type=bind,source=$backup/uploads/current,target=/snapshot,readonly" "$app_image" node - /snapshot < "$source_dir/scripts/upload-backup-manifest.cjs" > "$backup/uploads-copied.json"
cmp -s "$backup/uploads-before.json" "$backup/uploads-copied.json"
for previous in $(docker ps -a --filter 'label=com.docker.swarm.service.name=itapoa_itapoa-app' --format '{{.ID}}');do
  [[ "$previous" =~ ^[a-f0-9]+$ ]]
  test "$previous" != "$app" || continue
  mkdir "$backup/legacy-containers/$previous"
  docker cp "$previous:/app/uploads/." "$backup/legacy-containers/$previous/" 2>>"$backup/legacy-copy-notes.txt" || true
done
for legacy in /opt/itapoa/app/uploads /opt/itapoa/uploads;do
  if [ -d "$legacy" ];then cp -a "$legacy" "$backup/legacy-host/$(echo "$legacy"|tr / _)";fi
done

docker run -d --name "$restore" --label "itapoa.backup-restore=$run_id" --network none --mount type=tmpfs,destination=/var/lib/mysql --env MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1 --env MARIADB_DATABASE=itapoa_db "$db_image" >/dev/null
ready=0
for attempt in $(seq 1 60);do
  if docker exec "$restore" mariadb --user=root itapoa_db --execute 'SELECT 1' >/dev/null 2>&1;then ready=1;break;fi
  sleep 2
done
test "$ready" = 1
docker exec -i "$restore" mariadb --user=root itapoa_db < "$backup/database.sql"
docker exec "$restore" mariadb-check --user=root --check itapoa_db > "$backup/restore-check.txt"
docker run --rm -i --network "container:$restore" --env DB_HOST=127.0.0.1 --env DB_PORT=3306 --env DB_NAME=itapoa_db --env DB_USER=root --env DB_PASSWORD= "$app_image" node - manifest < "$source_dir/scripts/payment-db-maintenance.cjs" > "$backup/db-restored.json"
cmp -s "$backup/db-before.json" "$backup/db-restored.json"
test "$(docker inspect "$restore" --format '{{.HostConfig.NetworkMode}}')" = none
test "$(docker inspect "$restore" --format '{{json .HostConfig.PortBindings}}')" = '{}'
printf 'Database restore, database fingerprints and upload manifests verified.\n' > "$backup/VERIFIED.txt"
(cd "$backup" && tar -czf bundle.tar.gz database.sql app-service.json db-service.json db-before.json db-restored.json restore-check.txt uploads-before.json uploads-copied.json uploads legacy-containers legacy-host VERIFIED.txt)
gzip -t "$backup/bundle.tar.gz"
(cd "$backup" && sha256sum bundle.tar.gz > BUNDLE_SHA256SUMS && sha256sum -c BUNDLE_SHA256SUMS)
chmod -R go-rwx "$backup"
echo "VERIFIED_BACKUP_DIRECTORY=$backup"
echo "VERIFIED_BACKUP_SHA256=$(sha256sum "$backup/bundle.tar.gz"|cut -d' ' -f1)"
echo "VERIFIED_BACKUP_BYTES=$(stat -c %s "$backup/bundle.tar.gz")"
echo "CURRENT_UPLOAD_FILES=$(find "$backup/uploads/current" -type f|wc -l)"
echo "RECOVERABLE_LEGACY_UPLOAD_FILES=$(find "$backup/legacy-containers" "$backup/legacy-host" -type f|wc -l)"
