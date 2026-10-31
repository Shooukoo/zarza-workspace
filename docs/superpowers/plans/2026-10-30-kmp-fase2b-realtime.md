# KMP Fase 2b: WebSocket y aviso `analisis_listo` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario con sesión y la app en primer plano reciba un aviso global «¡Análisis listo!» cuando `fruit-ms` termina su análisis, con un cliente WebSocket que se autentica y se reconecta solo.

**Architecture:** Un `RealtimeClient` en `core/network` con el protocolo (auth, `auth_ok`, reconexión) separado del transporte (`WsTransport`, con implementación Ktor), de modo que la lógica se prueba con un transporte falso y tiempo virtual. `RealtimeHost` (composable en la raíz) conecta/desconecta según sesión y ciclo de vida; `AvisoViewModel` convierte `AnalisisListo` en un snackbar global.

**Tech Stack:** Kotlin Multiplatform, Compose Multiplatform, Ktor Client 3.6 (WebSockets, OkHttp/Darwin), kotlinx.coroutines/serialization, Koin, `kotlin.test` + `kotlinx-coroutines-test`, Robolectric + `ui-test-junit4`.

**Spec:** `docs/superpowers/specs/2026-10-30-kmp-fase2b-realtime-design.md`.

## Reglas de trabajo (valen para todas las tareas)

- Trabajar SOLO en `/home/san/Proyectos/zarza-workspace-kmp-fase2b` (rama `feature/kmp-fase2b-realtime`). No cambiar de rama ni tocar `/home/san/Proyectos/zarza-workspace`.
- Todos los comandos de Gradle se ejecutan desde `rubus-ai-kmp/` del worktree.
- Commits en español, estilo del repo (`feat(rubus-ai-kmp): ...`), **sin** línea `Co-Authored-By` y **sin** mencionar a Claude/Anthropic.
- No leer ningún `.env`. No usar `adb` ni tests de dispositivo en las tareas 1 a 9.
- Los tests de `commonTest` y `androidHostTest` corren todos con `:shared:testAndroidHostTest`. Para uno solo: `./gradlew :shared:testAndroidHostTest --tests "<nombre.completo.Clase>" --console=plain`.
- Línea base antes de empezar: 300 tests en verde.

## Desviación consciente respecto al spec

El spec dice que `RealtimeSession` desconecta al cerrarse la sesión. Eso ya lo hace `RealtimeHost` (conecta solo con `SessionState.Authenticated`), así que `RealtimeSession` se reduce a **dar el token vigente**. Así `connect()`/`disconnect()` se llaman siempre desde el hilo principal (desde `RealtimeHost`) y no hay carreras con el ámbito del cliente. La Tarea 9 corrige el texto del spec.

## Estructura de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `shared/src/commonMain/.../core/config/EnvConfig.kt` (modifica) | añade `wsUrl` |
| `.../core/model/RealtimeEvent.kt` (crea) | eventos de negocio del WebSocket |
| `.../core/network/RealtimeEventParser.kt` (crea) | texto del servidor → `ServerMessage` |
| `.../core/network/WsTransport.kt` (crea) | interfaces `WsTransport`/`WsConnection`, `KtorWsTransport`, `createRealtimeHttpClient` |
| `.../core/network/RealtimeClient.kt` (crea) | `ConnectionState`, `RealtimeClient`, `RealtimeClientImpl` (protocolo + reconexión) |
| `.../core/data/realtime/RealtimeSession.kt` (crea) | token vigente para el socket |
| `.../core/realtime/RealtimeHost.kt` (crea) | composable que une sesión + ciclo de vida con el cliente |
| `.../feature/aviso/AvisoViewModel.kt` (crea) | `Aviso` y `AvisoViewModel` |
| `.../feature/aviso/AvisoHost.kt` (crea) | snackbar global |
| `.../composeResources/values/strings.xml` (modifica) | `aviso_analisis_listo` |
| `.../core/di/AppModule.kt` (modifica) | `realtimeModule()` |
| `.../App.kt` (modifica) | monta `RealtimeHost` y `AvisoHost` |
| tests en `commonTest`/`androidHostTest` | uno por pieza, ver cada tarea |
| `rubus-ai-kmp/docs/*.md`, el spec (modifican) | documentación |

---

### Task 1: `EnvConfig.wsUrl`

**Files:**
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/config/EnvConfig.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/config/EnvConfigTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

Añadir dentro de la clase `EnvConfigTest`, antes de la llave final:

```kotlin
    @Test
    fun devUsaWsConElHostRecibido() {
        val config = EnvConfig(Environment.DEV, devHost = "192.168.1.50")

        assertEquals("ws://192.168.1.50:3001/ws", config.wsUrl)
    }

    @Test
    fun stagingUsaWssSinElPrefijoDeLaApi() {
        val config = EnvConfig(Environment.STAGING, devHost = "192.168.1.50")

        assertEquals("wss://staging.api.zarza.example/ws", config.wsUrl)
    }

    @Test
    fun prodUsaWssSinElPrefijoDeLaApi() {
        val config = EnvConfig(Environment.PROD, devHost = "")

        assertEquals("wss://api.zarza.example/ws", config.wsUrl)
    }
```

- [ ] **Step 2: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.config.EnvConfigTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'wsUrl'`.

- [ ] **Step 3: Implementar**

En `EnvConfig.kt`, añadir justo después del bloque `val apiBaseUrl ... }`:

```kotlin

    /** URL del WebSocket (`/ws`, sin el prefijo `/api/v1`). Mismos hosts que [apiBaseUrl]. */
    val wsUrl: String = when (environment) {
        Environment.DEV -> "ws://$devHost:3001/ws"
        Environment.STAGING -> "wss://staging.api.zarza.example/ws"
        Environment.PROD -> "wss://api.zarza.example/ws"
    }
```

Y en el KDoc de la clase, cambiar la línea `Los dominios de staging y prod son marcadores hasta que existan los reales.` por `Los dominios de staging y prod (API y WebSocket) son marcadores hasta que existan los reales.`

- [ ] **Step 4: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.config.EnvConfigTest" --console=plain`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/config/EnvConfig.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/config/EnvConfigTest.kt
git commit -m "feat(rubus-ai-kmp): EnvConfig.wsUrl por entorno"
```

---

### Task 2: `RealtimeEvent` y su parser

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/model/RealtimeEvent.kt`
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/network/RealtimeEventParser.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/network/RealtimeEventParserTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

`RealtimeEventParserTest.kt`:

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RealtimeEventParserTest {

    @Test
    fun authOkSeReconoce() {
        assertEquals(ServerMessage.AuthOk, parseServerMessage("""{"event":"auth_ok"}"""))
    }

    @Test
    fun analisisListoCompletoSeConvierteEnEvento() {
        val texto = """{"event":"analisis_listo","data":{"imageId":"raw/x.jpg","id":"a1","userId":"u1"}}"""

        assertEquals(
            ServerMessage.Evento(RealtimeEvent.AnalisisListo(analisisId = "a1", imageId = "raw/x.jpg")),
            parseServerMessage(texto),
        )
    }

    @Test
    fun analisisListoSinImageIdUsaCadenaVacia() {
        val texto = """{"event":"analisis_listo","data":{"id":"a1"}}"""

        assertEquals(
            ServerMessage.Evento(RealtimeEvent.AnalisisListo(analisisId = "a1", imageId = "")),
            parseServerMessage(texto),
        )
    }

    @Test
    fun analisisListoSinIdSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo","data":{"imageId":"raw/x.jpg"}}"""))
    }

    @Test
    fun analisisListoConIdNuloSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo","data":{"id":null}}"""))
    }

    @Test
    fun analisisListoSinDataSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo"}"""))
    }

    @Test
    fun analisisListoConDataQueNoEsObjetoSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo","data":"hola"}"""))
    }

    @Test
    fun unEventoQueLaAppNoUsaSaleComoDesconocido() {
        assertEquals(
            ServerMessage.Evento(RealtimeEvent.Desconocido("analysis_validated")),
            parseServerMessage("""{"event":"analysis_validated","data":{"action":"validado"}}"""),
        )
        assertEquals(
            ServerMessage.Evento(RealtimeEvent.Desconocido("pong")),
            parseServerMessage("""{"event":"pong","data":"ok"}"""),
        )
    }

    @Test
    fun loQueNoEsUnObjetoJsonConEventSeDescarta() {
        assertNull(parseServerMessage(""))
        assertNull(parseServerMessage("basura"))
        assertNull(parseServerMessage("[]"))
        assertNull(parseServerMessage("\"auth_ok\""))
        assertNull(parseServerMessage("""{"data":{}}"""))
        assertNull(parseServerMessage("""{"event":42}"""))
        assertNull(parseServerMessage("""{"event":null}"""))
    }
}
```

- [ ] **Step 2: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.RealtimeEventParserTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'parseServerMessage'` / `ServerMessage` / `RealtimeEvent`.

- [ ] **Step 3: Implementar**

`core/model/RealtimeEvent.kt`:

```kotlin
package com.rubusai.app.core.model

/** Evento de negocio que el servidor empuja por el WebSocket. */
sealed interface RealtimeEvent {
    /** Terminó el análisis [analisisId] de la imagen [imageId] (`imageId` vacío si el servidor no lo mandó). */
    data class AnalisisListo(val analisisId: String, val imageId: String) : RealtimeEvent

    /** Evento que esta versión de la app no usa (por ejemplo `analysis_validated`). */
    data class Desconocido(val nombre: String) : RealtimeEvent
}
```

`core/network/RealtimeEventParser.kt`:

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Lo que el servidor manda por el socket: la confirmación de auth o un evento de negocio. */
internal sealed interface ServerMessage {
    data object AuthOk : ServerMessage

    data class Evento(val evento: RealtimeEvent) : ServerMessage
}

/**
 * Convierte un mensaje de texto del servidor (`{"event":"…","data":{…}}`) en un [ServerMessage].
 * Devuelve `null` si no es un objeto JSON con `event` de texto, o si `analisis_listo` llega sin `data.id`.
 */
internal fun parseServerMessage(texto: String): ServerMessage? {
    val objeto = try {
        Json.parseToJsonElement(texto) as? JsonObject
    } catch (e: IllegalArgumentException) {
        // SerializationException (JSON roto) es una IllegalArgumentException.
        null
    } ?: return null
    val nombre = objeto.cadena("event") ?: return null
    return when (nombre) {
        "auth_ok" -> ServerMessage.AuthOk
        "analisis_listo" -> {
            val data = objeto["data"] as? JsonObject ?: return null
            val id = data.cadena("id") ?: return null
            ServerMessage.Evento(RealtimeEvent.AnalisisListo(id, data.cadena("imageId").orEmpty()))
        }
        else -> ServerMessage.Evento(RealtimeEvent.Desconocido(nombre))
    }
}

/** El valor de [clave] si es una cadena JSON (no un número, ni `null`). */
private fun JsonObject.cadena(clave: String): String? =
    (this[clave] as? JsonPrimitive)?.takeIf { it.isString }?.content
```

- [ ] **Step 4: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.RealtimeEventParserTest" --console=plain`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/model/RealtimeEvent.kt rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/network/RealtimeEventParser.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/network/RealtimeEventParserTest.kt
git commit -m "feat(rubus-ai-kmp): RealtimeEvent y parser de los mensajes del WebSocket"
```

---

### Task 3: `WsTransport` e implementación Ktor

Esta pieza no tiene prueba automática (ver spec, §Pruebas): la cubre la prueba en el teléfono (Tarea 10). Aquí solo se exige que compile en Android e iOS.

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/network/WsTransport.kt`

- [ ] **Step 1: Crear el archivo**

```kotlin
package com.rubusai.app.core.network

import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.websocket.DefaultClientWebSocketSession
import io.ktor.client.plugins.websocket.WebSockets
import io.ktor.client.plugins.websocket.webSocketSession
import io.ktor.websocket.Frame
import io.ktor.websocket.close
import io.ktor.websocket.readText
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

private const val PING_INTERVAL_MS = 20_000L

/** Una conexión WebSocket abierta. Solo transporta texto: el protocolo vive en [RealtimeClientImpl]. */
internal interface WsConnection {
    /** Mensajes de texto que llegan; el flujo termina cuando el socket se cierra (o lanza si se cae con error). */
    val incoming: Flow<String>

    /** Código con el que el servidor cerró el socket. Solo es fiable cuando [incoming] terminó; `null` si no se sabe. */
    val closeCode: Int?

    suspend fun send(texto: String)

    suspend fun close()
}

internal interface WsTransport {
    /** Abre el socket en [url]. Lanza si no se puede abrir. */
    suspend fun connect(url: String): WsConnection
}

/**
 * `HttpClient` dedicado al WebSocket: solo el plugin `WebSockets` con ping. Sin `Auth`, sin
 * `HttpTimeout` de petición (cortaría el socket) y sin `Logging` (los mensajes llevan el token).
 */
internal fun createRealtimeHttpClient(engine: HttpClientEngine): HttpClient =
    HttpClient(engine) {
        install(WebSockets) { pingIntervalMillis = PING_INTERVAL_MS }
    }

internal class KtorWsTransport(private val client: HttpClient) : WsTransport {
    override suspend fun connect(url: String): WsConnection =
        KtorWsConnection(client.webSocketSession(url))
}

private class KtorWsConnection(private val session: DefaultClientWebSocketSession) : WsConnection {
    private var code: Int? = null

    override val closeCode: Int? get() = code

    override val incoming: Flow<String> = flow {
        for (frame in session.incoming) {
            if (frame is Frame.Text) emit(frame.readText())
        }
        code = try {
            session.closeReason.await()?.code?.toInt()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun send(texto: String) = session.send(Frame.Text(texto))

    override suspend fun close() = session.close()
}
```

- [ ] **Step 2: Verificar que compila en Android e iOS**

Run: `./gradlew :shared:testAndroidHostTest :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, los 300+ tests en verde. Si `pingIntervalMillis` no existiera en Ktor 3.6.0 el compilador lo dirá; en ese caso usar la propiedad equivalente que ofrezca la versión (comprobar en el IDE/KDoc de `WebSockets.Config`) y anotarlo en el reporte.

- [ ] **Step 3: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/network/WsTransport.kt
git commit -m "feat(rubus-ai-kmp): WsTransport y su implementación Ktor con ping"
```

---

### Task 4: `RealtimeClient` (protocolo y reconexión)

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/network/RealtimeClient.kt`
- Create: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/network/RealtimeTestSupport.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/network/RealtimeClientTest.kt`

- [ ] **Step 1: Escribir el soporte de tests (fakes)**

`RealtimeTestSupport.kt`:

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.test.TestCoroutineScheduler

/** Conexión falsa: el test hace de servidor con [server] y [serverClose]. */
internal class FakeWsConnection : WsConnection {
    private val channel = Channel<String>(Channel.UNLIMITED)

    override val incoming: Flow<String> = channel.receiveAsFlow()
    override var closeCode: Int? = null

    val sent = mutableListOf<String>()
    var closed = false
        private set

    override suspend fun send(texto: String) {
        sent += texto
    }

    override suspend fun close() {
        closed = true
        channel.close()
    }

    /** El servidor manda [texto]. */
    fun server(texto: String) {
        channel.trySend(texto)
    }

    /** El servidor cierra el socket con [code]. */
    fun serverClose(code: Int? = null) {
        closeCode = code
        channel.close()
    }
}

/** Transporte falso: registra cada intento (con el tiempo virtual) y puede fallar los primeros [failures]. */
internal class FakeWsTransport(private val scheduler: TestCoroutineScheduler) : WsTransport {
    val connections = mutableListOf<FakeWsConnection>()
    val attemptTimes = mutableListOf<Long>()
    val urls = mutableListOf<String>()
    var failures = 0

    override suspend fun connect(url: String): WsConnection {
        attemptTimes += scheduler.currentTime
        urls += url
        if (failures > 0) {
            failures--
            throw FakeNetworkException()
        }
        return FakeWsConnection().also { connections += it }
    }
}

/** Cliente en tiempo real falso para probar a quienes lo usan. */
internal class FakeRealtimeClient : RealtimeClient {
    private val _events = MutableSharedFlow<RealtimeEvent>(extraBufferCapacity = 16)
    override val events: SharedFlow<RealtimeEvent> = _events
    override val state: StateFlow<ConnectionState> = MutableStateFlow(ConnectionState.Desconectado)

    var connects = 0
        private set
    var disconnects = 0
        private set

    override fun connect() {
        connects++
    }

    override fun disconnect() {
        disconnects++
    }

    fun emit(evento: RealtimeEvent) {
        _events.tryEmit(evento)
    }
}
```

- [ ] **Step 2: Escribir los tests que fallan**

`RealtimeClientTest.kt`:

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

private const val AUTH_OK = """{"event":"auth_ok"}"""
private const val LISTO = """{"event":"analisis_listo","data":{"imageId":"raw/x.jpg","id":"a1","userId":"u1"}}"""

class RealtimeClientTest {

    private var tokenCalls = 0

    private fun TestScope.cliente(
        transport: FakeWsTransport,
        token: suspend () -> String? = { "tok-${++tokenCalls}" },
    ) = RealtimeClientImpl(
        transport = transport,
        wsUrl = "ws://test/ws",
        token = token,
        scope = backgroundScope,
        jitter = { 1.0 },
    )

    private suspend fun TestScope.avanzar(ms: Long) {
        advanceTimeBy(ms)
        runCurrent()
    }

    @Test
    fun conectaYSoloQuedaConectadoTrasAuthOk() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)

        client.connect()
        runCurrent()

        assertEquals(ConnectionState.Conectando, client.state.value)
        assertEquals(listOf("ws://test/ws"), transport.urls)
        assertEquals("""{"event":"auth","data":{"token":"tok-1"}}""", transport.connections.single().sent.single())

        transport.connections.single().server(AUTH_OK)
        runCurrent()

        assertEquals(ConnectionState.Conectado, client.state.value)
    }

    @Test
    fun sinAuthOkEnDiezSegundosCierraYReintentaALosDos() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        client.connect()
        runCurrent()

        avanzar(10_001)

        assertTrue(transport.connections[0].closed)
        assertEquals(1, transport.connections.size)
        assertEquals(ConnectionState.Conectando, client.state.value)

        avanzar(2_000)

        assertEquals(2, transport.connections.size)
        assertEquals(12_000L, transport.attemptTimes[1])
    }

    @Test
    fun elCierre4001PideTokenNuevoYReintentaUnaVezSinEsperar() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        client.connect()
        runCurrent()

        transport.connections[0].serverClose(4001)
        runCurrent()

        assertEquals(2, transport.connections.size)
        assertEquals(listOf(0L, 0L), transport.attemptTimes)
        assertEquals(2, tokenCalls)

        // Si vuelve a fallar con 4001, ya no hay reintento inmediato: entra en la espera normal.
        transport.connections[1].serverClose(4001)
        runCurrent()
        assertEquals(2, transport.connections.size)

        avanzar(2_001)
        assertEquals(3, transport.connections.size)
    }

    @Test
    fun laEsperaDuplicaYTieneTopeDeSesentaSegundos() = runTest {
        val transport = FakeWsTransport(testScheduler).apply { failures = 7 }
        val client = cliente(transport)

        client.connect()
        avanzar(190_000)

        assertEquals(
            listOf(0L, 2_000L, 6_000L, 14_000L, 30_000L, 62_000L, 122_000L, 182_000L),
            transport.attemptTimes.take(8),
        )
    }

    @Test
    fun laEsperaVuelveADosSegundosTrasUnAuthOk() = runTest {
        val transport = FakeWsTransport(testScheduler).apply { failures = 2 }
        val client = cliente(transport)
        client.connect()
        avanzar(6_001) // intentos en 0, 2 000 y 6 000 (este abre la conexión)
        val conexion = transport.connections.single()
        conexion.server(AUTH_OK)
        runCurrent()
        assertEquals(ConnectionState.Conectado, client.state.value)

        conexion.serverClose()
        runCurrent()
        assertEquals(ConnectionState.Conectando, client.state.value)
        avanzar(2_001)

        // Sin el reinicio la espera habría sido de 8 000 ms.
        assertEquals(8_001L, transport.attemptTimes.last())
    }

    @Test
    fun disconnectCancelaLosReintentos() = runTest {
        val transport = FakeWsTransport(testScheduler).apply { failures = 100 }
        val client = cliente(transport)
        client.connect()
        avanzar(3_000)
        assertEquals(2, transport.attemptTimes.size)

        client.disconnect()
        avanzar(100_000)

        assertEquals(2, transport.attemptTimes.size)
        assertEquals(ConnectionState.Desconectado, client.state.value)
    }

    @Test
    fun disconnectCierraLaConexionAbierta() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        client.connect()
        runCurrent()
        transport.connections.single().server(AUTH_OK)
        runCurrent()

        client.disconnect()
        runCurrent()

        assertTrue(transport.connections.single().closed)
        assertEquals(ConnectionState.Desconectado, client.state.value)
    }

    @Test
    fun dosConnectSeguidosNoAbrenDosSockets() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)

        client.connect()
        client.connect()
        runCurrent()

        assertEquals(1, transport.attemptTimes.size)
    }

    @Test
    fun unMensajeCorruptoNoCierraLaConexion() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        val recibidos = mutableListOf<RealtimeEvent>()
        backgroundScope.launch { client.events.toList(recibidos) }
        client.connect()
        runCurrent()
        val conexion = transport.connections.single()
        conexion.server(AUTH_OK)

        conexion.server("basura")
        conexion.server(LISTO)
        runCurrent()

        assertEquals(ConnectionState.Conectado, client.state.value)
        assertFalse(conexion.closed)
        assertEquals(listOf<RealtimeEvent>(RealtimeEvent.AnalisisListo("a1", "raw/x.jpg")), recibidos)
    }

    @Test
    fun losEventosAnterioresAlAuthOkSeIgnoran() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        val recibidos = mutableListOf<RealtimeEvent>()
        backgroundScope.launch { client.events.toList(recibidos) }
        client.connect()
        runCurrent()
        val conexion = transport.connections.single()

        conexion.server(LISTO)
        runCurrent()
        assertTrue(recibidos.isEmpty())

        conexion.server(AUTH_OK)
        conexion.server(LISTO)
        runCurrent()
        assertEquals(1, recibidos.size)
    }

    @Test
    fun unDisconnectMientrasSeEsperaElTokenImpideAbrirElSocket() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val gate = CompletableDeferred<String?>()
        val client = cliente(transport, token = { gate.await() })
        client.connect()
        runCurrent()

        client.disconnect()
        gate.complete("tok")
        runCurrent()

        assertTrue(transport.attemptTimes.isEmpty())
        assertEquals(ConnectionState.Desconectado, client.state.value)
    }

    @Test
    fun sinTokenNoSeConectaYSeReintentaConEspera() = runTest {
        val transport = FakeWsTransport(testScheduler)
        var llamadas = 0
        val client = cliente(transport, token = { llamadas++; null })

        client.connect()
        avanzar(2_001)

        assertTrue(transport.attemptTimes.isEmpty())
        assertEquals(2, llamadas)
        assertEquals(ConnectionState.Conectando, client.state.value)
    }

    @Test
    fun siPedirElTokenLanzaSeTrataComoFallo() = runTest {
        val transport = FakeWsTransport(testScheduler)
        var llamadas = 0
        val client = cliente(transport, token = { llamadas++; throw FakeNetworkException() })

        client.connect()
        avanzar(2_001)

        assertTrue(transport.attemptTimes.isEmpty())
        assertEquals(2, llamadas)
    }
}
```

- [ ] **Step 3: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.RealtimeClientTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'RealtimeClientImpl'` / `ConnectionState` / `RealtimeClient`.

- [ ] **Step 4: Implementar `RealtimeClient.kt`**

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlin.coroutines.cancellation.CancellationException
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private const val AUTH_TIMEOUT_MS = 10_000L
private const val BACKOFF_BASE_MS = 2_000L
private const val BACKOFF_MAX_MS = 60_000L
private const val BACKOFF_MAX_SHIFT = 10
private const val CLOSE_TOKEN_REJECTED = 4001

enum class ConnectionState { Desconectado, Conectando, Conectado }

/**
 * Canal en tiempo real con el backend. Mientras esté conectado reconecta solo. [connect] y
 * [disconnect] se llaman siempre desde el mismo hilo (el principal, desde `RealtimeHost`).
 */
interface RealtimeClient {
    /** Eventos de negocio. No se guardan: quien no esté suscrito en ese momento los pierde. */
    val events: SharedFlow<RealtimeEvent>

    val state: StateFlow<ConnectionState>

    /** Empieza a conectar y a reintentar. No hace nada si ya está en marcha. */
    fun connect()

    /** Cierra el socket y cancela los reintentos. */
    fun disconnect()
}

/**
 * Protocolo del backend (`/ws`): primer mensaje `{"event":"auth","data":{"token":…}}`, el
 * servidor responde `auth_ok`; sin él en 10 s, o con token inválido (cierre 4001), cierra.
 *
 * [token] entrega un access token vigente o `null`; se pide en cada intento. [jitter] da un
 * factor (0,8–1,2) que se aplica a la espera. [log] nunca recibe mensajes del socket ni tokens.
 */
internal class RealtimeClientImpl(
    private val transport: WsTransport,
    private val wsUrl: String,
    private val token: suspend () -> String?,
    private val scope: CoroutineScope,
    private val jitter: () -> Double = { 0.8 + Random.nextDouble() * 0.4 },
    private val log: (String) -> Unit = {},
) : RealtimeClient {
    private val _events = MutableSharedFlow<RealtimeEvent>(
        extraBufferCapacity = 16,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    override val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    private val _state = MutableStateFlow(ConnectionState.Desconectado)
    override val state: StateFlow<ConnectionState> = _state.asStateFlow()

    private var job: Job? = null

    override fun connect() {
        if (job?.isActive == true) return
        _state.value = ConnectionState.Conectando
        job = scope.launch { correr() }
    }

    // shortcut: si el bucle está justo escribiendo el estado mientras se cancela, puede quedar un
    // Conectado/Conectando obsoleto; la ventana es de microsegundos y RealtimeHost reconecta o
    // desconecta en cuanto cambia la sesión o el ciclo de vida. Subir a un solo hilo si molesta.
    override fun disconnect() {
        job?.cancel()
        job = null
        _state.value = ConnectionState.Desconectado
    }

    private enum class Fin { Cerrado, TokenRechazado, Fallo }

    private suspend fun correr() {
        var intento = 0
        var reintentoInmediato = true
        while (true) {
            val fin = sesion {
                intento = 0
                reintentoInmediato = true
            }
            marcar(ConnectionState.Conectando)
            if (fin == Fin.TokenRechazado && reintentoInmediato) {
                // Token vencido: el siguiente intento pide uno nuevo (auth/me refresca) sin esperar.
                reintentoInmediato = false
                continue
            }
            delay(espera(intento))
            intento++
        }
    }

    /** Un intento completo: token, conexión, auth y lectura hasta que el socket se cierra. */
    private suspend fun sesion(alAutenticar: () -> Unit): Fin {
        val accessToken = try {
            token()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
        if (accessToken == null) {
            log("Sin token vigente para el WebSocket")
            return Fin.Fallo
        }
        val conexion = try {
            transport.connect(wsUrl)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            log("No se pudo abrir el WebSocket")
            return Fin.Fallo
        }
        var autenticado = false
        try {
            coroutineScope {
                val vigilante = launch {
                    delay(AUTH_TIMEOUT_MS)
                    log("El servidor no confirmó la autenticación a tiempo")
                    conexion.close()
                }
                try {
                    conexion.send(mensajeAuth(accessToken))
                    conexion.incoming.collect { texto ->
                        when (val mensaje = parseServerMessage(texto)) {
                            ServerMessage.AuthOk -> {
                                vigilante.cancel()
                                autenticado = true
                                alAutenticar()
                                marcar(ConnectionState.Conectado)
                            }
                            is ServerMessage.Evento -> {
                                if (autenticado) _events.tryEmit(mensaje.evento)
                            }
                            null -> log("Mensaje del WebSocket descartado")
                        }
                    }
                } finally {
                    vigilante.cancel()
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            log("El WebSocket se cerró con error")
        } finally {
            withContext(NonCancellable) {
                try {
                    conexion.close()
                } catch (e: Exception) {
                    // Ya estaba cerrado.
                }
            }
        }
        return when {
            conexion.closeCode == CLOSE_TOKEN_REJECTED -> Fin.TokenRechazado
            autenticado -> Fin.Cerrado
            else -> Fin.Fallo
        }
    }

    /** No escribe el estado si el trabajo ya se canceló: `disconnect()` manda. */
    private suspend fun marcar(nuevo: ConnectionState) {
        if (currentCoroutineContext().isActive) _state.value = nuevo
    }

    private fun espera(intento: Int): Long {
        val base = BACKOFF_BASE_MS shl minOf(intento, BACKOFF_MAX_SHIFT)
        return minOf(BACKOFF_MAX_MS, (base * jitter()).toLong())
    }
}

private fun mensajeAuth(token: String): String = buildJsonObject {
    put("event", "auth")
    put("data", buildJsonObject { put("token", token) })
}.toString()
```

- [ ] **Step 5: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.RealtimeClientTest" --console=plain`
Expected: PASS (13 tests). Si un test de tiempos falla por un desfase de 1 ms, revisar primero si el error está en la expectativa (descrita en el comentario de cada test) antes de tocar la implementación, y explicarlo en el reporte.

- [ ] **Step 6: Suite completa y compilación iOS**

Run: `./gradlew :shared:testAndroidHostTest :shared:compileKotlinIosSimulatorArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, todos los tests en verde.

- [ ] **Step 7: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/network/RealtimeClient.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/network/RealtimeTestSupport.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/network/RealtimeClientTest.kt
git commit -m "feat(rubus-ai-kmp): RealtimeClient con auth, espera exponencial y reintento tras 4001"
```

---

### Task 5: `RealtimeSession` (token vigente)

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/data/realtime/RealtimeSession.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/data/realtime/RealtimeSessionTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

```kotlin
package com.rubusai.app.core.data.realtime

import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.TOKENS
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.platform.InMemoryTokenStorage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

class RealtimeSessionTest {

    @Test
    fun conSesionDevuelveElTokenGuardado() = runTest {
        val auth = FakeAuthRepository().apply { me = ana }

        val token = RealtimeSession(auth, InMemoryTokenStorage(TOKENS)).freshToken()

        assertEquals("access-old", token)
        assertEquals(1, auth.meCalls)
    }

    @Test
    fun siAuthMeFallaNoHayTokenAunqueHayaUnoGuardado() = runTest {
        val auth = FakeAuthRepository().apply { me = null }

        assertNull(RealtimeSession(auth, InMemoryTokenStorage(TOKENS)).freshToken())
    }

    @Test
    fun sinTokensGuardadosNoHayToken() = runTest {
        val auth = FakeAuthRepository().apply { me = ana }

        assertNull(RealtimeSession(auth, InMemoryTokenStorage()).freshToken())
    }

    @Test
    fun leeElTokenDespuesDeAuthMeParaCogerElRefrescado() = runTest {
        val storage = InMemoryTokenStorage(TOKENS)
        // El refresh del cliente principal guarda un par nuevo mientras `auth/me` se resuelve.
        val auth = object : AuthRepository by FakeAuthRepository() {
            override suspend fun fetchMe(): User? {
                storage.save(AuthTokens("access-new", "refresh-new"))
                return ana
            }
        }

        assertEquals("access-new", RealtimeSession(auth, storage).freshToken())
    }
}
```

- [ ] **Step 2: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.realtime.RealtimeSessionTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'RealtimeSession'`.

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.core.data.realtime

import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.platform.SecureTokenStorage

/**
 * Da al WebSocket un access token vigente. No cierra ni abre sesiones: `RealtimeHost` desconecta
 * el socket cuando la sesión termina.
 */
internal class RealtimeSession(
    private val auth: AuthRepository,
    private val tokenStorage: SecureTokenStorage,
) {
    /**
     * El access token guardado, o `null` si no se pudo confirmar la sesión. Antes pide `auth/me`
     * con el cliente principal: si el access token venció, su 401 dispara el refresh y deja el
     * par nuevo en [tokenStorage]; por eso el token se lee después. Si `auth/me` falla (red o
     * sesión muerta) no se devuelve el token viejo.
     */
    suspend fun freshToken(): String? {
        if (auth.fetchMe() == null) return null
        return tokenStorage.read()?.accessToken
    }
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.realtime.RealtimeSessionTest" --console=plain`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/data/realtime/RealtimeSession.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/data/realtime/RealtimeSessionTest.kt
git commit -m "feat(rubus-ai-kmp): RealtimeSession entrega el token vigente vía auth/me"
```

---

### Task 6: `AvisoViewModel` y snackbar global

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/feature/aviso/AvisoViewModel.kt`
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/feature/aviso/AvisoHost.kt`
- Modify: `rubus-ai-kmp/shared/src/commonMain/composeResources/values/strings.xml`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/feature/aviso/AvisoViewModelTest.kt`
- Test: `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/feature/aviso/AvisoSnackbarTest.kt`

- [ ] **Step 1: Escribir los tests del ViewModel (fallan)**

`AvisoViewModelTest.kt`:

```kotlin
package com.rubusai.app.feature.aviso

import com.rubusai.app.core.model.RealtimeEvent
import com.rubusai.app.core.network.FakeRealtimeClient
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class AvisoViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private fun crearVm(realtime: FakeRealtimeClient) = AvisoViewModel(realtime)

    @Test
    fun alInicioNoHayAviso() = runTest(dispatcher) {
        val vm = crearVm(FakeRealtimeClient())
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun analisisListoProduceUnAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.AnalisisListo("a1", "raw/x.jpg"))
        advanceUntilIdle()

        assertEquals(Aviso(id = 1), vm.aviso.value)
    }

    @Test
    fun unEventoDesconocidoNoProduceAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.Desconocido("nueva_solicitud"))
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun dosAvisosSeguidosDejanSoloElUltimo() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a2", ""))
        advanceUntilIdle()

        assertEquals(Aviso(id = 2), vm.aviso.value)
    }

    @Test
    fun marcarMostradoLimpiaElAvisoActual() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()

        vm.onAvisoMostrado(1)

        assertNull(vm.aviso.value)
    }

    @Test
    fun marcarMostradoUnAvisoViejoNoBorraElNuevo() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a2", ""))
        advanceUntilIdle()

        vm.onAvisoMostrado(1)

        assertEquals(Aviso(id = 2), vm.aviso.value)
    }
}
```

- [ ] **Step 2: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.aviso.AvisoViewModelTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'AvisoViewModel'` / `Aviso`.

- [ ] **Step 3: Implementar `AvisoViewModel.kt`**

```kotlin
package com.rubusai.app.feature.aviso

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.model.RealtimeEvent
import com.rubusai.app.core.network.RealtimeClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Aviso global «¡Análisis listo!». El [id] crece con cada aviso: dos seguidos son distintos para la UI. */
internal data class Aviso(val id: Long)

internal class AvisoViewModel(realtime: RealtimeClient) : ViewModel() {
    private val _aviso = MutableStateFlow<Aviso?>(null)
    val aviso: StateFlow<Aviso?> = _aviso.asStateFlow()

    private var contador = 0L

    init {
        viewModelScope.launch {
            realtime.events.collect { evento ->
                if (evento is RealtimeEvent.AnalisisListo) _aviso.value = Aviso(++contador)
            }
        }
    }

    /** La UI terminó con el aviso [id]; si ya llegó otro más nuevo, ese se conserva. */
    fun onAvisoMostrado(id: Long) {
        _aviso.update { if (it?.id == id) null else it }
    }
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.aviso.AvisoViewModelTest" --console=plain`
Expected: PASS (6 tests).

- [ ] **Step 5: Añadir el texto y escribir el test de UI (falla)**

En `strings.xml`, antes de `</resources>`, añadir:

```xml

    <string name="aviso_analisis_listo">¡Análisis listo!</string>
```

`AvisoSnackbarTest.kt` (androidHostTest):

```kotlin
package com.rubusai.app.feature.aviso

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AvisoSnackbarTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun conUnAvisoMuestraElTexto() {
        rule.setContent { RubusTheme { AvisoSnackbar(aviso = Aviso(1), onMostrado = {}) } }

        rule.waitUntilAtLeastOneExists(hasText("¡Análisis listo!"), timeoutMillis = 5_000)
    }

    @Test
    fun sinAvisoNoMuestraNada() {
        rule.setContent { RubusTheme { AvisoSnackbar(aviso = null, onMostrado = {}) } }
        rule.waitForIdle()

        rule.onAllNodesWithText("¡Análisis listo!").assertCountEquals(0)
    }

    @Test
    fun alTerminarDeMostrarseAvisaConSuId() {
        val mostrados = mutableListOf<Long>()
        rule.setContent { RubusTheme { AvisoSnackbar(aviso = Aviso(7), onMostrado = { mostrados += it }) } }
        rule.waitUntilAtLeastOneExists(hasText("¡Análisis listo!"), timeoutMillis = 5_000)

        // SnackbarDuration.Short dura ~4 s; el reloj del test avanza solo.
        rule.waitUntil(timeoutMillis = 10_000) { mostrados.isNotEmpty() }

        assertEquals(listOf(7L), mostrados)
    }
}
```

- [ ] **Step 6: Verificar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.aviso.AvisoSnackbarTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'AvisoSnackbar'`.

- [ ] **Step 7: Implementar `AvisoHost.kt`**

```kotlin
package com.rubusai.app.feature.aviso

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.aviso_analisis_listo
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

/** Snackbar global: se monta una vez en la raíz de la app y se dibuja sobre cualquier pantalla. */
@Composable
internal fun AvisoHost() {
    val viewModel = koinViewModel<AvisoViewModel>()
    val aviso by viewModel.aviso.collectAsStateWithLifecycle()
    AvisoSnackbar(aviso = aviso, onMostrado = viewModel::onAvisoMostrado)
}

/**
 * Muestra «¡Análisis listo!» por cada [aviso] nuevo y avisa con [onMostrado] cuando termina. Un aviso
 * nuevo cancela el anterior: queda el último. La capa no captura toques.
 */
@Composable
internal fun AvisoSnackbar(aviso: Aviso?, onMostrado: (Long) -> Unit, modifier: Modifier = Modifier) {
    val state = remember { SnackbarHostState() }
    val texto = stringResource(Res.string.aviso_analisis_listo)

    LaunchedEffect(aviso?.id) {
        val actual = aviso ?: return@LaunchedEffect
        try {
            state.showSnackbar(texto)
        } finally {
            onMostrado(actual.id)
        }
    }

    Box(modifier = modifier.fillMaxSize().safeDrawingPadding()) {
        SnackbarHost(hostState = state, modifier = Modifier.align(Alignment.BottomCenter))
    }
}
```

- [ ] **Step 8: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.aviso.*" --console=plain`
Expected: PASS (9 tests). Si `waitUntil` del tercer test agota los 10 s, probar `rule.mainClock.advanceTimeBy(5_000)` seguido de `rule.waitForIdle()` y explicarlo en el reporte; no cambiar el comportamiento de `AvisoSnackbar`.

- [ ] **Step 9: Compilación iOS**

Run: `./gradlew :shared:compileKotlinIosSimulatorArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 10: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/feature/aviso rubus-ai-kmp/shared/src/commonMain/composeResources/values/strings.xml rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/feature/aviso rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/feature/aviso
git commit -m "feat(rubus-ai-kmp): aviso global de análisis listo con AvisoViewModel y snackbar"
```

---

### Task 7: `RealtimeHost`

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/realtime/RealtimeHost.kt`
- Test: `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/realtime/RealtimeHostTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

```kotlin
package com.rubusai.app.core.realtime

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.data.auth.anaAdmin
import com.rubusai.app.core.network.FakeRealtimeClient
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RealtimeHostTest {

    @get:Rule
    val rule = createComposeRule()

    private val client = FakeRealtimeClient()
    private val sesion = mutableStateOf<SessionState>(SessionState.Unauthenticated())
    private val owner = object : LifecycleOwner {
        val registry = LifecycleRegistry.createUnsafe(this)
        override val lifecycle: Lifecycle get() = registry
    }

    private fun render(estado: Lifecycle.State = Lifecycle.State.RESUMED) {
        rule.runOnUiThread { owner.registry.currentState = estado }
        rule.setContent {
            CompositionLocalProvider(LocalLifecycleOwner provides owner) {
                RealtimeHost(sessionState = sesion.value, client = client)
            }
        }
        rule.waitForIdle()
    }

    private fun setSesion(valor: SessionState) {
        rule.runOnIdle { sesion.value = valor }
        rule.waitForIdle()
    }

    private fun setCicloDeVida(estado: Lifecycle.State) {
        rule.runOnUiThread { owner.registry.currentState = estado }
        rule.waitForIdle()
    }

    @Test
    fun sinSesionNoConecta() {
        render()

        assertEquals(0, client.connects)
    }

    @Test
    fun conSesionYPrimerPlanoConecta() {
        render()

        setSesion(SessionState.Authenticated(ana))

        assertEquals(1, client.connects)
        assertEquals(0, client.disconnects)
    }

    @Test
    fun alPasarASegundoPlanoDesconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))

        setCicloDeVida(Lifecycle.State.STARTED)

        assertEquals(1, client.disconnects)
    }

    @Test
    fun alVolverAPrimerPlanoReconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))
        setCicloDeVida(Lifecycle.State.STARTED)

        setCicloDeVida(Lifecycle.State.RESUMED)

        assertEquals(2, client.connects)
    }

    @Test
    fun alCerrarSesionDesconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))

        setSesion(SessionState.Unauthenticated())

        assertEquals(1, client.disconnects)
    }

    @Test
    fun conSesionPeroEnSegundoPlanoNoConecta() {
        render(estado = Lifecycle.State.STARTED)

        setSesion(SessionState.Authenticated(ana))

        assertEquals(0, client.connects)
    }

    @Test
    fun siSoloCambiaElUsuarioNoReconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))

        setSesion(SessionState.Authenticated(anaAdmin))

        assertEquals(1, client.connects)
        assertEquals(0, client.disconnects)
    }
}
```

- [ ] **Step 2: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.realtime.RealtimeHostTest" --console=plain`
Expected: FAIL por compilación: `Unresolved reference 'RealtimeHost'`.

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.core.realtime

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.network.RealtimeClient

/**
 * Mantiene conectado el [client] mientras haya sesión y la app esté en primer plano (`RESUMED`).
 * No dibuja nada. Se llama desde la raíz de la app, así que `connect`/`disconnect` corren en el
 * hilo principal.
 */
@Composable
internal fun RealtimeHost(sessionState: SessionState, client: RealtimeClient) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val estado by lifecycle.currentStateFlow.collectAsState()
    // Un cambio de usuario dentro de la misma sesión (refresco de rol) no cambia este booleano.
    val conectar = sessionState is SessionState.Authenticated && estado == Lifecycle.State.RESUMED

    DisposableEffect(conectar, client) {
        if (conectar) client.connect()
        onDispose { if (conectar) client.disconnect() }
    }
}
```

- [ ] **Step 4: Verificar que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.realtime.RealtimeHostTest" --console=plain`
Expected: PASS (7 tests).

- [ ] **Step 5: Compilación iOS**

Run: `./gradlew :shared:compileKotlinIosSimulatorArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/realtime/RealtimeHost.kt rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/realtime/RealtimeHostTest.kt
git commit -m "feat(rubus-ai-kmp): RealtimeHost conecta según sesión y ciclo de vida"
```

---

### Task 8: Koin y raíz de la app

**Files:**
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/App.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

En `KoinGraphTest.kt` añadir estos imports (ordenados con los existentes):

```kotlin
import com.rubusai.app.core.network.ConnectionState
import com.rubusai.app.core.network.RealtimeClient
import com.rubusai.app.feature.aviso.AvisoViewModel
```

y dentro de la clase, antes de la llave final:

```kotlin
    @Test
    fun elGrafoResuelveElClienteDeTiempoRealComoUnicaInstanciaYDesconectado() = runTest {
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val client = app.koin.get<RealtimeClient>()

            assertSame(client, app.koin.get<RealtimeClient>())
            assertEquals(ConnectionState.Desconectado, client.state.value)
        } finally {
            app.close()
        }
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun elGrafoResuelveElViewModelDeAvisos() = runTest {
        // `AvisoViewModel` lanza en `viewModelScope` al crearse: necesita un `Main`.
        Dispatchers.setMain(StandardTestDispatcher())
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            app.koin.get<AvisoViewModel>()
        } finally {
            app.close()
            Dispatchers.resetMain()
        }
    }
```

- [ ] **Step 2: Verificar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.di.KoinGraphTest" --console=plain`
Expected: FAIL: `NoDefinitionFoundException` para `RealtimeClient` y `AvisoViewModel`.

- [ ] **Step 3: Implementar `realtimeModule()`**

En `AppModule.kt` añadir imports (en orden alfabético con los existentes):

```kotlin
import com.rubusai.app.core.data.realtime.RealtimeSession
import com.rubusai.app.core.network.KtorWsTransport
import com.rubusai.app.core.network.RealtimeClient
import com.rubusai.app.core.network.RealtimeClientImpl
import com.rubusai.app.core.network.createRealtimeHttpClient
import com.rubusai.app.feature.aviso.AvisoViewModel
import io.ktor.client.plugins.logging.Logger
```

Añadir esta función justo antes de `appModules`:

```kotlin
/**
 * Canal en tiempo real. Su `HttpClient` es propio (sin `Auth` ni timeout de petición) y comparte el
 * motor con los demás; el token lo da `RealtimeSession`, que pasa por el cliente principal.
 * El ámbito vive lo mismo que la app; `RealtimeHost` es quien conecta y desconecta.
 */
internal fun realtimeModule(): Module = module {
    single { RealtimeSession(auth = get(), tokenStorage = get()) }
    single<RealtimeClient> {
        val logger = get<Logger>()
        RealtimeClientImpl(
            transport = KtorWsTransport(createRealtimeHttpClient(engine = get())),
            wsUrl = get<EnvConfig>().wsUrl,
            token = get<RealtimeSession>()::freshToken,
            scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
            log = logger::log,
        )
    }
    viewModelOf(::AvisoViewModel)
}
```

y en `appModules` añadir `realtimeModule(),` como último elemento de la lista.

- [ ] **Step 4: Montar en `App.kt`**

Reemplazar el contenido de `App.kt` por:

```kotlin
package com.rubusai.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.navigation.RubusNavHost
import com.rubusai.app.core.network.RealtimeClient
import com.rubusai.app.core.realtime.RealtimeHost
import com.rubusai.app.feature.aviso.AvisoHost
import org.koin.compose.koinInject

@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()
    val sessionManager = koinInject<SessionManager>()
    val sessionState by sessionManager.state.collectAsStateWithLifecycle()

    // Idempotente: una rotación vuelve a componer `App` y no debe releer la sesión.
    LaunchedEffect(sessionManager) { sessionManager.start() }

    RubusTheme {
        Box(Modifier.fillMaxSize()) {
            RubusNavHost(environment = envConfig.environment, sessionState = sessionState)
            AvisoHost()
        }
        RealtimeHost(sessionState = sessionState, client = koinInject<RealtimeClient>())
    }
}
```

- [ ] **Step 5: Verificar todo**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, todos los tests en verde (los 300 de antes más los nuevos). Si el grafo de Koin falla porque el motor `MockEngine` no soporta WebSockets al instalar el plugin, resolver creando el `HttpClient` del WebSocket de forma perezosa dentro de `KtorWsTransport` (recibiendo el motor y creándolo en `connect`) y reportarlo.

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/App.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt
git commit -m "feat(rubus-ai-kmp): realtimeModule y montaje del WebSocket y los avisos en la raíz"
```

---

### Task 9: Documentación y spec

**Files:**
- Modify: `rubus-ai-kmp/docs/dependencias-pendientes.md`
- Modify: `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`
- Modify: `docs/superpowers/specs/2026-10-30-kmp-fase2b-realtime-design.md`

Leer cada archivo completo antes de editarlo y seguir su estilo. Editar con `Edit` usando estos anclajes.

- [ ] **Step 1: `dependencias-pendientes.md`**

1. En el párrafo «Tienen código que las usa: …», añadir `WebSockets` a la lista de Ktor (`…, `auth`, `websockets`, `logging` y los motores OkHttp y Darwin…`) y cambiar la frase final «Las demás (WebSockets de Ktor y kotlinx-datetime) están resueltas y empaquetadas en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa.» por «La otra (kotlinx-datetime) está resuelta y empaquetada en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa. Los WebSockets de Ktor se usan desde la Fase 2b (`KtorWsTransport`), probados en Android; en iOS solo se comprueba que compilan.»
2. En «Qué hacer al usar cada librería por primera vez», en el punto «**Peticiones HTTP.**», sustituir la frase `No crear otros `HttpClient`: el refresh de token solo está en este.` por `No crear otros `HttpClient` para peticiones a la API: el refresh de token solo está en este. La única excepción es el cliente del WebSocket (`createRealtimeHttpClient`), que no hace peticiones a la API: su token lo obtiene `RealtimeSession` a través de este cliente (`auth/me`).`
3. Añadir al final de la sección «Qué hacer al usar cada librería por primera vez» un punto nuevo:

```
- **Tiempo real (fase 2b).** `RealtimeHost` (raíz de la app) es el único que llama a `RealtimeClient.connect()` y `disconnect()`, siempre desde el hilo principal; conecta con sesión y la app en `RESUMED`. El token va solo en el mensaje `auth`, nunca en la URL, y los logs no incluyen mensajes del socket. Los eventos no se guardan: quien no esté suscrito cuando llegan los pierde. `analisis_listo` lleva `data.id` (id del análisis), que la 2c usará para abrir el resultado.
```

4. Añadir al final de la sección «Pendientes de la Fase 2a» (o, si no existe tal sección en ese archivo, al final del archivo) una sección **«Pendientes de la Fase 2b»** con estos puntos:
   - **Sin prueba automática del transporte.** `KtorWsTransport` solo se probó en un teléfono; probarlo exige un servidor WebSocket embebido.
   - **Avisos perdidos.** Un `analisis_listo` que llega con la app en segundo plano no se recupera al volver; lo cubre la 2c (historial) y el push FCM (Fase 6).
   - **Bandeja de notificaciones.** No existe; el backend ya persiste las notificaciones y expone `/notifications`.
   - **Eventos sin uso.** `analysis_validated` y `nueva_solicitud` llegan y se ignoran.
   - **Ping.** Solo se usa el ping del protocolo (20 s); si en producción un proxy corta sockets inactivos, evaluar un `ping` de aplicación.

- [ ] **Step 2: `roadmap-migracion-kmp.md`**

En la línea «Estado: partida en tres sub-fases…» de la Fase 2, cambiar «2b (WebSocket y aviso `analisis_listo`) y 2c (resultados y validación) sin empezar.» por «2b (WebSocket y aviso `analisis_listo`) implementada el 2026-10-30; pendiente de verificación en un teléfono Android. 2c (resultados y validación) sin empezar.» (La Tarea 10 reemplaza «pendiente» por el resultado real.)

- [ ] **Step 3: Corregir el spec**

En `docs/superpowers/specs/2026-10-30-kmp-fase2b-realtime-design.md`:
- En §1 Piezas, la viñeta de `RealtimeSession`: sustituir «y desconecta cuando `SessionManager` pasa a sin sesión» por «No observa la sesión: quien desconecta al cerrarse es `RealtimeHost`».
- En §3 Errores, la fila «`auth/me` falla con 401 sin refresh posible», columna «Qué hace»: sustituir «`SessionManager` ya la cierra y `RealtimeSession` desconecta» por «`SessionManager` ya la cierra y `RealtimeHost` desconecta».
- En §5 Pruebas, en `RealtimeSession`, sustituir «el cierre de sesión desconecta» por «lee el token después de `auth/me`» y, en `RealtimeHost`, añadir «no reconecta si solo cambia el usuario de la sesión».

- [ ] **Step 4: Verificar y commit**

Run: `git diff --stat` (solo estos 3 archivos).

```bash
git add rubus-ai-kmp/docs docs/superpowers/specs/2026-10-30-kmp-fase2b-realtime-design.md
git commit -m "docs(rubus-ai-kmp): fase 2b en dependencias y roadmap, y ajuste del spec"
```

---

### Task 10: Verificación en el teléfono y cierre (la hace el usuario)

No la ejecuta un subagente. El controlador prepara y el usuario prueba.

**Preparación** (el controlador, desde `rubus-ai-kmp/` del worktree):

- [ ] **Step 1: Suite completa y compilación iOS**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64 --rerun-tasks --console=plain`
Expected: `BUILD SUCCESSFUL`; anotar el número real de tests.

- [ ] **Step 2: Backend y dispositivo**

- Stack de Docker arriba (`docker compose ps` en la raíz del repo): `fruit-backend` en `0.0.0.0:3001`, `fruit-ms`, inferencia, Postgres y RabbitMQ sanos.
- `rubus.devHost` en `rubus-ai-kmp/local.properties` del worktree (copiar del repo principal si falta; está ignorado por git) con la IP actual del PC en la LAN.
- Teléfono con depuración inalámbrica: `adb devices`. Instalar con `./gradlew :androidApp:installDevDebug`.

**Pruebas manuales** (usuario; el controlador mira `adb logcat` y los logs de los contenedores):

- [ ] **Step 3: Aviso al terminar un análisis.** Con la app abierta, subir una foto: cuando `fruit-ms` termine debe aparecer el snackbar «¡Análisis listo!» sobre cualquier pantalla.
- [ ] **Step 4: Reconexión por red.** Con la app abierta y conectada, activar el modo avión y quitarlo: debe reconectar solo (comprobar en los logs del backend un nuevo «Cliente WebSocket autenticado»).
- [ ] **Step 5: Segundo plano.** Mandar la app a segundo plano un minuto y volver: debe reconectar. En segundo plano el backend debe registrar la desconexión.
- [ ] **Step 6: Token vencido.** Esperar más de 15 min con la app en primer plano o forzar una reconexión con el access token vencido: debe reautenticar vía `auth/me`.
- [ ] **Step 7: Cerrar sesión.** Cerrar sesión: el socket se cierra y no se reabre hasta iniciar sesión otra vez.

**Cierre** (solo con las pruebas aprobadas por el usuario y todo commiteado):

- [ ] **Step 8: Actualizar el roadmap con el resultado real.** Cambiar «pendiente de verificación en un teléfono Android» por el resultado (modelo, versión de Android, qué pasó y qué no se probó); commit `docs(rubus-ai-kmp): fase 2b verificada en un teléfono Android`.
- [ ] **Step 9: Integrar y limpiar** (según el `CLAUDE.md` global; si hay cambios sin commitear que toque el merge, o conflictos, avisar antes):

```bash
cd /home/san/Proyectos/zarza-workspace
git merge --no-ff feature/kmp-fase2b-realtime -m "Merge feature/kmp-fase2b-realtime: WebSocket y aviso analisis_listo de la Fase 2b en rubus-ai-kmp"
git worktree remove ../zarza-workspace-kmp-fase2b
git branch -d feature/kmp-fase2b-realtime
```
