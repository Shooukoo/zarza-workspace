# Secretos centralizados: rotación automatizada — Diseño

**Plan relacionado:** [[2026-08-31-secretos-centralizados]]

**Fecha:** 2026-08-31
**Alcance:** nuevo directorio `scripts/` en la raíz del monorepo (rotación de tokens compartidos), `fruit-backend/scripts/` (rotación de la clave de cifrado FCM), `SECURITY.md`.

## Problema

El proyecto tiene 4 secretos estáticos, todos como variables de entorno planas:

| Secreto | Servicios | Naturaleza |
|---|---|---|
| `INTERNAL_NOTIFY_TOKEN` | `fruit-backend`, `fruit-ms` | Token compartido |
| `INFERENCE_AUTH_TOKEN` | `fruit-ms`, `fruit-backend`, `fruit-inference` | Token compartido |
| `TRAINING_INTERNAL_TOKEN` | `fruit-backend`, `fruit-training` | Token compartido |
| `FCM_TOKEN_ENCRYPTION_KEY` | `fruit-backend` | Clave de cifrado simétrico (AES-256-GCM) sobre datos ya persistidos |

Los tres tokens compartidos tienen rotación **manual** documentada en `SECURITY.md` (generar con `openssl rand -hex 32`, editar N `.env`, redesplegar N servicios, verificar logs a mano) — propenso a error humano y repetido tres veces con la misma forma. `FCM_TOKEN_ENCRYPTION_KEY` no tiene ningún proceso de rotación documentado, y además hay tokens FCM que quedaron en texto plano en la BD desde antes de que se agregara el cifrado (`AesGcmCrypto`, ver [[2026-07-08-security-fixes-fcm-inference-design]]) — nunca se hizo el backfill.

Este proyecto no adopta un secret manager externo (Vault/AWS Secrets Manager): el stack corre solo localmente vía `docker compose`, no hay todavía un servidor de staging/producción real desplegado (ver [[2026-06-24-roadmap-tareas-pendientes]], tarea de Flutter flavors), así que ese salto de infraestructura no está justificado hoy. El objetivo es automatizar los pasos manuales que ya existen.

## Sección 1 — `scripts/rotate-secret.sh` (los 3 tokens compartidos)

Script genérico en bash, en la raíz del monorepo (nuevo directorio `scripts/`, junto a `docker-compose.yml`):

```
scripts/rotate-secret.sh <NOMBRE_VAR> <servicio1> <servicio2> [...]
```

**Pasos:**

1. Valida que `<NOMBRE_VAR>` sea una de las 3 soportadas (`INTERNAL_NOTIFY_TOKEN`, `INFERENCE_AUTH_TOKEN`, `TRAINING_INTERNAL_TOKEN`) — lista blanca fija en el script, para no poder apuntar por error a `FCM_TOKEN_ENCRYPTION_KEY` (que tiene su propio script, sección 2) ni a variables no relacionadas con secretos.
2. Genera el valor nuevo: `openssl rand -hex 32`.
3. Por cada servicio recibido: copia su `.env` a `.env.bak-<timestamp>` (mismo directorio, ya cubierto por `.gitignore` al ser un patrón `.env*`), y reemplaza la línea `<NOMBRE_VAR>=...` con `sed`. Si la línea no existe en algún `.env`, aborta antes de tocar ningún archivo (falla rápido y completo, no a medias).
4. Corre `docker compose up -d --build <servicio1> <servicio2> ...` desde la raíz del repo.
5. Verifica: espera a que el healthcheck de cada servicio afectado reporte `healthy` (poll cada 2s, timeout 60s — ya existe healthcheck en `docker-compose.yml` para estos servicios), y grepea los últimos 20 segundos de logs del servicio receptor (`docker compose logs --since=20s <servicio>`) buscando patrones de rechazo por token inválido (`Invalid internal token`, `Invalid inference token`, `401`). Si encuentra alguno, imprime advertencia y termina con exit code 1 — pero **no revierte** el `.env` automáticamente (revertir requeriría volver a desplegar con el valor viejo, y el operador debe decidir si investiga primero); el `.env.bak-*` queda disponible para revertir a mano.
6. Si todo lo anterior pasa, imprime éxito y el nombre del backup (para borrarlo cuando el operador confirme que todo sigue funcionando en uso normal).

**Uso concreto** (documentado en `SECURITY.md`, sección 3):

```bash
scripts/rotate-secret.sh INTERNAL_NOTIFY_TOKEN fruit-backend fruit-ms
scripts/rotate-secret.sh INFERENCE_AUTH_TOKEN fruit-ms fruit-backend fruit-inference
scripts/rotate-secret.sh TRAINING_INTERNAL_TOKEN fruit-backend fruit-training
```

## Sección 2 — `fruit-backend/scripts/rotate-fcm-key.js` (`FCM_TOKEN_ENCRYPTION_KEY`)

Sigue el mismo patrón que `fruit-backend/scripts/seed-admin.js` (Node plano, `require` del `PrismaClient` generado en `packages/database/generated/client`, carga `.env` con `dotenv`) — no un comando Nest, para no arrastrar todo el bootstrap de la aplicación por un script de uso puntual.

**Modo dry-run por defecto; `--apply` para ejecutar de verdad:**

```bash
node fruit-backend/scripts/rotate-fcm-key.js          # dry-run: solo reporta
node fruit-backend/scripts/rotate-fcm-key.js --apply  # rota de verdad
```

También expuesto como script de package: `"rotate:fcm-key": "node scripts/rotate-fcm-key.js"` en `fruit-backend/package.json`, igual que `seed:admin`.

**Pasos (usa `AesGcmCrypto` directamente — misma clase que ya existe en `fruit-backend/src/auth/infrastructure/adapters/aes-gcm-crypto.adapter.ts`, instanciada dos veces: una con la clave vieja, otra con la nueva):**

1. Lee `FCM_TOKEN_ENCRYPTION_KEY` actual del `.env` → clave vieja.
2. Genera clave nueva: `crypto.randomBytes(32).toString('base64')`.
3. `SELECT id, fcmToken FROM users WHERE fcmToken IS NOT NULL` vía Prisma.
4. Por cada fila:
   - Si `fcmToken` empieza con `v1:` → desencripta con la clave vieja.
   - Si no (texto plano legado) → se usa tal cual como el valor a re-encriptar (esto resuelve el backfill pendiente en la misma pasada, sin script separado).
   - Encripta el resultado con la clave nueva.
5. **Modo dry-run:** imprime cuántas filas se re-encriptarían y cuántas eran texto plano legado (sin escribir nada).
6. **Modo `--apply`:** ejecuta los pasos 3-4 dentro de una transacción Prisma (`prisma.$transaction`) que hace un `UPDATE` por fila con el valor re-encriptado. Si cualquier fila falla (ej. `authTag` corrupto en la clave vieja), la transacción entera revierte — no se escribe ninguna fila a medio re-encriptar.
7. Solo si la transacción completa sin errores: escribe la clave nueva en `fruit-backend/.env` (mismo mecanismo de backup `.env.bak-<timestamp>` que la sección 1) y corre `docker compose up -d --build fruit-backend`.
8. Si el paso 6 falla, el script termina con exit code 1 y no toca `.env` ni redespliega — la BD ya quedó revertida por la transacción, así que el estado es consistente con la clave vieja (nada que revertir manualmente).

**Por qué no reutiliza `rotate-secret.sh`:** esa rotación no tiene paso de datos, es puramente generar+escribir+redeploy; esta sí, y necesita acceso tipado a Prisma y a la lógica de cifrado existente — mezclar ambos en un solo script (bash llamando a Node a mitad de camino) sería más difícil de leer que dos scripts con responsabilidad clara.

## Sección 3 — Documentación (`SECURITY.md`)

- Reemplazar los pasos manuales actuales de `INTERNAL_NOTIFY_TOKEN`, `INFERENCE_AUTH_TOKEN` y `TRAINING_INTERNAL_TOKEN` por el comando único de `scripts/rotate-secret.sh` correspondiente.
- Agregar sección nueva "`FCM_TOKEN_ENCRYPTION_KEY`" (hoy no existe) documentando `rotate-fcm-key.js`, incluyendo que la primera corrida con `--apply` también resuelve el backfill de tokens en texto plano.
- Quitar cualquier mención de "backfill pendiente" en `SECURITY.md`/spec previo una vez implementado esto.
- Mantener la cadencia recomendada (90 días o ante sospecha de filtración) para los 4 secretos por igual.

## Testing

| Componente | Qué probar |
|---|---|
| `rotate-secret.sh` | Test con un `.env` de prueba en un directorio temporal (sin Docker real): reemplaza la línea correcta, crea backup, falla limpio si la variable no existe en algún `.env` listado. Se puede probar con `bats` o un script de shell simple — no hay convención previa de test de shell en el repo, así que se documenta el propio script como "probado manualmente + casos cubiertos en comentarios", ya que agregar un framework de test de bash nuevo para un solo script no se justifica. |
| `rotate-fcm-key.js` | Contra una BD de prueba (mismo patrón que usan los tests de integración existentes de Prisma, si los hay, o una BD sqlite/postgres de test dedicada): tokens `v1:` se re-encriptan correctamente y siguen desencriptando al texto plano original con la clave nueva; tokens en texto plano legado se cifran (backfill); una fila con `authTag` corrupto hace fallar toda la transacción sin dejar cambios parciales; dry-run no escribe nada. |
| Verificación manual end-to-end | Una corrida real de cada uno de los 4 scripts contra el stack local, documentada como paso del plan de implementación (no automatizada). |

## No incluido en este diseño

- Adopción de un secret manager externo (Vault, AWS Secrets Manager) — evaluado y descartado por ahora (ver Problema).
- Rotación de `JWT_SECRET` o credenciales R2 (`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`) — son secretos de naturaleza distinta (JWT_SECRET invalida todas las sesiones activas al rotar; las credenciales R2 las administra Cloudflare, no un `.env` compartido entre servicios) y quedan fuera de este ticket.
- Rotación automática programada (cron) — se decidió que el disparo sigue siendo manual, a discreción de un operador (ver diseño conversacional previo a este documento).
- Soporte para servidores remotos (SSH, múltiples entornos) — el stack corre solo localmente hoy; se puede agregar cuando exista un despliegue real de staging/producción.
