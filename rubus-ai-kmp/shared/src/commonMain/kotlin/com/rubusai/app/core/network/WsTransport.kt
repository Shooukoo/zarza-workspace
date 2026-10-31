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
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.io.IOException
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow

private const val PING_INTERVAL_MS = 20_000L

/** Una conexión WebSocket abierta. Solo transporta texto: el protocolo vive en [RealtimeClientImpl]. */
internal interface WsConnection {
    /**
     * Mensajes de texto que llegan; el flujo termina cuando el socket se cierra (o lanza si se cae con error).
     * Debe recolectarse una sola vez: es un flujo frío sobre un único canal.
     */
    val incoming: Flow<String>

    /**
     * Código de cierre que conoce el socket (puede ser el propio del cliente, o 1006 si el cierre fue anormal).
     * Solo es fiable cuando [incoming] terminó; `null` si no se sabe.
     */
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
 * El ping del plugin no aplica a todos los motores: en Android el keepalive lo da el motor OkHttp
 * (ver `PlatformModule.android.kt`).
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
        convertirCancelacionAjena {
            for (frame in session.incoming) {
                if (frame is Frame.Text) emit(frame.readText())
            }
        }
        // En iOS closeReason puede no completarse nunca: se acota para no colgar el flujo.
        code = try {
            withTimeoutOrNull(1_000) { session.closeReason.await() }?.code?.toInt()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
    }

    override suspend fun send(texto: String) = convertirCancelacionAjena { session.send(Frame.Text(texto)) }

    override suspend fun close() = session.close()

    /**
     * OkHttp/iOS lanzan `CancellationException` cuando el socket muere aunque quien llama siga activo;
     * se convierte en `IOException` para que no se confunda con una cancelación real (que sí se propaga).
     */
    private suspend inline fun <T> convertirCancelacionAjena(bloque: () -> T): T =
        try {
            bloque()
        } catch (e: CancellationException) {
            currentCoroutineContext().ensureActive()
            throw IOException(e.message, e)
        }
}
