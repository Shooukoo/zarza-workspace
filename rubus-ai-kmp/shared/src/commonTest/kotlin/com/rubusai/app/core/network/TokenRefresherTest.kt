package com.rubusai.app.core.network

import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TestTimeSource
import kotlin.time.TimeSource
import kotlin.test.assertEquals
import kotlin.coroutines.cancellation.CancellationException
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class TokenRefresherTest {

    private fun TestScope.refresher(
        timeSource: TimeSource = TimeSource.Monotonic,
        handler: MockRequestHandler,
    ) = TokenRefresher(createRefreshClient(mockEngine(handler), testEnvConfig), timeSource)

    @Test
    fun devuelveElParNuevo() = runTest {
        val refresher = refresher {
            respondJson("""{"token":"access-new","refreshToken":"refresh-new","campoExtra":1}""")
        }

        val result = refresher.refresh("refresh-old")

        assertEquals(RefreshResult.Success(AuthTokens("access-new", "refresh-new")), result)
    }

    @Test
    fun enviaElRefreshTokenEnElCuerpoYSinCabeceraDeAutorizacion() = runTest {
        var method: HttpMethod? = null
        var url: String? = null
        var body: String? = null
        var authorization: String? = "sin asignar"
        val refresher = refresher { request ->
            method = request.method
            url = request.url.toString()
            body = request.body.toByteArray().decodeToString()
            authorization = request.headers[HttpHeaders.Authorization]
            respondNewTokens()
        }

        refresher.refresh("refresh-old")

        assertEquals(HttpMethod.Post, method)
        assertEquals("$TEST_BASE_URL/auth/refresh", url)
        assertEquals("""{"refreshToken":"refresh-old"}""", body)
        assertNull(authorization)
    }

    @Test
    fun un401EsSesionRechazada() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.Unauthorized) }

        assertEquals(RefreshResult.Rejected, refresher.refresh("refresh-old"))
    }

    @Test
    fun un400EsFalloTransitorio() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.BadRequest) }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun un403EsFalloTransitorio() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.Forbidden) }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun un429EsFalloTransitorio() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.TooManyRequests) }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun un500EsFalloTransitorio() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.InternalServerError) }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun unErrorDeRedEsFalloTransitorio() = runTest {
        val refresher = refresher { throw FakeNetworkException() }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun un200ConCuerpoIlegibleEsFalloTransitorio() = runTest {
        val refresher = refresher { respondJson("""{"inesperado":true}""") }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun unTimeoutEsFalloTransitorio() = runTest {
        val refresher = refresher {
            delay(31_000)
            respondNewTokens()
        }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun unaCancellationExceptionDelMotorEsFalloTransitorio() = runTest {
        val refresher = refresher { throw CancellationException("motor") }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun siSeCancelaQuienLlamaLaCancelacionSePropaga() = runTest {
        var result: RefreshResult? = null
        val refresher = refresher { awaitCancellation() }
        val job = launch { result = refresher.refresh("refresh-old") }
        runCurrent()

        job.cancel()
        job.join()

        assertTrue(job.isCancelled)
        assertNull(result)
    }

    @Test
    fun unFalloTransitorioNoSeRepiteDentroDeLaVentana() = runTest {
        var calls = 0
        val time = TestTimeSource()
        val refresher = refresher(time) {
            calls++
            respondError(HttpStatusCode.ServiceUnavailable)
        }

        val first = refresher.refresh("refresh-old")
        time += 4.seconds
        val second = refresher.refresh("refresh-old")

        assertEquals(RefreshResult.TransientFailure, first)
        assertEquals(RefreshResult.TransientFailure, second)
        assertEquals(1, calls)
    }

    @Test
    fun pasadaLaVentanaSeVuelveAIntentar() = runTest {
        var calls = 0
        val time = TestTimeSource()
        val refresher = refresher(time) {
            calls++
            respondError(HttpStatusCode.ServiceUnavailable)
        }

        refresher.refresh("refresh-old")
        time += 6.seconds
        refresher.refresh("refresh-old")

        assertEquals(2, calls)
    }

    @Test
    fun otroRefreshTokenNoQuedaBloqueado() = runTest {
        var calls = 0
        val refresher = refresher(TestTimeSource()) {
            calls++
            respondError(HttpStatusCode.ServiceUnavailable)
        }

        refresher.refresh("refresh-a")
        refresher.refresh("refresh-b")

        assertEquals(2, calls)
    }

    @Test
    fun unRechazoNoSeRecuerda() = runTest {
        var calls = 0
        val refresher = refresher(TestTimeSource()) {
            calls++
            respondError(HttpStatusCode.Unauthorized)
        }

        assertEquals(RefreshResult.Rejected, refresher.refresh("refresh-old"))
        assertEquals(RefreshResult.Rejected, refresher.refresh("refresh-old"))
        assertEquals(2, calls)
    }
}
