#!/usr/bin/env bash
# Backup diario de PostgreSQL (cron de deploy). Rotación: 7 días.
#   backup.sh           → crea el dump y borra los de más de 7 días
#   backup.sh verify    → además restaura el dump recién creado en una base temporal y la borra
set -euo pipefail
cd "$(dirname "$0")"
set -a; . ./.env; set +a

DIR=/home/deploy/backups
mkdir -p "$DIR"
OUT="$DIR/${POSTGRES_DB}-$(date +%F-%H%M).dump"
pg() { docker compose exec -T postgres "$@"; }

# A .tmp y luego mv: un dump a medias nunca queda con nombre de backup válido.
pg pg_dump -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" > "$OUT.tmp"
mv "$OUT.tmp" "$OUT"
find "$DIR" -name '*.dump' -mtime +7 -delete
echo "$(date -Is) backup ok: $OUT ($(du -h "$OUT" | cut -f1))"

if [ "${1:-}" = "verify" ]; then
  pg dropdb -U "$POSTGRES_USER" --if-exists restore_check
  pg createdb -U "$POSTGRES_USER" restore_check
  pg pg_restore -U "$POSTGRES_USER" -d restore_check --no-owner < "$OUT"
  contar="select count(*) from information_schema.tables where table_schema='public'"
  ORIG=$(pg psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$contar")
  REST=$(pg psql -U "$POSTGRES_USER" -d restore_check -Atc "$contar")
  pg dropdb -U "$POSTGRES_USER" restore_check
  [ "$ORIG" = "$REST" ] || { echo "RESTAURACIÓN INCOMPLETA: $REST de $ORIG tablas" >&2; exit 1; }
  echo "$(date -Is) restauración verificada: $REST tablas"
fi
