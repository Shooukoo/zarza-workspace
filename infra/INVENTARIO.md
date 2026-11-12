# Inventario de producción — Rubus AI

Sin contraseñas ni tokens: los secretos viven solo en los `.env` de cada servidor
y en `infra/.env.local` (ignorado por git).

## Servidores

| Rol | Hostname | Plan Hostinger | IP pública | IP Tailscale | Llave SSH local |
|---|---|---|---|---|---|
| Edge (nginx + web) | `rubus-edge` | KVM 1 (srv2151733) | 179.66.141.161 | 100.123.82.0 | `~/.ssh/hostinger_kv1_edge` |
| App (backend + ms) | `rubus-app` | KVM 2 (srv2151717) | 2.25.120.29 | 100.112.223.6 | `~/.ssh/hostinger_kv2_backend` |
| IA (inferencia) | `rubus-ia` | KVM 4 (srv2151714) | 2.25.79.103 | 100.115.227.49 | `~/.ssh/hostinger_kv4_inference` |
| Datos (PG + RMQ + Redis) | `rubus-datos` | KVM 4 (srv2151687) | 2.25.177.55 | 100.109.194.99 | `~/.ssh/hostinger_kv4_database` |

- SO: Ubuntu 26.04. Usuario de operación: `deploy` (sudo sin contraseña, grupo `docker`).
- Dominio: `rubusai.tech` (DNS en Hostinger).
- Acceso: `ssh -i <llave> deploy@<IP pública>`.

## Firewall (UFW) — igual en las 4

Entrante denegado salvo `22/tcp` y todo lo que llegue por `tailscale0`.
Docker salta UFW para puertos publicados: los compose publican solo en la IP de Tailscale.

## rubus-datos

- Repo: `/home/deploy/zarza-workspace` (rama `chore/infra-produccion`). Compose: `infra/datos/docker-compose.yml`, `.env` en `infra/datos/.env` (600).
- Proyecto compose: `rubus-datos`. Volúmenes: `rubus-datos_postgres_data`, `rubus-datos_rabbitmq_data`, `rubus-datos_redis_data`.

| Servicio | Escucha en | Usuario / base | Límite de memoria |
|---|---|---|---|
| PostgreSQL 16 (postgis) | 100.109.194.99:5432 | `rubus` / `rubusai` | 8 GB |
| RabbitMQ 3 (AMQP) | 100.109.194.99:5672 | `rubus` (sin `guest`) | 2 GB |
| RabbitMQ (panel) | http://100.109.194.99:15672 | `rubus` | — |
| Redis 7 | 100.109.194.99:6379 | `requirepass` | 1 GB |

- Backups: `infra/datos/backup.sh` por cron de `deploy`, diario a las 09:00 UTC, en `/home/deploy/backups/` (rotación de 7 días, log en `backups/backup.log`). Están en la misma VPS que la base.

### Monitoreo (rubus-app)

- Uptime Kuma: http://100.112.223.6:3001 — solo por Tailscale. Usuario `admin`, contraseña en `infra/.env.local` (`KUMA_PASSWORD`).
- Compose: `infra/monitor/docker-compose.yml` (proyecto `rubus-monitor`, volumen `rubus-monitor_kuma_data`), `.env` en `infra/monitor/.env`. Se despliega con `infra/deploy.sh monitor`.
- 9 monitores (cada 60 s), creados por `infra/monitor/setup-monitors.py`: web y API públicas, nginx, fruit-backend, fruit-ms, fruit-inference y los puertos de PostgreSQL, RabbitMQ y Redis.
- Sin canal de notificación configurado: hay que añadirlo en la interfaz (Settings → Notifications).

## rubus-ia

- Repo: `/home/deploy/zarza-workspace` (rama `chore/infra-produccion`). Compose: `infra/ia/docker-compose.yml`, `.env` en `infra/ia/.env` (600).
- Pesos del modelo (fuera de la imagen y de git): `/home/deploy/rubus/models/best.pt` y `damage.pt`, montados en `/models` de solo lectura.

| Servicio | Escucha en | Health | Límite de memoria |
|---|---|---|---|
| fruit-inference | http://100.115.227.49:8000 | `GET /health` | 8 GB |

## rubus-app

- Repo: `/home/deploy/zarza-workspace` (rama `chore/infra-produccion`). Compose: `infra/app/docker-compose.yml`, `.env` compartido por ambos servicios en `infra/app/.env` (600).
- Migraciones Prisma: `docker compose -f infra/app/docker-compose.yml run --rm migrate`.

| Servicio | Escucha en | Health | Límite de memoria |
|---|---|---|---|
| fruit-backend (REST + WS `/ws`) | http://100.112.223.6:3000 | `GET /api/v1/health` | 2 GB |
| fruit-ms (consumidor RabbitMQ) | http://100.112.223.6:3002 (solo health) | `GET /health` | 1 GB |

- Usuario administrador inicial: `admin@rubusai.tech` (contraseña en `infra/.env.local`, variable `ADMIN_PASSWORD`).

## rubus-edge

- Repo: `/home/deploy/zarza-workspace` (rama `chore/infra-produccion`). Compose: `infra/edge/docker-compose.yml`, config de nginx en `infra/edge/nginx/https.conf`, `.env` en `infra/edge/.env` (solo `VITE_MAPBOX_TOKEN`, opcional).
- UFW: además de SSH y Tailscale, `80/tcp` y `443/tcp` abiertos.
- DNS (Hostinger): `A @ → 179.66.141.161`, `CNAME www → rubusai.tech`.

| Servicio | Escucha en | Health |
|---|---|---|
| nginx (web estática + proxy `/api/` y `/ws` → `100.112.223.6:3000`) | 0.0.0.0:80 y :443 | `GET /healthz` |

- TLS: Let's Encrypt para `rubusai.tech` y `www.rubusai.tech`, certbot en el host (webroot `/var/www/certbot`, certificados en `/etc/letsencrypt`). Renovación automática por `certbot.timer`; al renovar recarga nginx (`docker exec rubus-edge-web-1 nginx -s reload`). Cuenta de Let's Encrypt sin correo: no llegan avisos de caducidad.
- `/api/v1/internal/*` devuelve 404 desde internet (endpoints entre servicios).

## Secretos: dónde vive cada cosa

| Lugar | Contenido |
|---|---|
| `infra/.env.local` (copia en el checkout principal, ignorado por git) | Copia de todo lo generado: contraseñas de datos, tokens entre servicios, `JWT_SECRET`, admin de la app y de Uptime Kuma |
| rubus-datos `infra/datos/.env` | Contraseñas de PostgreSQL, RabbitMQ y Redis |
| rubus-ia `infra/ia/.env` | `INFERENCE_AUTH_TOKEN`, credenciales R2 |
| rubus-app `infra/app/.env` | URLs con contraseña de datos, JWT, tokens internos, R2, Firebase |
| rubus-edge `infra/edge/.env` | Solo `VITE_MAPBOX_TOKEN` (opcional, público) |

Todos los `.env` de servidor tienen permisos 600 y están ignorados por git. Operación diaria: ver `RUNBOOK.md`.

## Web pública: CSP y mapas

- nginx (`infra/edge/nginx/https.conf`) envía `Content-Security-Policy`: scripts solo del propio dominio; estilos en línea permitidos (antd); fuentes de Google; imágenes de OpenStreetMap, Mapbox y R2; conexiones `self` y `wss://rubusai.tech`.
- Capa satelital del mapa de calor: `VITE_MAPBOX_TOKEN` en `infra/edge/.env` (público, se incrusta al compilar la web). Sin él, el botón Satélite no aparece.

## fruit-training

No está desplegado en producción. Entrena en local. Por eso rubus-ia solo tiene `fruit-inference` y así el entrenamiento nunca le quita CPU a los análisis.
