#!/usr/bin/env bash
# Explicit one-off operation: private backup, isolated restore, additive DDL.
set -euo pipefail
umask 077
test "${PAYMENT_MAINTENANCE_CONFIRM:-}" = 'backup-and-migrate-itapoa'
test "$#" = 1
source_dir=$(realpath "$1")
test -f "$source_dir/scripts/payment-db-maintenance.cjs"
sql="$source_dir/database/migrations/20261022_payment_production_prerequisites.sql"
test -f "$sql"
app=$(docker ps --filter 'label=com.docker.swarm.service.name=itapoa_itapoa-app' --format '{{.ID}}')
db=$(docker ps --filter 'label=com.docker.swarm.service.name=itapoa_itapoa-db' --format '{{.ID}}')
[[ "$app" =~ ^[a-f0-9]+$ ]] && [[ "$db" =~ ^[a-f0-9]+$ ]]
image=$(docker inspect "$db" --format '{{.Image}}')
app_image=$(docker inspect "$app" --format '{{.Image}}')
stamp=$(date -u +%Y%m%dT%H%M%SZ)
backup="/var/backups/itapoa/payment-$stamp-${GITHUB_RUN_ID:?}"
test ! -e "$backup"
mkdir -p "$backup"
chmod 700 "$backup"
restore="itapoa-payment-restore-$stamp-${GITHUB_RUN_ID}"
cleanup() {
  if docker container inspect "$restore" >/dev/null 2>&1; then
    test "$(docker inspect "$restore" --format '{{index .Config.Labels "itapoa.payment-maintenance"}}')" = "$GITHUB_RUN_ID" && docker rm -f "$restore" >/dev/null
  fi
}
trap cleanup EXIT
docker exec -i "$app" node - manifest < "$source_dir/scripts/payment-db-maintenance.cjs" > "$backup/before.json"
docker service inspect itapoa_itapoa-app > "$backup/service-before.json"
chmod 600 "$backup/service-before.json"
# Root authentication stays inside the existing database container, never in logs.
docker exec "$db" sh -eu -c '
  export MYSQL_PWD="${MARIADB_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-}}"
  test -n "$MYSQL_PWD"
  exec mariadb-dump --user=root --single-transaction --quick --routines --events --triggers --hex-blob itapoa_db
' > "$backup/database.sql"
test -s "$backup/database.sql"
chmod 600 "$backup/database.sql"
(cd "$backup" && sha256sum database.sql before.json service-before.json > SHA256SUMS && sha256sum -c SHA256SUMS)
echo "BACKUP_CREATED=$backup"
du -h "$backup/database.sql"
# Disposable database: no network, no published ports, no production mounts.
docker run -d --name "$restore" --label "itapoa.payment-maintenance=$GITHUB_RUN_ID" --network none \
  --mount type=tmpfs,destination=/var/lib/mysql --env MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1 \
  --env MARIADB_DATABASE=itapoa_db "$image" >/dev/null
ready=0
for attempt in $(seq 1 60); do
  if docker exec "$restore" mariadb --user=root itapoa_db --execute 'SELECT 1' >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
test "$ready" = 1
docker exec -i "$restore" mariadb --user=root itapoa_db < "$backup/database.sql"
docker exec "$restore" mariadb-check --user=root --check itapoa_db > "$backup/restore-check.txt"
test "$(docker inspect "$restore" --format '{{.HostConfig.NetworkMode}}')" = none
test "$(docker inspect "$restore" --format '{{json .HostConfig.PortBindings}}')" = '{}'
# A client shares only the isolated network namespace. Credentials are test-only.
fixture() {
  docker run --rm -i --network "container:$restore" --env DB_HOST=127.0.0.1 --env DB_PORT=3306 \
    --env DB_NAME=itapoa_db --env DB_USER=root --env DB_PASSWORD= \
    --mount "type=bind,source=$source_dir/scripts/payment-db-maintenance.cjs,target=/app/payment-maintenance.cjs,readonly" \
    "$app_image" node payment-maintenance.cjs "$1"
}
fixture manifest > "$backup/restored.json"
cmp -s "$backup/before.json" "$backup/restored.json"
fixture migrate < "$sql" > "$backup/restore-migration.json"
fixture migrate < "$sql" > "$backup/restore-migration-repeat.json"
echo 'ISOLATED_RESTORE_AND_REPEATABLE_MIGRATION=OK'
# Do not migrate if the source changed while the backup/restore was being checked.
docker exec -i "$app" node - manifest < "$source_dir/scripts/payment-db-maintenance.cjs" > "$backup/pre-migration.json"
cmp -s "$backup/before.json" "$backup/pre-migration.json"
# Pass SQL through a protected bind mount into a short-lived client on the app network.
docker run --rm -i --network "container:$app" \
  --env-file <(docker exec "$app" node -e 'for(const k of ["DB_HOST","DB_PORT","DB_NAME","DB_USER","DB_PASSWORD"]) {const v=process.env[k]||"";if(/[\r\n]/.test(v))process.exit(1);console.log(k+"="+v)}') \
  --mount "type=bind,source=$source_dir/scripts/payment-db-maintenance.cjs,target=/app/payment-maintenance.cjs,readonly" \
  "$app_image" node payment-maintenance.cjs migrate < "$sql" > "$backup/production-migration.json"
cat "$backup/production-migration.json"
(cd "$backup" && sha256sum database.sql before.json service-before.json restored.json restore-check.txt restore-migration.json restore-migration-repeat.json production-migration.json > SHA256SUMS && sha256sum -c SHA256SUMS)
echo "PAYMENT_MIGRATION_VERIFIED backup=$backup"
