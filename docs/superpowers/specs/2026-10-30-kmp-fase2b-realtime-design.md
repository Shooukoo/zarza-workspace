# KMP Fase 2b: WebSocket y aviso `analisis_listo`

Fecha: 2026-10-30

## Contexto

La Fase 2 del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`) se parte en tres sub-fases. La 2a (captura y subida) está integrada en `main` y verificada en un teléfono Android. Esta spec es la 2b.

| Sub-fase | Qué entrega |
|----------|-------------|
| 2a | Foto o galería, compresión, GPS y subida con red. Hecha. |
| **2b (esta spec)** | Cliente WebSocket con autenticación y reconexión; aviso global `analisis_listo`. |
| 2c | Pantalla de resultados con detecciones y validación del agrónomo. |

Ya existen en `rubus-ai-kmp/shared`: el `HttpClient` principal con `Bearer` y refresh (`createHttpClient`), `TokenRefresher`, `SessionEvents`, `SessionManager`, `SecureTokenStorage`, `EnvConfig` (solo `apiBaseUrl`), la ruta `Route.Result(id)` como marcador vacío y los módulos de Koin (`configModule`, `networkModule`, `authModule`, `captureModule`). `ktor-client-websockets` y los motores OkHttp y Darwin ya están en el build, pero sin uso hasta ahora.

### Protocolo del backend (no cambia)

`NotificationsGateway` (`fruit-backend/src/notifications/notifications.gateway.ts`), ruta `/ws`:

- Autenticación: el primer mensaje del cliente es `{"event":"auth","data":{"token":"<access token>"}}`. El servidor responde `{"event":"auth_ok"}`. Sin autenticar en 10 s, o con token inválido o vencido, cierra con código **4001**. (La web usa la cookie del handshake; el móvil no la manda.)
- El servidor solo verifica el token al conectar: un socket ya autenticado no se cierra cuando el access token vence (TTL 900 s).
- Entrega por usuario (`emitToUser`), a todos sus sockets. Formato: `{"event":"<tipo>","data":{...}}`.
- `analisis_listo` lleva `data: { imageId, id, userId }` (`fruit-ms/src/fruits/fruits.service.ts`); `id` es el id del análisis. También existen `analysis_validated` y `nueva_solicitud`.
- La librería `ws` del servidor responde sola a los pings del protocolo.

Lo que hace Flutter hoy (`zarza_ai/lib/data/datasources/websocket_datasource.dart`): conecta al tener token, manda `auth` al abrir, reconecta con espera lineal de 5 a 60 s, sin mirar el ciclo de vida de la app.

## Objetivo

Que un usuario con la sesión iniciada y la app visible reciba, en cuanto `fruit-ms` termina el análisis, un aviso «¡Análisis listo!» sobre cualquier pantalla, y que la conexión se recupere sola tras cambios de red o tras volver de segundo plano.

## Fuera de alcance

- Botón «Ver» y navegación al resultado (2c, cuando exista la pantalla).
- Los eventos `analysis_validated` y `nueva_solicitud`: se parsean como desconocidos y se ignoran.
- Recuperar avisos perdidos al volver de segundo plano (2c, que tendrá historial).
- Push FCM para la app cerrada y WebSocket en segundo plano.
- Bandeja de notificaciones.
- Cambios en el backend: ninguno.
- iOS: las piezas comunes compilan para iOS, pero no hay verificación en dispositivo hasta la Fase 9.

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Vida de la conexión | Solo con la app en primer plano (`RESUMED`) y con sesión. Se cierra al pasar a segundo plano o al cerrar sesión. |
| Qué hace el aviso | Snackbar global sin acción. Dos avisos seguidos: queda el último. |
| Enfoque | Cliente propio en `core/network`, con un `HttpClient` dedicado, y ciclo de vida desde Compose en la raíz de la app (sin `expect/actual`). |
| Por qué un cliente dedicado | El principal lleva `requestTimeoutMillis` de 30 s, el plugin `Auth` y `expectSuccess`, pensados para peticiones HTTP, no para sockets de larga vida. |
| Token vigente | Antes de autenticar el socket se hace una llamada a `auth/me` con el cliente principal (el backend la exime del throttler `auth` de 10/min por este motivo, y solo le aplica el `global`); si el access token venció, su refresh lo renueva. Después se lee el token de `SecureTokenStorage`. No se duplica la lógica de refresh. |
| Mantener la conexión viva | Ping del protocolo cada 20 s, sin `{event:'ping'}` de aplicación: en iOS lo gestiona Ktor (`pingIntervalMillis` del plugin); en Android se configura en el motor OkHttp (`pingInterval` en `PlatformModule.android.kt`), porque la sesión de OkHttp ignora el intervalo del plugin. |
| Eventos que no se usan | Se parsean a `RealtimeEvent.Desconocido` y se ignoran. |

## Diseño

### 1. Piezas

- **`EnvConfig.wsUrl`**: `ws://<devHost>:3001/ws` en DEV; `wss://staging.api.zarza.example/ws` en STAGING; `wss://api.zarza.example/ws` en PROD (marcadores, como `apiBaseUrl`). No lleva el prefijo `/api/v1`.
- **`RealtimeEvent`** (`core/model`): clase sellada `AnalisisListo(analisisId: String, imageId: String)` y `Desconocido(nombre: String)`.
- **`RealtimeEventParser`** (`core/network`): función pura `parse(texto: String): RealtimeEvent?`. Devuelve `null` si no es JSON, no tiene `event` o `analisis_listo` llega sin `data.id`. `auth_ok` no es un evento de negocio: lo consume `RealtimeClient`.
- **`WsTransport`** (`core/network`): interfaz mínima. Una función `suspend fun connect(url): WsConnection`, y `WsConnection` con `send(texto)`, `incoming: Flow<String>` (termina cuando el socket se cierra) y `close()`. Expone el código de cierre al terminar. Su implementación `KtorWsTransport` usa el `HttpClient` dedicado con el plugin `WebSockets` (`pingIntervalMillis = 20_000`, efectivo solo en iOS; en Android el keepalive va en el motor OkHttp), sin `Auth`, sin `HttpTimeout` de petición y sin `Logging` de cuerpos.
- **`createRealtimeHttpClient(engine)`** (`core/network`): construye ese `HttpClient`, igual que `createRefreshClient`.
- **`RealtimeClient`** (`core/network`): interfaz con `events: SharedFlow<RealtimeEvent>`, `state: StateFlow<ConnectionState>` (`Desconectado`, `Conectando`, `Conectado`), `fun connect()` y `fun disconnect()`. `RealtimeClientImpl` contiene el protocolo y la reconexión. Recibe `WsTransport`, `wsUrl: String` (de `EnvConfig.wsUrl`), un `suspend () -> String?` que entrega un token vigente, un `CoroutineScope` y el reloj/retardo inyectables para probar con tiempo virtual.
- **`RealtimeSession`** (`core/data`): da a `RealtimeClient` su proveedor de token (`auth/me` con el cliente principal y luego `SecureTokenStorage.read()`). No observa la sesión: quien desconecta al cerrarse es `RealtimeHost`.
- **`RealtimeHost`** (`@Composable`, raíz de la app): llama a `connect()` mientras haya sesión y el `LifecycleOwner` esté `RESUMED`, y a `disconnect()` en caso contrario.
- **`AvisoViewModel`**: expone un `StateFlow<Aviso?>`; `AnalisisListo` produce «¡Análisis listo!». Un snackbar global en la raíz lo muestra.
- **`realtimeModule()`** (Koin): registra todo lo anterior. El motor para `createRealtimeHttpClient` lo aporta cada plataforma, como el del cliente principal.

### 2. Flujo normal

1. Hay sesión y la app pasa a `RESUMED`: `RealtimeHost` llama a `connect()`. Si ya está conectando o conectado, no hace nada.
2. El cliente pasa a `Conectando`, pide un token vigente y abre `wsUrl`.
3. Manda `{"event":"auth","data":{"token":"…"}}`. Pasa a `Conectado` al recibir `auth_ok`. Si no llega en 10 s, cierra el socket y reintenta.
4. Cada mensaje se parsea; los `RealtimeEvent` salen por `events`.
5. `AvisoViewModel` convierte `AnalisisListo` en el snackbar.
6. Al pasar a segundo plano o cerrar sesión, `disconnect()` cierra el socket con código normal, cancela los reintentos y pasa a `Desconectado`.

### 3. Errores

| Caso | Qué hace |
|------|----------|
| Sin red o el handshake falla | Reintenta con espera exponencial: 2 s, 4 s, 8 s… tope de 60 s, con jitter de ±20 %. La espera vuelve a 2 s al recibir `auth_ok`. Solo mientras haya primer plano y sesión. |
| Cierre 4001 | Pide un token nuevo (con `auth/me`, que refresca si hace falta) y reintenta una vez de inmediato. Si vuelve a fallar, entra en la espera normal. |
| `auth/me` falla con 401 sin refresh posible | Es una sesión muerta: `SessionManager` ya la cierra y `RealtimeHost` desconecta. El socket no interviene. |
| `auth/me` falla por red | No se conecta con un token viejo; se trata como fallo de handshake (espera normal). |
| Mensaje que no es JSON o incompleto | Se descarta con un log sin su contenido; la conexión sigue. |
| Evento desconocido | Sale como `Desconocido`; nadie lo consume. |
| Logout mientras se espera el token | Al volver el token, si el cliente ya está `Desconectado`, no abre el socket. |

### 4. Seguridad

El token solo viaja dentro del mensaje `auth`, nunca en la URL ni en cabeceras. Los logs no imprimen el mensaje `auth` ni los eventos completos.

### 5. Pruebas

Automáticas (`commonTest`, con `runTest` y tiempo virtual, salvo donde se indica):

- `RealtimeEventParser`: `analisis_listo` completo, sin `data.id`, evento desconocido, JSON roto, mensaje vacío.
- `RealtimeClientImpl` con un `WsTransport` falso: conecta y pasa a `Conectado` solo tras `auth_ok`; sin `auth_ok` en 10 s cierra y reintenta; el cierre 4001 pide token nuevo y reintenta una vez sin esperar; la espera sigue 2, 4, 8… con tope de 60 s y se reinicia tras `auth_ok`; `disconnect()` cancela los reintentos; dos `connect()` seguidos no abren dos sockets; un mensaje corrupto no cierra la conexión; un `disconnect()` mientras se espera el token impide abrir el socket.
- `RealtimeSession`: un fallo de red en `auth/me` no conecta con el token viejo; lee el token después de `auth/me`.
- `AvisoViewModel`: `AnalisisListo` produce un aviso, un desconocido no, dos seguidos dejan el último.
- `RealtimeHost` (`androidHostTest`, como `RubusNavHostTest`): conecta con sesión y `RESUMED`, desconecta en `STOPPED` o sin sesión, reconecta al volver, no reconecta si solo cambia el usuario de la sesión.
- `EnvConfig.wsUrl`: los tres entornos, con esquema `ws`/`wss` y ruta `/ws`.
- `compileKotlinIosSimulatorArm64` y `compileTestKotlinIosSimulatorArm64` deben seguir compilando.

`KtorWsTransport` no tiene prueba automática: probarlo exige un servidor WebSocket embebido, una dependencia solo para eso. Lo cubre la prueba en el teléfono.

Manual en un teléfono físico (la 2b no se cierra sin ella):

1. Subir una foto y ver el snackbar «¡Análisis listo!» cuando `fruit-ms` termina.
2. Modo avión con la app abierta y quitarlo: debe reconectar solo.
3. Pasar a segundo plano un minuto y volver: debe reconectar.
4. Con el access token vencido (TTL 900 s): debe reautenticar vía `auth/me`.
5. Cerrar sesión: el socket se cierra y no se reabre.

## Riesgos

- **Regla escrita que cambia.** `rubus-ai-kmp/docs/dependencias-pendientes.md` dice «No crear otros `HttpClient`: el refresh de token solo está en este». El cliente del WebSocket es un segundo `HttpClient`. No rompe el motivo de la regla (el refresh sigue pasando por el principal vía `auth/me`), pero hay que reescribir esa frase en el mismo cambio.
- **Primer uso real de `ktor-client-websockets`** en OkHttp y en Darwin; hoy figura como «sin probar». En iOS solo se verifica que compila.
- **Android y el ciclo de vida.** Con la pantalla apagada se pierde `RESUMED` y el socket se cierra; es el comportamiento buscado.

## Documentación que se actualiza

- `rubus-ai-kmp/docs/dependencias-pendientes.md`: WebSockets de Ktor pasa de «sin probar» a en uso; se reescribe la regla de «no crear otros `HttpClient`».
- `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`: estado de la 2b.
