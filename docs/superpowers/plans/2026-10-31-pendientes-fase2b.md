# Pendientes de la Fase 2b Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Cerrar los pendientes que dejaron la verificación de la Fase 2b y su investigación: suites de jest dependientes del entorno, primer comando de Redis fallido tras arrancar, sockets muertos en el gateway y dos menores de la app KMP.

**Origen:** investigación del 2026-10-31 (ver `rubus-ai-kmp/docs/dependencias-pendientes.md`, «Pendientes de la Fase 2b»). Cada tarea está acotada a la causa ya confirmada.

## Reglas de trabajo (valen para todas las tareas)

- Trabajar SOLO en `/home/san/Proyectos/zarza-workspace-pendientes-fase2b` (rama `fix/pendientes-fase2b`). No cambiar de rama ni tocar `/home/san/Proyectos/zarza-workspace`.
- Commits en español, estilo del repo, **sin** línea `Co-Authored-By` y **sin** mencionar a Claude/Anthropic.
- No leer ningún `.env`. En el worktree no hay `.env`; los tests no deben necesitarlo.
- `fruit-backend`: ejecutar siempre los tres, porque `jest` solo no detecta errores de tipos: `pnpm run build`, `pnpm exec jest` y `pnpm exec tsc --noEmit`. Línea base de `tsc --noEmit`: 8 errores preexistentes en `fcm.service.spec.ts` (1), `internal-notify.controller.spec.ts` (6) y `storage.service.spec.ts` (1); ninguno debe aparecer en archivos tocados. Si falta `node_modules`: `pnpm install --frozen-lockfile` en la raíz del worktree; si el build pide el cliente Prisma: `pnpm run generate` en `packages/database`.
- `rubus-ai-kmp`: comandos de Gradle desde `rubus-ai-kmp/`. Todos los tests: `./gradlew :shared:testAndroidHostTest --console=plain`. Línea base: 351 tests (`CaptureScreenTest.conFotoYCampoSubirLlamaAlCallback` puede fallar una vez de forma intermitente; repetir).

---

### Task 1: jest hermético en `fruit-backend`

**Problema (confirmado):** 5 suites (`damage-classification`, `training`) no arrancan con `Config validation error: "TRAINING_URL" is required` porque `src/config/envs.ts` carga `dotenv/config` y exige `TRAINING_URL`/`INFERENCE_URL`, que Docker inyecta pero no están en `.env` ni en `.env.example`. Con ambas definidas, 2 tests de `training.service.spec.ts` fallan porque el `.env` de desarrollo define `TRAINING_MIN_REVIEWED_ANALYSES` distinto del 50 por defecto. Con las tres variables fijadas, 46/46 pasan. Las variables reales del entorno ganan sobre `.env` (dotenv no sobrescribe).

**Archivos:** configuración de jest de `fruit-backend` (donde esté: `package.json` clave `jest` o `jest.config.*`), un nuevo archivo de setup de jest (p. ej. `fruit-backend/test/jest.setup.ts` o junto a la config), `fruit-backend/.env.example`.

- Añadir un `setupFiles` de jest que fije de forma **incondicional** `process.env.TRAINING_URL = 'http://localhost:8001'`, `process.env.INFERENCE_URL = 'http://localhost:8000'` y `process.env.TRAINING_MIN_REVIEWED_ANALYSES = '50'`, con un comentario de una línea que explique por qué (tests herméticos: no dependen del `.env` del desarrollador). Debe ejecutarse antes de que `envs.ts` se importe. Comprobar que aplica también a `test:e2e` solo si comparte config; si no, no tocar e2e.
- Añadir `TRAINING_URL` e `INFERENCE_URL` a `fruit-backend/.env.example` con valores de ejemplo evidentes y un comentario breve (en Docker los inyecta `docker-compose.yml`; en local apuntan a los servicios). Mirar el estilo del archivo; no incluir secretos.
- Verificar: (a) sin ninguna de las tres variables en el entorno: todas las suites pasan; (b) simulando el `.env` del desarrollador (`TRAINING_MIN_REVIEWED_ANALYSES=1 pnpm exec jest ...` con la variable puesta en el entorno del comando): siguen pasando; (c) suite completa, `build` y `tsc --noEmit` (misma línea base de 8 errores). Esperado: 31 suites pasan, 0 suites que no arrancan.
- Commit: `test(fruit-backend): jest fija TRAINING_URL, INFERENCE_URL y el umbral para no depender del .env`

---

### Task 2: cliente Redis conectado desde el arranque

**Problema (reproducido en el contenedor):** `src/cache/cache.module.ts` crea el cliente con `lazyConnect: true` y `enableOfflineQueue: false`; el primer comando tras arrancar el backend falla con «Stream isn't writeable and enableOfflineQueue options is false» y el segundo ya funciona. Si ese primer comando es `invalidatePrefix('dash:')`, la invalidación se omite y las métricas del dashboard quedan desactualizadas hasta 300 s (`DASHBOARD_TTL_SECONDS`).

**Archivos:** `fruit-backend/src/cache/cache.module.ts` (y un test nuevo o ampliado en `fruit-backend/src/cache/`).

- Al crear el cliente, iniciar la conexión en segundo plano sin bloquear el arranque ni lanzar si Redis no existe: `void redis.connect().catch(() => {})` (los errores ya los registra el listener `error` de `RedisCacheService`, y `retryStrategy` sigue reintentando). Mantener `enableOfflineQueue: false` y `maxRetriesPerRequest: 1` (el objetivo de fallar rápido sin Redis, p. ej. dev local sin Docker, se conserva). Actualizar el comentario del módulo para explicar que `lazyConnect` ya no deja la primera orden sin conexión. Si tras `connect()` explícito `lazyConnect` pierde sentido, quitarlo solo si ioredis lo permite sin cambiar el comportamiento ante Redis ausente; si no hay claridad, dejar `lazyConnect: true` (necesario para que `connect()` manual sea válido).
- Extraer la creación a una función exportada (p. ej. `createRedisClient(url)`) para poder probarla. Test unitario con `jest.mock('ioredis')`: `connect` se invoca una vez al crear el cliente; si `connect()` rechaza, no se produce un rechazo sin manejar (el test no debe fallar por unhandled rejection) y no lanza al crear el cliente; las opciones (`enableOfflineQueue: false`, `maxRetriesPerRequest: 1`) se mantienen. Seguir el estilo de `redis-cache.service.spec.ts`.
- Verificar los tres comandos de `fruit-backend` (misma línea base de tsc). No hace falta Docker.
- Commit: `fix(fruit-backend): el cliente Redis conecta al arrancar para que la primera invalidación no se pierda`

---

### Task 3: heartbeat del gateway WebSocket

**Problema (confirmado por código):** `fruit-backend/src/notifications/notifications.gateway.ts` solo tiene el timeout de autenticación de 10 s; no hay ping/terminate. Si un cliente se cae sin cierre limpio (modo avión, cambio de red), `handleDisconnect` nunca se ejecuta y el socket permanece en `rooms` hasta que TCP lo descarte; `emitToUser` escribe también en los muertos. Los clientes (OkHttp, Darwin, navegadores) responden `pong` a los `ping` del protocolo automáticamente.

**Archivos:** `fruit-backend/src/notifications/notifications.gateway.ts` y su spec (`notifications.gateway.spec.ts` si existe; si no, crear uno siguiendo el estilo de los specs de `notifications/`).

- Patrón estándar de `ws`: constante `HEARTBEAT_INTERVAL_MS = 30_000`. Mantener el estado de vida por socket (p. ej. `WeakSet`/`Set<WebSocket>` de «vivos», o una propiedad en un `Map`) puesto a `true` en `handleConnection` y en el evento `pong` de ese socket (`client.on('pong', ...)`). Un `setInterval` iniciado al arrancar el gateway (`OnModuleInit`/`afterInit`, lo que ya use el proyecto; si el gateway no implementa ninguno, añadir `OnModuleInit`) recorre `this.server.clients` (o los sockets conocidos): para cada uno, si no está vivo → `client.terminate()` (esto dispara `handleDisconnect` por el evento `close`); si lo está → marcarlo no vivo y `client.ping()`. Limpiar el intervalo en `OnModuleDestroy` (y `unref()` para no retener el proceso en tests). No cambiar el protocolo ni el mensaje `ping`/`pong` de aplicación existente, ni la autenticación.
- Tests con `jest.useFakeTimers()` y sockets simulados (objetos con `ping`, `terminate`, `on`, `readyState`): (a) un socket que responde `pong` entre dos ticks sobrevive y recibe `ping` en cada tick; (b) un socket que no responde se termina en el segundo tick; (c) `terminate` de un socket autenticado acaba en `handleDisconnect` limpiando `rooms` (si el test simula el `close`, llamar a `handleDisconnect` como lo haría Nest); (d) el intervalo se limpia al destruir el módulo (`jest.getTimerCount() === 0`); (e) no hay efectos sobre los tests existentes.
- Verificar los tres comandos de `fruit-backend` (misma línea base de tsc).
- Commit: `feat(fruit-backend): el gateway WebSocket hace ping cada 30 s y termina los sockets que no responden`

---

### Task 4: menores de la app KMP

**Archivos:** `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/feature/aviso/AvisoViewModel.kt`, `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/feature/aviso/AvisoViewModelTest.kt`, `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt` (solo si cambia la construcción del ViewModel), `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/realtime/RealtimeHostTest.kt`.

**4a — Aviso tras cerrar sesión.** Hoy `AvisoViewModel(realtime)` sigue mostrando un aviso pendiente (≤4 s) aunque la sesión ya no exista, y lo entrega al volver de segundo plano. Hacer que el ViewModel limpie `_aviso` cuando la sesión deja de ser `SessionState.Authenticated` (observando el estado de sesión que ya expone `SessionManager`; mirar cómo lo reciben otros ViewModels y cómo los tests lo simulan, y seguir ese patrón; si hace falta una dependencia nueva, que `viewModelOf(::AvisoViewModel)` la resuelva sin cambiar el módulo más de lo imprescindible). Además, un `AnalisisListo` que llegue sin sesión autenticada no debe producir aviso. Mantener `Aviso(id)` y `onAvisoMostrado` tal cual. Los 6 tests existentes siguen pasando (adaptando solo la construcción), y se añaden: (i) un aviso pendiente se limpia al pasar a `Unauthenticated`; (ii) un `AnalisisListo` con sesión no autenticada no produce aviso; (iii) con sesión autenticada todo sigue igual. TDD: ver cada test nuevo fallar antes.
Commit: `fix(rubus-ai-kmp): el aviso de análisis listo se limpia al cerrarse la sesión`

**4b — Test de arranque en `Loading`.** Añadir a `RealtimeHostTest` el test (el estado de sesión inicial real es `SessionState.Loading`):
```kotlin
    @Test
    fun mientrasCargaLaSesionNoConecta() {
        sesion.value = SessionState.Loading
        render()
        assertEquals(0, client.connects)
    }
```
(importar `SessionState.Loading` solo si hace falta; mantener el estilo del archivo). Debe pasar sin tocar `RealtimeHost`. Verificar por mutación que el test es útil: con `conectar = estado == RESUMED` (sin mirar la sesión) el test debe fallar; restaurar.
Commit: `test(rubus-ai-kmp): RealtimeHost no conecta mientras la sesión está cargando`

**Verificación de la tarea:** `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain` → `BUILD SUCCESSFUL`, 351 + los nuevos tests.

---

### Task 5: documentación

**Archivo:** `rubus-ai-kmp/docs/dependencias-pendientes.md` (leer completo antes; mismo estilo).

- En «Pendientes de la Fase 2b»: eliminar (o marcar como resuelto, según el estilo del archivo para pendientes resueltos) los puntos «Aviso tras cerrar sesión» y «Sockets muertos en el servidor»; el punto «Corrección de `auth/me` en producción» se mantiene. Añadir una nota breve donde corresponda a que `fruit-backend` hace ping cada 30 s al gateway y que el cliente Redis conecta al arrancar. No tocar otros pendientes.
- Commit: `docs(rubus-ai-kmp): cerrados los pendientes de la fase 2b sobre sockets muertos y aviso tras cerrar sesión`
