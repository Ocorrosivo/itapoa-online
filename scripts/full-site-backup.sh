#!/usr/bin/env bash
set -euo pipefail
umask 077
run="${BACKUP_RUN_ID:?}"
[[ "$run" =~ ^[0-9]+$ ]]
app=$(docker ps --filter label=com.docker.swarm.service.name=itapoa_itapoa-app --format '{{.ID}}')
db=$(docker ps --filter label=com.docker.swarm.service.name=itapoa_itapoa-db --format '{{.ID}}')
[[ "$app" =~ ^[a-f0-9]+$ && "$db" =~ ^[a-f0-9]+$ ]]
backup="/var/backups/itapoa/full-$(date -u +%Y%m%dT%H%M%SZ)-$run"
mkdir -p "$backup/volumes" "$backup/config"
chmod 700 "$backup"
available=$(df -Pk /var/backups/itapoa | awk 'NR==2 {print $4}')
test "$available" -gt 8388608 || { echo 'Insufficient free disk; no backup attempted'; exit 1; }
docker service inspect itapoa_itapoa-app > "$backup/config/app-service.json"
docker service inspect itapoa_itapoa-db > "$backup/config/db-service.json"
docker inspect "$app" "$db" > "$backup/config/containers.json"
app_image=$(docker inspect "$app" --format '{{.Image}}')
db_image=$(docker inspect "$db" --format '{{.Image}}')
db_name=$(docker exec "$app" node -e 'process.stdout.write(process.env.DB_NAME||"")')
[[ "$db_name" =~ ^[a-zA-Z0-9_]+$ ]]
docker exec -e BACKUP_DB_NAME="$db_name" "$db" sh -eu -c 'export MYSQL_PWD="${MARIADB_ROOT_PASSWORD:-${MYSQL_ROOT_PASSWORD:-}}"; test -n "$MYSQL_PWD"; exec mariadb-dump --user=root --single-transaction --quick --routines --events --triggers --hex-blob "$BACKUP_DB_NAME"' > "$backup/database.sql"
test -s "$backup/database.sql"
grep -q 'CREATE TABLE.*companies' "$backup/database.sql"
echo DATABASE_DUMP_COMPLETE
# Preserve actual runtime filesystem, including build and dependencies (volumes saved separately).
docker export "$app" | gzip > "$backup/application-filesystem.tar.gz"
docker image save "$app_image" "$db_image" | gzip > "$backup/docker-images.tar.gz"
echo APPLICATION_AND_IMAGES_SAVED
docker inspect "$app" --format '{{range .Mounts}}{{println .Source}}{{end}}' > "$backup/config/app-mount-sources.txt"
i=0
while IFS= read -r mount; do
  test -n "$mount" || continue
  case "$mount" in /var/lib/docker/volumes/*/_data|/etc/easypanel/projects/itapoa/*|/opt/itapoa/*) ;; *) echo 'Unreviewed app mount; aborting without marking complete'; exit 1;; esac
  test -d "$mount"
  i=$((i+1))
  tar -czf "$backup/volumes/mount-$i.tar.gz" -C "$mount" .
done < "$backup/config/app-mount-sources.txt"
test "$i" -gt 0
if test -d /etc/easypanel/projects/itapoa; then
  tar --exclude=node_modules --exclude=.git -czf "$backup/easypanel-project.tar.gz" -C /etc/easypanel/projects itapoa
fi
# Preserve all published code/history separately; never expose private runtime data to GitHub.
git clone --quiet --mirror https://github.com/Ocorrosivo/itapoa-online.git "$backup/repository.git"
git -C "$backup/repository.git" bundle create "$backup/repository.bundle" --all
# Validate SQL restoration only in an isolated disposable container, never production.
restore="itapoa-full-backup-check-$run"
cleanup(){ if docker container inspect "$restore" >/dev/null 2>&1; then test "$(docker inspect "$restore" --format '{{index .Config.Labels "itapoa.backup-check"}}')" = "$run" && docker rm -f "$restore" >/dev/null; fi; }
trap cleanup EXIT
docker run -d --name "$restore" --label "itapoa.backup-check=$run" --network none --tmpfs /var/lib/mysql --env MARIADB_ALLOW_EMPTY_ROOT_PASSWORD=1 --env MARIADB_DATABASE="$db_name" "$db_image" >/dev/null
ready=0
for attempt in $(seq 1 60); do if docker exec "$restore" mariadb --user=root "$db_name" --execute 'SELECT 1' >/dev/null 2>&1; then ready=1; break; fi; sleep 2; done
test "$ready" = 1
docker exec -i "$restore" mariadb --user=root "$db_name" < "$backup/database.sql"
docker exec "$restore" mariadb-check --user=root --check "$db_name" > "$backup/restore-check.txt"
echo ISOLATED_DATABASE_RESTORE_OK
for file in "$backup"/*.tar.gz "$backup"/volumes/*.tar.gz; do gzip -t "$file"; done
printf 'Database restored and checked in isolated container. Runtime filesystem, app/db images, app mounts, project configuration and Git history captured. No production restart/migration. Not a full VPS disk snapshot. DNS/provider account and external payment/email services are not copied.\n' > "$backup/README.txt"
(cd "$backup" && find . -type f ! -path './repository.git/*' ! -name SHA256SUMS -print0 | sort -z | xargs -0 sha256sum > SHA256SUMS && sha256sum -c SHA256SUMS >/dev/null)
tar -czf "$backup.tar.gz" --exclude=repository.git -C "$(dirname "$backup")" "$(basename "$backup")"
gzip -t "$backup.tar.gz"
chmod 600 "$backup.tar.gz"
read -r key_type key_data ignored <<< "$BACKUP_PUBLIC_KEY"
test "$key_type" = ssh-ed25519
[[ "$key_data" =~ ^[A-Za-z0-9+/=]+$ ]]
test -d /root/.ssh
expires=$(date -u -d '+2 hours' +%Y%m%d%H%M%SZ)
printf '\nrestrict,expiry-time="%s",command="/bin/cat -- %s.tar.gz" %s %s itapoa-full-backup-%s\n' "$expires" "$backup" "$key_type" "$key_data" "$run" >> /root/.ssh/authorized_keys
echo "BACKUP_PATH=$backup.tar.gz"
echo "BACKUP_SHA256=$(sha256sum "$backup.tar.gz" | cut -d' ' -f1)"
echo "BACKUP_BYTES=$(stat -c %s "$backup.tar.gz")"
echo "BACKUP_MOUNTS=$i"
echo BACKUP_COMPLETE
