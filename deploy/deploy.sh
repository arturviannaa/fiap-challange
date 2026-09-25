#!/usr/bin/env bash
# Publica uma branch na VPS (a main, se nada for dito).
# Uso: ./deploy/deploy.sh [host-ssh] [branch]
# Na VPS o repositorio fica em /opt/fiap-challange e o site em /var/www/fiap-challange.
set -euo pipefail

HOST="${1:-pervian}"
BRANCH="${2:-main}"

ssh "$HOST" "BRANCH=$BRANCH bash -s" <<'REMOTO'
set -euo pipefail
cd /opt/fiap-challange
git fetch --quiet origin "$BRANCH"
git reset --hard --quiet "origin/$BRANCH"
echo "Publicando $(git log -1 --format='%h %s')"

docker compose -p fiap-challange -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d --build --remove-orphans
rsync -a --delete web/ /var/www/fiap-challange/

for servico in 8092 8093; do
  for tentativa in $(seq 1 20); do
    curl -fs "http://127.0.0.1:$servico/saude" > /dev/null && break
    sleep 1
  done
  curl -fs "http://127.0.0.1:$servico/saude"; echo
done
REMOTO
