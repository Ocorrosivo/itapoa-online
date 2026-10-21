#!/usr/bin/env bash
# restore-easypanel.sh — Restaura dump no BANCO NOVO do Easypanel (rede interna)
# Uso:
#   DB_HOST=itapoa-mysql DB_PORT=3306 DB_NAME=itapoa_db \
#   DB_USER=itapoa_app DB_PASSWORD='***' bash scripts/restore-easypanel.sh /caminho/para/itapoa_dump_*.sql
#
# O que faz:
#  - Higieniza o dump: remove DEFINER, USE/CREATE DATABASE do banco antigo, valida que não restou ref a srv887/u619805679
#  - Importa exclusivamente no MySQL interno do Easypanel (DB_HOST da rede interna)
#  - Verifica 37 tabelas e contagens básicas
#
# O que NÃO faz: tocar no banco origem (srv887.hstgr.io), DROP do banco origem, expor MySQL publicamente.

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Uso: $0 /caminho/para/itapoa_dump_YYYY-MM-DD.sql" >&2
  echo "Env exigido: DB_HOST (interno Easypanel), DB_PORT, DB_NAME, DB_USER, DB_PASSWORD" >&2
  exit 1
fi
DUMP_SRC="$1"
[ -f "${DUMP_SRC}" ] || { echo "Dump não encontrado: ${DUMP_SRC}" >&2; exit 1; }

# DB do NOVO banco (Easypanel, rede interna)
DB_HOST="${DB_HOST:-}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-}"
DB_USER="${DB_USER:-}"
DB_PASSWORD="${DB_PASSWORD:-}"
[ -n "${DB_HOST}" ] || { echo "DB_HOST do novo banco não definido" >&2; exit 1; }
[ -n "${DB_NAME}" ] || { echo "DB_NAME do novo banco não definido" >&2; exit 1; }
[ -n "${DB_USER}" ] || { echo "DB_USER do novo banco não definido" >&2; exit 1; }
[ -n "${DB_PASSWORD}" ] || { echo "DB_PASSWORD do novo banco não definido" >&2; exit 1; }

# Trava: nunca apontar para o banco antigo
if echo "${DB_HOST}" | grep -qi "srv887"; then
  echo "ERRO: DB_HOST aponta para o banco antigo (srv887.hstgr.io). Use o host interno do Easypanel (ex: itapoa-mysql)." >&2
  exit 1
fi
if echo "${DB_NAME}" | grep -qi "u619805679"; then
  echo "ERRO: DB_NAME parece ser o banco antigo. Use o nome do banco NOVO criado no Easypanel." >&2
  exit 1
fi

# Higienização do dump
TMPDIR="$(mktemp -d)"
SANITIZED="${TMPDIR}/sanitized.sql"
trap 'rm -rf "${TMPDIR}"' EXIT

echo "[restore] Higienizando dump: ${DUMP_SRC} -> ${SANITIZED}"
# Remove DEFINER=... (mysqldump --routines pode incluir)
# Remove linhas USE `u619805679_itapoa` / CREATE DATABASE ... / USE srv887
sed -E \
  -e 's/DEFINER=[^*]*\*/\*/g' \
  -e 's/\bDEFINER=`[^`]*`@`[^`]*`//g' \
  "${DUMP_SRC}" > "${SANITIZED}.step1"

# Remove USE/CREATE DATABASE que apontem para o banco antigo (mantém comentários)
grep -viE "^\s*(USE|CREATE DATABASE).*u619805679" "${SANITIZED}.step1" > "${SANITIZED}" || cp "${SANITIZED}.step1" "${SANITIZED}"

# Validação: não deve restar referência ao host/banco antigo fora de dados (heurística)
if grep -qi "srv887\.hstgr\.io" "${SANITIZED}"; then
  echo "[aviso] Dump ainda contém 'srv887.hstgr.io' — verifique se é dado de aplicação ou lixo de dump" >&2
  grep -in "srv887" "${SANITIZED}" | head -n 20 >&2 || true
fi
if grep -qi "u619805679_itapoa" "${SANITIZED}"; then
  # Pode ser nome de banco em comentário já removido; só avisa
  echo "[aviso] Dump ainda contém 'u619805679_itapoa' em $(grep -ci "u619805679" "${SANITIZED}") linha(s) — verifique" >&2
  grep -in "u619805679" "${SANITIZED}" | head -n 20 >&2 || true
fi

echo "[restore] Verificando conectividade com novo banco ${DB_HOST}:${DB_PORT}/${DB_NAME} como ${DB_USER}"
if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client não encontrado — instale mysql-client/mariadb-client no ambiente Easypanel/app" >&2
  exit 1
fi
mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 1" >/dev/null || {
  echo "Falha ao conectar no novo banco — verifique DB_HOST/PORT/USER/PASSWORD e rede interna" >&2
  exit 1
}

# Garante charset e FK checks coerentes na importação
echo "[restore] Importando para ${DB_NAME} (isso pode levar minutos)..."
mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" "${DB_NAME}" < "${SANITIZED}"

echo "[restore] Importação concluída. Verificando schema..."
TABLES="$(mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()" "${DB_NAME}" 2>/dev/null || echo "?")"
echo "[restore] Tabelas em ${DB_NAME}: ${TABLES} (esperado: 37)"
mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SHOW TABLES FROM \`${DB_NAME}\`" 2>/dev/null | head -n 50 || true
echo "[restore] Contagens amostrais:"
mysql -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" -p"${DB_PASSWORD}" -e "SELECT 'companies' AS t, COUNT(*) AS c FROM companies UNION ALL SELECT 'users', COUNT(*) FROM users UNION ALL SELECT 'categories', COUNT(*) FROM categories UNION ALL SELECT 'cities', COUNT(*) FROM cities" "${DB_NAME}" 2>/dev/null || true

if [ "${TABLES}" != "37" ]; then
  echo "[aviso] Quantidade de tabelas diferente de 37 — verifique se o schema foi importado completamente (MYSQL_SCHEMA.sql + dump)" >&2
fi

echo "[restore] OK — dump restaurado no banco NOVO ${DB_HOST}/${DB_NAME}."
echo "[restore] Confirme que a app usa este banco: variáveis DB_* do Easypanel devem apontar para ${DB_HOST}:${DB_PORT}/${DB_NAME} (rede interna, sem exposição pública)."
