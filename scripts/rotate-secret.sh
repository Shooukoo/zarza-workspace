#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

for cmd in docker jq openssl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: falta '$cmd' (requerido por este script)." >&2
    exit 1
  fi
done

VALID_VARS=("INTERNAL_NOTIFY_TOKEN" "INFERENCE_AUTH_TOKEN" "TRAINING_INTERNAL_TOKEN")

# Solo INTERNAL_NOTIFY_TOKEN tiene hoy un mensaje de log confirmado para
# detectar rechazos por token inválido (fruit-backend/src/notifications/
# internal-notify.controller.ts: this.logger.warn('Token interno inválido', ...)).
# Los otros dos no loguean el rechazo hoy, así que no se les inventa un patrón.
declare -A LOG_PATTERNS=(
  [INTERNAL_NOTIFY_TOKEN]="Token interno inv.lido"
)

VAR_NAME="${1:-}"
if [ -z "$VAR_NAME" ]; then
  echo "Uso: $0 <NOMBRE_VAR> <servicio1> [servicio2 ...]" >&2
  echo "  NOMBRE_VAR debe ser una de: ${VALID_VARS[*]}" >&2
  exit 1
fi
shift
SERVICES=("$@")
if [ "${#SERVICES[@]}" -eq 0 ]; then
  echo "Error: falta especificar al menos un servicio." >&2
  exit 1
fi

is_valid=false
for v in "${VALID_VARS[@]}"; do
  if [ "$v" = "$VAR_NAME" ]; then
    is_valid=true
    break
  fi
done
if [ "$is_valid" != true ]; then
  echo "Error: '$VAR_NAME' no es un secreto rotable por este script." >&2
  echo "  Variables soportadas: ${VALID_VARS[*]}" >&2
  exit 1
fi

NEW_VALUE="$(openssl rand -hex 32)"
TIMESTAMP="$(date +%Y%m%d%H%M%S)"

# Paso 1: validar que la línea exista en TODOS los .env antes de tocar ninguno.
for service in "${SERVICES[@]}"; do
  ENV_FILE="$service/.env"
  if [ ! -f "$ENV_FILE" ]; then
    echo "Error: no existe $ENV_FILE" >&2
    exit 1
  fi
  if ! grep -q "^${VAR_NAME}=" "$ENV_FILE"; then
    echo "Error: $ENV_FILE no tiene una línea '${VAR_NAME}='. Abortando sin tocar nada." >&2
    exit 1
  fi
done

# Paso 2: backup + reemplazo.
BACKUPS=()
for service in "${SERVICES[@]}"; do
  ENV_FILE="$service/.env"
  BACKUP_FILE="${ENV_FILE}.bak-${TIMESTAMP}"
  cp "$ENV_FILE" "$BACKUP_FILE"
  BACKUPS+=("$BACKUP_FILE")
  sed -i "s|^${VAR_NAME}=.*|${VAR_NAME}=${NEW_VALUE}|" "$ENV_FILE"
  echo "✓ ${VAR_NAME} actualizado en $ENV_FILE (backup: $BACKUP_FILE)"
done

# Paso 3: redeploy.
echo "Redesplegando: ${SERVICES[*]}"
docker compose up -d --build "${SERVICES[@]}"

# Paso 4: esperar healthcheck.
wait_for_healthy() {
  local service="$1"
  local timeout=60
  local elapsed=0
  while [ "$elapsed" -lt "$timeout" ]; do
    local health
    health="$(docker compose ps "$service" --format json 2>/dev/null | jq -r '.Health // "none"' 2>/dev/null || echo "none")"
    if [ "$health" = "healthy" ]; then
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  return 1
}

for service in "${SERVICES[@]}"; do
  echo "Esperando healthcheck de $service..."
  if ! wait_for_healthy "$service"; then
    echo "✗ $service no reportó 'healthy' en 60s. Backups sin borrar: ${BACKUPS[*]}" >&2
    exit 1
  fi
  echo "✓ $service healthy"
done

# Paso 5: chequeo best-effort de logs (solo si hay patrón conocido para esta variable).
if [ -n "${LOG_PATTERNS[$VAR_NAME]:-}" ]; then
  PATTERN="${LOG_PATTERNS[$VAR_NAME]}"
  for service in "${SERVICES[@]}"; do
    if docker compose logs --since=20s "$service" 2>/dev/null | grep -qE "$PATTERN"; then
      echo "✗ Se encontraron rechazos de token en los logs de $service ('$PATTERN'). Backups sin borrar: ${BACKUPS[*]}" >&2
      exit 1
    fi
  done
  echo "✓ Sin rechazos de token en los últimos 20s de logs de: ${SERVICES[*]}"
fi

echo ""
echo "Rotación de ${VAR_NAME} completada. Backups disponibles (borrar tras confirmar uso normal):"
printf '  %s\n' "${BACKUPS[@]}"
