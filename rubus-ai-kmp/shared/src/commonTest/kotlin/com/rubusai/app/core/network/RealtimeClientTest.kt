package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlin.coroutines.cancellation.CancellationException
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

    @Test
    fun sinAuthOkYConUnParCerradoQueNoRespondeReintentaALosDoce() = runTest {
        val transport = FakeWsTransport(testScheduler).apply { closeEndsIncoming = false }
        val client = cliente(transport)
        client.connect()
        runCurrent()

        avanzar(10_001)
        assertTrue(transport.connections[0].closed)

        avanzar(2_000)
        assertEquals(listOf(0L, 12_000L), transport.attemptTimes)
    }

    @Test
    fun unaCancelacionAjenaAlConectarSeTrataComoFalloYSeReintenta() = runTest {
        val transport = FakeWsTransport(testScheduler).apply { connectThrows = CancellationException("okhttp") }
        val client = cliente(transport)
        client.connect()
        runCurrent()

        avanzar(2_001)

        assertEquals(listOf(0L, 2_000L), transport.attemptTimes)
        assertEquals(ConnectionState.Conectando, client.state.value)
    }

    @Test
    fun unDisconnectSeguidoDeConnectReabreElSocketYVuelveAConectar() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        client.connect()
        runCurrent()
        transport.connections[0].server(AUTH_OK)
        runCurrent()

        client.disconnect()
        client.connect()
        runCurrent()

        assertTrue(transport.connections[0].closed)
        assertEquals(2, transport.connections.size)
        transport.connections[1].server(AUTH_OK)
        runCurrent()
        assertEquals(ConnectionState.Conectado, client.state.value)
    }

    @Test
    fun elCierre4001TrasUnAuthOkVuelveAPermitirUnReintentoInmediato() = runTest {
        val transport = FakeWsTransport(testScheduler)
        val client = cliente(transport)
        client.connect()
        runCurrent()
        // Gasta el reintento inmediato.
        transport.connections[0].serverClose(4001)
        runCurrent()
        // El auth_ok lo rearma.
        transport.connections[1].server(AUTH_OK)
        runCurrent()
        transport.connections[1].serverClose(4001)
        runCurrent()

        assertEquals(listOf(0L, 0L, 0L), transport.attemptTimes)
    }
}
