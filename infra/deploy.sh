#!/usr/bin/env bash
# Despliegue repetible por SSH: git pull + build + docker compose up, por servidor.
#   infra/deploy.sh <edge|app|ia|datos|monitor|all> [rama]
# Requiere las llaves de ~/.ssh/hostinger_* cargadas en el agente (ssh-add).
set -euo pipefail

ROL="${1:?uso: deploy.sh <edge|app|ia|datos|monitor|all> [rama]}"
RAMA="${2:-main}"

if [ "$ROL" = "all" ]; then
  # Orden de dependencias: datos → ia → app → edge.
  for r in datos ia app edge monitor; do "$0" "$r" "$RAMA"; done
  exit 0
fi

case "$ROL" in
  edge)          HOST=179.66.141.161; LLAVE=hostinger_kv1_edge ;;
  app|monitor)   HOST=2.25.120.29;    LLAVE=hostinger_kv2_backend ;;
  ia)            HOST=2.25.79.103;    LLAVE=hostinger_kv4_inference ;;
  datos)         HOST=2.25.177.55;    LLAVE=hostinger_kv4_database ;;
  *) echo "rol desconocido: $ROL" >&2; exit 1 ;;
esac

# Solo app tiene migraciones; van antes de levantar el código nuevo.
PRE=":"
[ "$ROL" = "app" ] && PRE='$C build && $C run --rm migrate'

echo "==> $ROL ($HOST), rama $RAMA"
ssh -i "$HOME/.ssh/$LLAVE" -o IdentitiesOnly=yes "deploy@$HOST" "
  set -euo pipefail
  cd ~/zarza-workspace
  git fetch -q origin
  git checkout -q '$RAMA'
  git pull -q --ff-only
  echo \"commit: \$(git log --oneline -1)\"
  C='docker compose -f infra/$ROL/docker-compose.yml'
  $PRE
  # --wait: falla si algún contenedor no llega a healthy.
  \$C up -d --build --wait
  \$C ps --format 'table {{.Service}}\t{{.Status}}'
  docker image prune -f >/dev/null
"
