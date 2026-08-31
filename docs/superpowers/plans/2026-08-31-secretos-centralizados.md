# Secretos Centralizados: Rotación Automatizada — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar la rotación manual (documentada hoy en `SECURITY.md`) de los 4 secretos estáticos del proyecto: `INTERNAL_NOTIFY_TOKEN`, `INFERENCE_AUTH_TOKEN`, `TRAINING_INTERNAL_TOKEN` (tokens compartidos entre servicios) y `FCM_TOKEN_ENCRYPTION_KEY` (clave de cifrado de datos ya persistidos), incluyendo el backfill de tokens FCM que quedaron en texto plano.

**Arquitectura:** Un script bash genérico (`scripts/rotate-secret.sh`) para los 3 tokens compartidos (mismo patrón: generar → escribir en N `.env` → redesplegar → verificar). Para `FCM_TOKEN_ENCRYPTION_KEY`, que además re-encripta datos en la BD, la lógica pura de "qué reencriptar" vive como una función testeable en `fruit-backend/src/` (para que jest la cubra — `jest.config` de `fruit-backend` tiene `rootDir: "src"`, así que cualquier test fuera de esa carpeta no correría), y un script CLI delgado en `fruit-backend/scripts/` la invoca con acceso real a Prisma.

**Tech Stack:** Bash + `jq` + `docker compose` (rotación de tokens compartidos). TypeScript + `ts-node` + Prisma (rotación de clave de cifrado), reusando `AesGcmCrypto` ya existente.

---

**Spec de referencia:** [[2026-08-31-secretos-centralizados-design]]

**Nota de contexto verificada durante el plan:** `docker compose ps <servicio> --format json` devuelve **un objeto JSON por línea** (NDJSON), no un array — así que el campo de salud se lee con `jq -r '.Health'`, sin indexar `.[0]`. Confirmado corriendo el comando contra el stack local ya levantado en esta máquina.

---

### Task 1: `scripts/rotate-secret.sh` — rotación de tokens compartidos

**Files:**
- Create: `scripts/rotate-secret.sh`

- [ ] **Step 1: Crear el directorio y el script**

```bash
mkdir -p scripts
```

Contenido de `scripts/rotate-secret.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

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
```

- [ ] **Step 2: Hacerlo ejecutable**

```bash
chmod +x scripts/rotate-secret.sh
```

- [ ] **Step 3: Verificar sintaxis (chequeo estático, sin correrlo de verdad)**

Run: `bash -n scripts/rotate-secret.sh`
Expected: sin salida, exit code 0.

- [ ] **Step 4: Probar la validación de argumentos (sin Docker real)**

El script hace `cd` a su propio `REPO_ROOT` al arrancar, así que la validación solo puede probarse ejecutándolo dentro del repo. Estos dos casos cubren los caminos de error que no requieren Docker (fallan antes de llegar a esa parte):

```bash
# Caso 1: variable no soportada -> debe fallar antes de tocar nada
./scripts/rotate-secret.sh JWT_SECRET fruit-backend
echo "exit code: $?"
```
Expected: imprime `Error: 'JWT_SECRET' no es un secreto rotable por este script.` y `exit code: 1`.

```bash
# Caso 2: sin servicios -> debe fallar con el mensaje de uso
./scripts/rotate-secret.sh INTERNAL_NOTIFY_TOKEN
echo "exit code: $?"
```
Expected: imprime `Error: falta especificar al menos un servicio.` y `exit code: 1`.

Estos dos casos cubren la validación de entrada sin necesidad de Docker ni de modificar ningún `.env` real. La verificación end-to-end completa (con Docker real) se hace en el Task 5.

- [ ] **Step 5: Commit**

```bash
git add scripts/rotate-secret.sh
git commit -m "feat(scripts): agregar rotate-secret.sh para tokens compartidos"
```

---

### Task 2: Lógica pura de re-encriptado (`fcm-key-rotation.ts`)

**Files:**
- Create: `fruit-backend/src/auth/infrastructure/adapters/fcm-key-rotation.ts`
- Test: `fruit-backend/src/auth/infrastructure/adapters/fcm-key-rotation.spec.ts`

- [ ] **Step 1: Escribir el test que falla**

`fruit-backend/src/auth/infrastructure/adapters/fcm-key-rotation.spec.ts`:

```typescript
import { randomBytes } from 'crypto';
import { AesGcmCrypto } from './aes-gcm-crypto.adapter';
import { planFcmKeyRotation } from './fcm-key-rotation';

function makeCrypto(): AesGcmCrypto {
  process.env.FCM_TOKEN_ENCRYPTION_KEY = randomBytes(32).toString('base64');
  return new AesGcmCrypto();
}

describe('planFcmKeyRotation', () => {
  it('re-encripta un token ya cifrado con la clave vieja usando la clave nueva', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();
    const encryptedWithOld = oldCrypto.encrypt('token-real-123');

    const plan = planFcmKeyRotation(
      [{ id: 'user-1', fcmToken: encryptedWithOld }],
      oldCrypto,
      newCrypto,
    );

    expect(plan.updates).toHaveLength(1);
    expect(plan.updates[0].id).toBe('user-1');
    expect(newCrypto.decrypt(plan.updates[0].newValue)).toBe('token-real-123');
    expect(plan.reencryptedCount).toBe(1);
    expect(plan.legacyPlaintextCount).toBe(0);
  });

  it('cifra un token legado en texto plano (backfill) con la clave nueva', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();

    const plan = planFcmKeyRotation(
      [{ id: 'user-2', fcmToken: 'token-legado-sin-cifrar' }],
      oldCrypto,
      newCrypto,
    );

    expect(plan.updates).toHaveLength(1);
    expect(newCrypto.decrypt(plan.updates[0].newValue)).toBe(
      'token-legado-sin-cifrar',
    );
    expect(plan.legacyPlaintextCount).toBe(1);
    expect(plan.reencryptedCount).toBe(0);
  });

  it('procesa una mezcla de filas cifradas y en texto plano, contando cada tipo', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();
    const encrypted = oldCrypto.encrypt('cifrado-real');

    const plan = planFcmKeyRotation(
      [
        { id: 'a', fcmToken: encrypted },
        { id: 'b', fcmToken: 'plano-real' },
      ],
      oldCrypto,
      newCrypto,
    );

    expect(plan.reencryptedCount).toBe(1);
    expect(plan.legacyPlaintextCount).toBe(1);
    expect(plan.updates.map((u) => u.id).sort()).toEqual(['a', 'b']);
  });

  it('propaga el error si un valor cifrado no puede desencriptarse con la clave vieja', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();
    const corrupted =
      'v1:AAAAAAAAAAAAAAAA:BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB:Zg==';

    expect(() =>
      planFcmKeyRotation(
        [{ id: 'user-3', fcmToken: corrupted }],
        oldCrypto,
        newCrypto,
      ),
    ).toThrow();
  });

  it('con una lista vacía no genera updates', () => {
    const oldCrypto = makeCrypto();
    const newCrypto = makeCrypto();

    const plan = planFcmKeyRotation([], oldCrypto, newCrypto);

    expect(plan.updates).toEqual([]);
    expect(plan.reencryptedCount).toBe(0);
    expect(plan.legacyPlaintextCount).toBe(0);
  });
});
```

- [ ] **Step 2: Correr el test para confirmar que falla**

Run: `pnpm --filter fruit-backend exec jest fcm-key-rotation.spec.ts`
Expected: FAIL — `Cannot find module './fcm-key-rotation'`.

- [ ] **Step 3: Implementar `fcm-key-rotation.ts`**

`fruit-backend/src/auth/infrastructure/adapters/fcm-key-rotation.ts`:

```typescript
import { ICryptoPort } from '../../ports/crypto.port';

export interface FcmTokenRow {
  id: string;
  fcmToken: string;
}

export interface FcmKeyRotationUpdate {
  id: string;
  newValue: string;
}

export interface FcmKeyRotationPlan {
  updates: FcmKeyRotationUpdate[];
  reencryptedCount: number;
  legacyPlaintextCount: number;
}

const ENCRYPTED_PREFIX = 'v1:';

/**
 * Calcula qué escribir en cada fila para rotar FCM_TOKEN_ENCRYPTION_KEY:
 * desencripta con la clave vieja (o toma el valor tal cual si es texto
 * plano legado) y re-encripta con la clave nueva. No toca la base de
 * datos — eso lo hace el script que invoca esta función.
 */
export function planFcmKeyRotation(
  rows: FcmTokenRow[],
  oldCrypto: ICryptoPort,
  newCrypto: ICryptoPort,
): FcmKeyRotationPlan {
  const updates: FcmKeyRotationUpdate[] = [];
  let reencryptedCount = 0;
  let legacyPlaintextCount = 0;

  for (const row of rows) {
    const isEncrypted = row.fcmToken.startsWith(ENCRYPTED_PREFIX);
    const plainText = isEncrypted
      ? oldCrypto.decrypt(row.fcmToken)
      : row.fcmToken;

    if (isEncrypted) {
      reencryptedCount++;
    } else {
      legacyPlaintextCount++;
    }

    updates.push({ id: row.id, newValue: newCrypto.encrypt(plainText) });
  }

  return { updates, reencryptedCount, legacyPlaintextCount };
}
```

- [ ] **Step 4: Correr el test para confirmar que pasa**

Run: `pnpm --filter fruit-backend exec jest fcm-key-rotation.spec.ts`
Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/adapters/fcm-key-rotation.ts fruit-backend/src/auth/infrastructure/adapters/fcm-key-rotation.spec.ts
git commit -m "feat(fruit-backend): agregar lógica pura de rotación de FCM_TOKEN_ENCRYPTION_KEY"
```

---

### Task 3: Script CLI `rotate-fcm-key.ts`

**Files:**
- Create: `fruit-backend/scripts/rotate-fcm-key.ts`
- Modify: `fruit-backend/package.json` (agregar script `rotate:fcm-key`)

- [ ] **Step 1: Crear el script**

`fruit-backend/scripts/rotate-fcm-key.ts`:

```typescript
import 'dotenv/config';
import { randomBytes } from 'crypto';
import { execSync } from 'child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@rubus/database';
import { AesGcmCrypto } from '../src/auth/infrastructure/adapters/aes-gcm-crypto.adapter';
import { planFcmKeyRotation } from '../src/auth/infrastructure/adapters/fcm-key-rotation';

const APPLY = process.argv.includes('--apply');
const ENV_PATH = join(__dirname, '..', '.env');
const REPO_ROOT = join(__dirname, '..', '..');
const FCM_KEY_LINE = /^FCM_TOKEN_ENCRYPTION_KEY=.*$/m;

async function main(): Promise<void> {
  const oldKey = process.env.FCM_TOKEN_ENCRYPTION_KEY;
  if (!oldKey) {
    console.error(
      '❌ FCM_TOKEN_ENCRYPTION_KEY no está seteada en fruit-backend/.env',
    );
    process.exit(1);
  }

  const envContent = readFileSync(ENV_PATH, 'utf8');
  if (!FCM_KEY_LINE.test(envContent)) {
    console.error(
      '❌ fruit-backend/.env no tiene una línea FCM_TOKEN_ENCRYPTION_KEY=. Abortando sin tocar nada.',
    );
    process.exit(1);
  }

  const oldCrypto = new AesGcmCrypto();
  const newKey = randomBytes(32).toString('base64');
  process.env.FCM_TOKEN_ENCRYPTION_KEY = newKey;
  const newCrypto = new AesGcmCrypto();
  process.env.FCM_TOKEN_ENCRYPTION_KEY = oldKey; // restaurar, por si algo más del proceso la lee

  const prisma = new PrismaClient();
  await prisma.$connect();

  const rows = (
    await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    })
  ).filter(
    (row): row is { id: string; fcmToken: string } => row.fcmToken !== null,
  );

  const plan = planFcmKeyRotation(rows, oldCrypto, newCrypto);

  console.log(`Usuarios con fcmToken: ${rows.length}`);
  console.log(`  Ya cifrados (se re-encriptan): ${plan.reencryptedCount}`);
  console.log(
    `  En texto plano legado (backfill): ${plan.legacyPlaintextCount}`,
  );

  if (!APPLY) {
    console.log('\nDry-run. Corré con --apply para ejecutar de verdad.');
    await prisma.$disconnect();
    return;
  }

  try {
    await prisma.$transaction(
      plan.updates.map((u) =>
        prisma.user.update({
          where: { id: u.id },
          data: { fcmToken: u.newValue },
        }),
      ),
    );
  } catch (err) {
    console.error('❌ La transacción falló, no se escribió ningún cambio:', err);
    await prisma.$disconnect();
    process.exit(1);
  }
  await prisma.$disconnect();

  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const backupPath = `${ENV_PATH}.bak-${timestamp}`;
  copyFileSync(ENV_PATH, backupPath);
  writeFileSync(ENV_PATH, envContent.replace(FCM_KEY_LINE, `FCM_TOKEN_ENCRYPTION_KEY=${newKey}`));

  console.log(
    `✓ ${plan.updates.length} tokens re-encriptados en la base de datos.`,
  );
  console.log(`✓ FCM_TOKEN_ENCRYPTION_KEY actualizada (backup: ${backupPath})`);
  console.log('Redesplegando fruit-backend...');
  execSync('docker compose up -d --build fruit-backend', {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  console.log('✓ Listo.');
}

main().catch((err) => {
  console.error('❌ Error inesperado:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Agregar el script de package.json**

Modificar `fruit-backend/package.json`, en el bloque `"scripts"` (junto a `"seed:admin"`):

```json
    "seed:admin": "node scripts/seed-admin.js",
    "rotate:fcm-key": "ts-node -r tsconfig-paths/register scripts/rotate-fcm-key.ts"
```

- [ ] **Step 3: Verificar que TypeScript compila sin errores**

Run: `pnpm --filter fruit-backend exec tsc --noEmit scripts/rotate-fcm-key.ts --esModuleInterop --module commonjs --target es2023 --skipLibCheck --strictNullChecks`
Expected: sin errores de tipo (chequeo aislado del archivo; el build completo de `nest build` no incluye `scripts/` porque `tsconfig.json` solo tiene `"include": ["src/**/*"]`, así que no se agrega a ese `include` — este script se ejecuta directo con `ts-node`, no se compila a `dist/`).

- [ ] **Step 4: Dry-run real contra la base de datos local**

Con el stack ya levantado (`docker compose up -d postgres`, o el stack completo si ya está corriendo):

Run: `pnpm --filter fruit-backend run rotate:fcm-key`
Expected: imprime el conteo de usuarios con `fcmToken` (puede ser 0 si no hay datos de prueba) y termina con "Dry-run. Corré con --apply para ejecutar de verdad." sin escribir nada en `.env` ni tocar la BD.

- [ ] **Step 5: Commit**

```bash
git add fruit-backend/scripts/rotate-fcm-key.ts fruit-backend/package.json
git commit -m "feat(fruit-backend): agregar script de rotación de FCM_TOKEN_ENCRYPTION_KEY"
```

---

### Task 4: Actualizar `SECURITY.md`

**Files:**
- Modify: `SECURITY.md`

- [ ] **Step 1: Reemplazar los pasos manuales de los 3 tokens compartidos**

En `SECURITY.md`, reemplazar el bloque `**Proceso de rotación (manual):**` de `INTERNAL_NOTIFY_TOKEN` (líneas actuales ~41-52) por:

```markdown
**Proceso de rotación (automatizado):**

```bash
scripts/rotate-secret.sh INTERNAL_NOTIFY_TOKEN fruit-backend fruit-ms
```

El script genera un valor nuevo, actualiza el `.env` de ambos servicios (con
backup automático), redespliega los contenedores afectados y verifica que
el healthcheck vuelva a reportar `healthy` y que no haya rechazos de token
en los logs recientes de `fruit-backend`. Si algo falla, el script termina
con error y deja el backup del `.env` viejo (`fruit-backend/.env.bak-<timestamp>`,
`fruit-ms/.env.bak-<timestamp>`) para revertir a mano.
```

Aplicar el mismo reemplazo (mismo texto, cambiando el comando) a los bloques de `INFERENCE_AUTH_TOKEN` y `TRAINING_INTERNAL_TOKEN`:

```bash
scripts/rotate-secret.sh INFERENCE_AUTH_TOKEN fruit-ms fruit-backend fruit-inference
scripts/rotate-secret.sh TRAINING_INTERNAL_TOKEN fruit-backend fruit-training
```

(Nota: para `INFERENCE_AUTH_TOKEN` y `TRAINING_INTERNAL_TOKEN`, aclarar que la verificación automática de logs no aplica hoy — solo se verifica el healthcheck — porque esos dos servicios no loguean el rechazo de token todavía; agregar una línea final: *"Confirmá manualmente con un uso real (ej. disparar una inferencia o revisar el flujo de entrenamiento) antes de borrar el backup."*)

- [ ] **Step 2: Agregar sección nueva para `FCM_TOKEN_ENCRYPTION_KEY`**

Agregar después de la sección de `TRAINING_INTERNAL_TOKEN` en `SECURITY.md`:

```markdown
### `FCM_TOKEN_ENCRYPTION_KEY`

Clave de cifrado simétrico (AES-256-GCM) usada por `fruit-backend` para
cifrar el campo `fcmToken` de cada usuario antes de guardarlo en Postgres.
A diferencia de los tokens compartidos de arriba, rotarla **también
re-encripta los datos ya guardados** — no alcanza con cambiar la variable
de entorno y redesplegar, porque los tokens ya cifrados con la clave vieja
dejarían de poder desencriptarse.

**Proceso de rotación (automatizado):**

```bash
# 1. Dry-run: cuántos tokens se re-encriptarían, sin escribir nada.
pnpm --filter fruit-backend run rotate:fcm-key

# 2. Ejecutar de verdad.
pnpm --filter fruit-backend run rotate:fcm-key -- --apply
```

El script lee todos los `fcmToken` no nulos, desencripta cada uno con la
clave vieja (o los toma tal cual si están en texto plano legado — esto
resuelve el backfill pendiente en la misma pasada), y los re-encripta con
una clave nueva dentro de una transacción de base de datos. Si cualquier
fila falla, la transacción entera revierte y no se toca `fruit-backend/.env`
ni se redespliega — la base de datos queda consistente con la clave vieja.
Solo si la transacción completa sin errores, el script actualiza
`FCM_TOKEN_ENCRYPTION_KEY` en `fruit-backend/.env` (con backup) y
redespliega `fruit-backend`.

**Cadencia recomendada:** la misma que los demás secretos (cada 90 días, o
de inmediato ante sospecha de filtración).
```

- [ ] **Step 3: Quitar la nota de "mejora futura" sobre secret manager para estos 4 secretos**

Buscar y quitar/ajustar la línea existente `**Mejora futura:** migrar este y otros secretos estáticos (...) a un gestor de secretos (...)` para que quede claro que la automatización de rotación ya se resolvió, y que la migración a un secret manager externo sigue siendo una mejora futura distinta (evaluada y descartada por ahora en el spec, ver [[2026-08-31-secretos-centralizados-design]]).

- [ ] **Step 4: Commit**

```bash
git add SECURITY.md
git commit -m "docs: documentar rotación automatizada de los 4 secretos del proyecto"
```

---

### Task 5: Verificación manual end-to-end

**Files:** ninguno (solo verificación, sin cambios de código).

- [ ] **Step 1: Rotar `INTERNAL_NOTIFY_TOKEN` de verdad contra el stack local**

Con el stack completo levantado (`docker compose up -d`):

Run: `scripts/rotate-secret.sh INTERNAL_NOTIFY_TOKEN fruit-backend fruit-ms`
Expected: termina imprimiendo "Rotación de INTERNAL_NOTIFY_TOKEN completada." y la ruta de los dos backups. Confirmar manualmente subiendo una imagen de prueba y verificando que la notificación WebSocket llega (el flujo `nueva_fruta` → `fruit-ms` → `fruit-backend /internal/notify` usa este token).

- [ ] **Step 2: Rotar `INFERENCE_AUTH_TOKEN`**

Run: `scripts/rotate-secret.sh INFERENCE_AUTH_TOKEN fruit-ms fruit-backend fruit-inference`
Expected: termina en éxito. Confirmar subiendo una imagen de prueba y verificando que el análisis se completa (usa `fruit-ms` → `fruit-inference /analyze`).

- [ ] **Step 3: Rotar `TRAINING_INTERNAL_TOKEN`**

Run: `scripts/rotate-secret.sh TRAINING_INTERNAL_TOKEN fruit-backend fruit-training`
Expected: termina en éxito. Confirmar disparando un job de entrenamiento de prueba desde `/modelos-ia` en `zarza-web` (o revisando que `GET /internal/training/dataset` y `POST /internal/training-complete` sigan funcionando).

- [ ] **Step 4: Rotar `FCM_TOKEN_ENCRYPTION_KEY` con `--apply`**

Run: `pnpm --filter fruit-backend run rotate:fcm-key -- --apply`
Expected: termina en éxito, redespliega `fruit-backend`. Confirmar que un usuario con push notifications activas las sigue recibiendo tras la rotación (ej. login desde `zarza_ai` y verificar que `PATCH /auth/fcm-token` sigue guardando/leyendo el token correctamente).

- [ ] **Step 5: Borrar los backups una vez confirmado todo**

Run: `rm fruit-backend/.env.bak-* fruit-ms/.env.bak-* fruit-inference/.env.bak-* fruit-training/.env.bak-*`
Expected: sin salida (los backups ya estaban gitignored por el patrón `.env.*`, así que esto es solo limpieza local, no afecta git).

- [ ] **Step 6: Confirmación final**

Dejar un comentario en el PR (o mensaje al usuario) confirmando que los 4 secretos se rotaron exitosamente contra el stack local y que `SECURITY.md` refleja el proceso nuevo.
