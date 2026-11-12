# Runbook de producción — Rubus AI

IP, puertos y rutas: ver `INVENTARIO.md`. Todo se opera como `deploy`.
Antes de empezar, cargar las llaves: `ssh-add ~/.ssh/hostinger_kv1_edge ~/.ssh/hostinger_kv2_backend ~/.ssh/hostinger_kv4_inference ~/.ssh/hostinger_kv4_database`.

| Servidor | Entrar | Compose (desde `~/zarza-workspace`) |
|---|---|---|
| rubus-edge | `ssh -i ~/.ssh/hostinger_kv1_edge deploy@179.66.141.161` | `infra/edge/docker-compose.yml` |
| rubus-app | `ssh -i ~/.ssh/hostinger_kv2_backend deploy@2.25.120.29` | `infra/app/docker-compose.yml`, `infra/monitor/docker-compose.yml` |
| rubus-ia | `ssh -i ~/.ssh/hostinger_kv4_inference deploy@2.25.79.103` | `infra/ia/docker-compose.yml` |
| rubus-datos | `ssh -i ~/.ssh/hostinger_kv4_database deploy@2.25.177.55` | `infra/datos/docker-compose.yml` |

En los comandos de abajo, `$C` es `docker compose -f infra/<rol>/docker-compose.yml`, ejecutado en el servidor desde `~/zarza-workspace`.

## Desplegar

Desde la máquina local, con los cambios ya subidos a GitHub:

```bash
infra/deploy.sh app            # un servidor: edge | app | ia | datos | monitor
infra/deploy.sh all            # todos, en orden datos → ia → app → edge → monitor
infra/deploy.sh app otra-rama  # desplegar otra rama
```

Hace `git pull`, build, `docker compose up -d --wait` y falla si algún contenedor no queda sano.
En `app` aplica antes las migraciones de Prisma. Los contenedores de `app` y `edge` se recrean en
cada despliegue (corte de unos segundos).

Si cambia un `.env`: editarlo en el servidor (`nano infra/<rol>/.env`) y `$C up -d`. Para un
servidor nuevo: `infra/vps-base.sh` (instrucciones en su cabecera), clonar el repo en
`~/zarza-workspace` y crear el `.env` desde el `.env.example` de su carpeta.

## Ver logs y estado

```bash
$C ps                                  # estado y salud
$C logs -f --tail 100                  # todos los servicios del servidor
$C logs -f --tail 100 fruit-backend    # uno solo
docker stats --no-stream               # memoria y CPU
```

Panel general: Uptime Kuma en http://100.112.223.6:3001 (hay que estar en Tailscale).
Mensajes que agotaron reintentos: cola `ingestion_queue.dlq` en http://100.109.194.99:15672.

## Reiniciar servicios

```bash
$C restart fruit-backend    # un servicio
$C restart                  # todos los del servidor
$C up -d                    # recrear tras cambiar .env o compose
sudo reboot                 # la VPS entera: los contenedores vuelven solos
```

Reiniciar `rubus-datos` corta la app unos segundos; backend y ms reconectan solos.
`docker compose down -v` borra los volúmenes (toda la base de datos): no usar `-v`.

## Backups y restauración (rubus-datos)

```bash
ls -lh ~/backups/                                   # dumps disponibles
~/zarza-workspace/infra/datos/backup.sh             # backup manual
~/zarza-workspace/infra/datos/backup.sh verify      # backup + prueba de restauración en base temporal
```

Restaurar un dump sobre la base de producción (destructivo: reemplaza los datos actuales):

```bash
# 1. En rubus-app: parar lo que escribe en la base
cd ~/zarza-workspace && docker compose -f infra/app/docker-compose.yml stop

# 2. En rubus-datos
cd ~/zarza-workspace/infra/datos
./backup.sh                                          # copia del estado actual, por si acaso
docker compose exec -T postgres pg_restore -U rubus -d rubusai --clean --if-exists --no-owner \
  < ~/backups/rubusai-AAAA-MM-DD-HHMM.dump

# 3. En rubus-app: volver a levantar
cd ~/zarza-workspace && docker compose -f infra/app/docker-compose.yml up -d --wait
```

## Certificado TLS (rubus-edge)

```bash
sudo certbot certificates          # caducidad
sudo certbot renew --dry-run       # probar la renovación
```

La renovación es automática (`certbot.timer`) y recarga nginx sola.

## Actualizar el modelo de IA (rubus-ia)

```bash
scp -i ~/.ssh/hostinger_kv4_inference best.pt deploy@2.25.79.103:rubus/models/best.pt
# en rubus-ia:
cd ~/zarza-workspace && docker compose -f infra/ia/docker-compose.yml restart
```

## Rotar un secreto

Cambiarlo en el `.env` de cada servidor que lo use (ver tabla de secretos en `INVENTARIO.md`),
`$C up -d` en cada uno y actualizar `infra/.env.local`. Tokens compartidos: `SECURITY.md`.
