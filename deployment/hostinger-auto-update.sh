#!/usr/bin/env bash
# hostinger-auto-update.sh - Deixe no Hostinger como startup wrapper ou cron pós-push
# Uso: adicionar como "Post-deploy Command" no hPanel Node.js ou crontab
# Bypassa API developers (TUS 404) - faz tudo via git + npm localmente no VPS
set -euo pipefail
APP_DIR="${HOSTINGER_APP_DIR:-$HOME/domains/ajborrachariamovel.com.br}"
cd "$APP_DIR"
echo "[auto-update] git pull origin main em $APP_DIR"
git pull origin main --ff-only || { echo "git pull falhou - verifique remote"; exit 1; }
echo "[auto-update] npm ci && npm run build"
npm ci
npm run build
echo "[auto-update] restart Node.js"
# Try common restart signals for Hostinger
touch tmp/restart.txt 2>/dev/null || true
# If pm2 is available
if command -v pm2 >/dev/null 2>&1; then pm2 restart all 2>/dev/null || true; fi
echo "[auto-update] Validacao: curl -s http://127.0.0.1:${PORT:-3000}/api/health || curl -s https://ajborrachariamovel.com.br/api/health"
curl -s "http://127.0.0.1:${PORT:-3000}/api/health" 2>/dev/null || curl -s "https://ajborrachariamovel.com.br/api/health"
echo "[auto-update] done"
