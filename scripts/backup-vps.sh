#!/usr/bin/env bash
# backup-vps.sh — Backup completo da VPS Itapoá Online (somente leitura)
# Uso (na VPS 2.24.209.225 como root):
#   DB_HOST=srv887.hstgr.io DB_PORT=3306 DB_NAME=u619805679_itapoa \
#   DB_USER=u619805679_itapoa DB_PASSWORD='***' bash scripts/backup-vps.sh
# Ou deixe o script ler /opt/itapoa/app/.env automaticamente.
#
# O que faz:
#  - Inventário (SO, recursos, portas, PM2, Caddy, cron, git status/diff)
#  - Dump MySQL consistente (--single-transaction --routines --triggers)
#  - Tarballs de /opt/itapoa/app (sem .git/node_modules) e de uploads
#  - Cópia de Caddyfile, .env, crontab, timers, patches git
#  - sha256sum e instruções para salvar FORA da VPS
#
# O que NÃO faz: DROP/TRUNCATE, DELETE, reinstalação, alteração do banco origem.

set -euo pipefail

APP_DIR="/opt/itapoa/app"
OUT_DIR="/tmp"
STAMP="$(date +%F)"
DUMP_FILE="${OUT_DIR}/itapoa_dump_${STAMP}.sql"
APP_TAR="${OUT_DIR}/itapoa_app_${STAMP}.tar.gz"
UPLOADS_TAR="${OUT_DIR}/itapoa_uploads_${STAMP}.tar.gz"
CHECKSUM_FILE="${OUT_DIR}/checksums.txt"

# Cores só se TTY
if [ -t 1 ]; then GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'; else GREEN=''; YELLOW=''; RED=''; NC=''; fi
info()  { echo -e "${GREEN}[backup]${NC} $*"; }
warn()  { echo -e "${YELLOW}[warn]${NC} $*"; }
fail()  { echo -e "${RED}[erro]${NC} $*" >&2; exit 1; }

# --- 0. Ler DB_* do .env se não vieram por env ---
if [ -f "${APP_DIR}/.env" ]; then
  # shellcheck disable=SC1090
  set -a; . "${APP_DIR}/.env" 2>/dev/null || true; set +a
fi
DB_HOST="${DB_HOST:-srv887.hstgr.io}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-u619805679_itapoa}"
DB_USER="${DB_USER:-u619805679_itapoa}"
# DB_PASSWORD deve vir de env ou .env; nunca logar valor
if [ -z "${DB_PASSWORD:-}" ]; then
  echo -n "DB_PASSWORD para ${DB_USER}@${DB_HOST}/${DB_NAME}: "
  read -r -s DB_PASSWORD; echo
fi
[ -n "${DB_PASSWORD}" ] || fail "DB_PASSWORD vazia — defina no env ou .env"

echo "============================================================"
echo " Backup Itapoá Online — ${STAMP}"
echo " App: ${APP_DIR}  DB: ${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo " Saída: ${OUT_DIR}/itapoa_*"
echo "============================================================"

# --- 1. Inventário (somente leitura) ---
info "1/5 Inventário do sistema"
{
  echo "## SO / Recursos / Portas"
  cat /etc/os-release 2>/dev/null || true
  lsb_release -a 2>/dev/null || true
  echo "---"; free -h 2>/dev/null || true
  echo "---"; df -h 2>/dev/null || true
  echo "---"; ss -tulpn 2>/dev/null | head -n 50 || netstat -tulpn 2>/dev/null | head -n 50 || true
  echo ""
  echo "## PM2 / Caddy / App"
  pm2 list 2>/dev/null || echo "pm2 list falhou"
  echo "--- Caddyfile ---"
  cat /etc/caddy/Caddyfile 2>/dev/null | head -n 120 || echo "sem /etc/caddy/Caddyfile"
  echo "--- .env (mascarado) ---"
  if [ -f "${APP_DIR}/.env" ]; then sed 's/=.*/=***/' "${APP_DIR}/.env" | head -n 40; fi
  echo "--- ls /opt/itapoa/app ---"
  ls -la "${APP_DIR}/" 2>/dev/null | head -n 80 || true
  echo ""
  echo "## Cron / Timers"
  crontab -l 2>/dev/null || echo "sem crontab"
  echo "---"; systemctl list-timers 2>/dev/null | head -n 30 || true
  echo ""
  echo "## Git (alterações locais preservadas)"
  git -C "${APP_DIR}" status 2>/dev/null || echo "sem git em ${APP_DIR}"
  echo "---"; git -C "${APP_DIR}" log --oneline -5 2>/dev/null || true
  echo "---"; git -C "${APP_DIR}" diff --stat 2>/dev/null || true
  echo "---"; git -C "${APP_DIR}" diff --cached --stat 2>/dev/null || true
  echo ""
  echo "## DB origem identificada"
  echo "DB_HOST=${DB_HOST}  DB_PORT=${DB_PORT}  DB_NAME=${DB_NAME}  DB_USER=${DB_USER}"
  mysql --version 2>/dev/null || echo "mysql client não encontrado (use mysqldump do pacote mysql-client)"
  echo "--- SELECT VERSION() (se acessível) ---"
  mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT VERSION() AS version, DATABASE() AS db" 2>&1 | head -n 10 || echo "SELECT VERSION() falhou (verifique rede/firewall)"
} | tee "${OUT_DIR}/itapoa_inventario_${STAMP}.txt"
info "Inventário salvo em ${OUT_DIR}/itapoa_inventario_${STAMP}.txt"

# --- 2. Dump MySQL consistente ---
info "2/5 Dump MySQL (--single-transaction --routines --triggers)"
if ! command -v mysqldump >/dev/null 2>&1; then
  fail "mysqldump não encontrado — instale mysql-client/mariadb-client"
fi
# --single-transaction exige InnoDB (nosso schema é todo InnoDB)
# --routines/--triggers preservam procedures se houver
mysqldump --single-transaction --routines --triggers \
  -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" \
  "${DB_NAME}" > "${DUMP_FILE}"
info "Dump OK: ${DUMP_FILE} ($(du -h "${DUMP_FILE}" | cut -f1)) — $(grep -c "CREATE TABLE" "${DUMP_FILE}" 2>/dev/null || echo "?") CREATE TABLE"
# Sanidade: não deve estar vazio nem conter erro HTML
if [ ! -s "${DUMP_FILE}" ]; then fail "Dump vazio — verifique credenciais/rede"; fi
if head -n 5 "${DUMP_FILE}" | grep -qi "<html"; then fail "Dump parece HTML (erro de conexão)"; fi

# --- 3. Arquivos do site e uploads ---
info "3/5 Tarballs de app e uploads"
tar -czf "${APP_TAR}" -C /opt itapoa/app --exclude=.git --exclude=node_modules --exclude=dist 2>/dev/null || \
  tar -czf "${APP_TAR}" -C /opt itapoa/app --exclude=.git --exclude=node_modules 2>/dev/null
info "App tar: ${APP_TAR} ($(du -h "${APP_TAR}" | cut -f1))"

# Uploads: tenta ./uploads, depois public/uploads, depois dist (fallback)
UPLOADS_SRC=""
for cand in "${APP_DIR}/uploads" "${APP_DIR}/public/uploads" "${APP_DIR}/dist"; do
  if [ -d "${cand}" ] && [ -n "$(ls -A "${cand}" 2>/dev/null)" ]; then UPLOADS_SRC="${cand}"; break; fi
done
if [ -n "${UPLOADS_SRC}" ]; then
  tar -czf "${UPLOADS_TAR}" -C "$(dirname "${UPLOADS_SRC}")" "$(basename "${UPLOADS_SRC}")" 2>/dev/null || true
  if [ -f "${UPLOADS_TAR}" ]; then info "Uploads tar: ${UPLOADS_TAR} ($(du -h "${UPLOADS_TAR}" | cut -f1)) de ${UPLOADS_SRC}"; fi
else
  warn "Nenhuma pasta de uploads com conteúdo encontrada — criando tar vazio informativo"
  echo "sem uploads versionados em ${STAMP}" | tar -czf "${UPLOADS_TAR}" -T - 2>/dev/null || true
fi

# --- 4. Configurações e alterações locais ---
info "4/5 Configurações e patches git"
cp /etc/caddy/Caddyfile "${OUT_DIR}/Caddyfile.bak" 2>/dev/null || warn "sem /etc/caddy/Caddyfile para copiar"
cp "${APP_DIR}/.env" "${OUT_DIR}/env.bak" 2>/dev/null || warn "sem ${APP_DIR}/.env"
chmod 600 "${OUT_DIR}/env.bak" 2>/dev/null || true
crontab -l > "${OUT_DIR}/crontab.bak" 2>/dev/null || echo "# sem crontab" > "${OUT_DIR}/crontab.bak"
systemctl list-timers > "${OUT_DIR}/timers.bak" 2>/dev/null || true
if git -C "${APP_DIR}" rev-parse --git-dir >/dev/null 2>&1; then
  git -C "${APP_DIR}" diff > "${OUT_DIR}/git_diff.patch" 2>/dev/null || true
  git -C "${APP_DIR}" diff --cached > "${OUT_DIR}/git_diff_cached.patch" 2>/dev/null || true
  git -C "${APP_DIR}" status --porcelain > "${OUT_DIR}/git_status.txt" 2>/dev/null || true
  info "Patches git salvos em ${OUT_DIR}/git_*.patch"
fi
cp -r "${APP_DIR}/.github" "${OUT_DIR}/github_workflows_${STAMP}" 2>/dev/null || true

# --- 5. Checksums e validação ---
info "5/5 Checksums e instruções para cópia externa"
sha256sum "${OUT_DIR}/itapoa_dump_${STAMP}.sql" "${OUT_DIR}/itapoa_app_${STAMP}.tar.gz" 2>/dev/null > "${CHECKSUM_FILE}" || true
if [ -f "${UPLOADS_TAR}" ]; then sha256sum "${UPLOADS_TAR}" >> "${CHECKSUM_FILE}" 2>/dev/null || true; fi
for f in "${OUT_DIR}/Caddyfile.bak" "${OUT_DIR}/env.bak" "${OUT_DIR}/crontab.bak" "${OUT_DIR}/git_diff.patch" "${OUT_DIR}/itapoa_inventario_${STAMP}.txt"; do
  [ -f "$f" ] && sha256sum "$f" >> "${CHECKSUM_FILE}" 2>/dev/null || true
done

echo ""
echo "============================================================"
ls -lh "${OUT_DIR}/itapoa_"* "${OUT_DIR}/checksums.txt" "${OUT_DIR}/Caddyfile.bak" "${OUT_DIR}/env.bak" 2>/dev/null || true
echo "---"
cat "${CHECKSUM_FILE}" 2>/dev/null || true
echo "============================================================"
echo ""
info "Validação local: sha256sum -c ${CHECKSUM_FILE}"
sha256sum -c "${CHECKSUM_FILE}" 2>&1 | head -n 20 || true
echo ""
info "Teste rápido do dump (contagem de tabelas): $(grep -c "CREATE TABLE" "${DUMP_FILE}" 2>/dev/null || echo "?") CREATE TABLE esperadas: 37"
echo ""
echo "PRÓXIMO PASSO — salvar FORA da VPS (da sua máquina local):"
echo "  scp root@2.24.209.225:${DUMP_FILE} ./"
echo "  scp root@2.24.209.225:${APP_TAR} ./"
if [ -f "${UPLOADS_TAR}" ]; then echo "  scp root@2.24.209.225:${UPLOADS_TAR} ./"; fi
echo "  scp root@2.24.209.225:${CHECKSUM_FILE} ./"
echo "  scp root@2.24.209.225:${OUT_DIR}/itapoa_inventario_${STAMP}.txt ./"
echo "  scp root@2.24.209.225:${OUT_DIR}/Caddyfile.bak ./  # se existir"
echo "  # Nunca commitar env.bak — guarde em cofre seguro"
echo ""
echo "Depois, na sua máquina:"
echo "  sha256sum -c checksums.txt"
echo "  tar -tzf itapoa_app_${STAMP}.tar.gz | head"
if [ -f "${UPLOADS_TAR}" ]; then echo "  tar -tzf itapoa_uploads_${STAMP}.tar.gz | head"; fi
echo "  mysql -e 'CREATE DATABASE test_restore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci' && mysql test_restore < itapoa_dump_${STAMP}.sql && mysql -e 'SHOW TABLES FROM test_restore' | wc -l  # esperado: 37"
echo ""
warn "NÃO prossiga para reinstalação/Easypanel até apresentar tamanhos, sha256sum -c OK e SHOW TABLES=37 e obter autorização."
echo "Banco origem ${DB_HOST}/${DB_NAME} permanece intacto — este script nunca executa DROP/TRUNCATE/DELETE."
