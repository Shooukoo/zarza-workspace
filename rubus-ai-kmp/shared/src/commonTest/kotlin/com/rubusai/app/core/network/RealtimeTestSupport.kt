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

/**
 * Conexión falsa: el test hace de servidor con [server] y [serverClose]. Con [closeEndsIncoming] en
 * false, [close] no termina la lectura: simula un par que no responde al Close (como OkHttp).
 */
internal class FakeWsConnection(private val closeEndsIncoming: Boolean = true) : WsConnection {
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
        if (closeEndsIncoming) channel.close()
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

/**
 * Transporte falso: registra cada intento (con el tiempo virtual) y puede fallar los primeros
 * [failures]; [connectThrows] hace fallar con esa excepción solo el siguiente intento.
 */
internal class FakeWsTransport(private val scheduler: TestCoroutineScheduler) : WsTransport {
    val connections = mutableListOf<FakeWsConnection>()
    val attemptTimes = mutableListOf<Long>()
    val urls = mutableListOf<String>()
    var failures = 0
    var connectThrows: Throwable? = null
    var closeEndsIncoming = true

    override suspend fun connect(url: String): WsConnection {
        attemptTimes += scheduler.currentTime
        urls += url
        connectThrows?.let { connectThrows = null; throw it }
        if (failures > 0) {
            failures--
            throw FakeNetworkException()
        }
        return FakeWsConnection(closeEndsIncoming).also { connections += it }
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
