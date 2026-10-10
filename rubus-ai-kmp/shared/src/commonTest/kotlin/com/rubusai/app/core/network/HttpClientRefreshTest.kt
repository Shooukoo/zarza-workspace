package com.rubusai.app.core.network

import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.plugins.logging.EMPTY
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.TextContent
import io.ktor.http.headersOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
class HttpClientRefreshTest {

    private val oldTokens = AuthTokens("access-old", "refresh-old")
    private val newTokens = AuthTokens("access-new", "refresh-new")

    private fun HttpRequestData.isRefresh() = url.encodedPath.endsWith("/auth/refresh")
    private fun HttpRequestData.authorization() = headers[HttpHeaders.Authorization]

    /** 200 si la petición trae el token nuevo; si no, [unauthorized]. */
    private fun MockRequestHandleScope.okOnlyWithNewToken(
        request: HttpRequestData,
        unauthorized: MockRequestHandleScope.() -> HttpResponseData = {
            respondError(HttpStatusCode.Unauthorized)
        },
    ): HttpResponseData =
        if (request.authorization() == "Bearer access-new") respondOk() else unauthorized()

    private fun TestScope.collectExpired(events: SessionEvents): List<Unit> {
        val received = mutableListOf<Unit>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            events.expired.toList(received)
        }
        return received
    }

    // Test 2 de la spec.
    @Test
    fun un401RefrescaGuardaElParNuevoYReintentaUnaVez() = runTest {
        val dataRequests = mutableListOf<HttpRequestData>()
        var refreshCalls = 0
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                dataRequests += request
                okOnlyWithNewToken(request) {
                    respond(
                        content = "",
                        status = HttpStatusCode.Unauthorized,
                        headers = headersOf(HttpHeaders.WWWAuthenticate, "Bearer"),
                    )
                }
            }
        }

        val response = fixture.client.get("analyses")

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(1, refreshCalls)
        assertEquals(newTokens, fixture.storage.read())
        assertEquals(
            listOf("Bearer access-old", "Bearer access-new"),
            dataRequests.map { it.authorization() },
        )
    }

    // Test 3 de la spec: el backend real no envía WWW-Authenticate.
    @Test
    fun un401SinWwwAuthenticateTambienRefresca() = runTest {
        var dataCalls = 0
        var refreshCalls = 0
        var unauthorizedHadHeader: Boolean? = null
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                dataCalls++
                okOnlyWithNewToken(request) {
                    respondError(HttpStatusCode.Unauthorized).also {
                        unauthorizedHadHeader = it.headers.contains(HttpHeaders.WWWAuthenticate)
                    }
                }
            }
        }

        val response = fixture.client.get("analyses")

        assertEquals(false, unauthorizedHadHeader)
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(1, refreshCalls)
        assertEquals(2, dataCalls)
        assertEquals(newTokens, fixture.storage.read())
    }

    @Test
    fun siElReintentoTambienDa401NoHaySegundoRefresh() = runTest {
        var dataCalls = 0
        var refreshCalls = 0
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                dataCalls++
                respondError(HttpStatusCode.Unauthorized)
            }
        }

        val error = assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(HttpStatusCode.Unauthorized, error.response.status)
        assertEquals(1, refreshCalls)
        assertEquals(2, dataCalls)
    }

    // Test 4 de la spec.
    @Test
    fun tres401SimultaneosProducenUnSoloRefresh() = runTest {
        var refreshCalls = 0
        val authorizations = mutableListOf<String?>()
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                delay(1_000)
                respondNewTokens()
            } else {
                authorizations += request.authorization()
                okOnlyWithNewToken(request)
            }
        }

        val responses = listOf("analyses", "campos", "solicitudes")
            .map { path -> async { fixture.client.get(path) } }
            .awaitAll()

        assertEquals(List(3) { HttpStatusCode.OK }, responses.map { it.status })
        assertEquals(1, refreshCalls)
        assertEquals(newTokens, fixture.storage.read())
        // Las tres salieron con el token viejo antes de que terminara el refresh.
        assertEquals<List<String?>>(
            List(3) { "Bearer access-old" } + List(3) { "Bearer access-new" },
            authorizations,
        )
    }

    @Test
    fun cancelarLaPeticionDuranteElRefreshNoPierdeElParNuevo() = runTest {
        val refreshBodies = mutableListOf<String>()
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshBodies += (request.body as TextContent).text
                delay(1_000)
                respondNewTokens()
            } else {
                okOnlyWithNewToken(request)
            }
        }

        val job = launch { fixture.client.get("analyses") }
        runCurrent()
        advanceTimeBy(500)
        // El refresh está en curso: el backend ya lo recibió y todavía no ha respondido.
        assertEquals(1, refreshBodies.size)
        job.cancel()
        advanceUntilIdle()

        assertTrue(job.isCancelled)
        assertEquals(1, refreshBodies.size)
        assertTrue(refreshBodies.single().contains("refresh-old"))
        assertEquals(newTokens, fixture.storage.read())

        val response = fixture.client.get("campos")

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(1, refreshBodies.size)
    }

    @Test
    fun un401ConUnTokenQueYaSeRenovoNoVuelveARefrescar() = runTest {
        var refreshCalls = 0
        val authorizations = mutableListOf<String?>()
        lateinit var fixture: ClientFixture
        fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                authorizations += request.authorization()
                // Otra petición renueva la sesión justo antes de que llegue este 401.
                if (authorizations.size == 1) fixture.storage.save(newTokens)
                okOnlyWithNewToken(request)
            }
        }

        val response = fixture.client.get("analyses")

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(0, refreshCalls)
        assertEquals(listOf<String?>("Bearer access-old", "Bearer access-new"), authorizations)
        assertEquals(newTokens, fixture.storage.read())
    }

    // Test 5 de la spec.
    @Test
    fun refreshRechazadoBorraLaSesionYEmiteElEvento() = runTest {
        val fixture = clientFixture(oldTokens) { respondError(HttpStatusCode.Unauthorized) }
        val expired = collectExpired(fixture.sessionEvents)

        val error = assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(HttpStatusCode.Unauthorized, error.response.status)
        assertNull(fixture.storage.read())
        assertEquals(1, expired.size)
    }

    @Test
    fun siBorrarLaSesionFallaTambienSeEmiteElEvento() = runTest {
        val engine = mockEngine { respondError(HttpStatusCode.Unauthorized) }
        val sessionEvents = SessionEvents()
        val client = createHttpClient(
            engine = engine,
            logger = Logger.EMPTY,
            envConfig = testEnvConfig,
            tokenStorage = StorageQueNoBorra(oldTokens),
            tokenRefresher = TokenRefresher(createRefreshClient(engine, testEnvConfig)),
            sessionEvents = sessionEvents,
        )
        val expired = collectExpired(sessionEvents)

        // Quien llama ve el fallo del almacenamiento, no el 401.
        assertFailsWith<IllegalStateException> { client.get("analyses") }

        assertEquals(1, expired.size)
    }

    // Test 6 de la spec, error de red.
    @Test
    fun refreshConErrorDeRedConservaLaSesion() = runTest {
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) throw FakeNetworkException()
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    // Test 6 de la spec, 429.
    @Test
    fun refreshCon429ConservaLaSesion() = runTest {
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                respondError(HttpStatusCode.TooManyRequests)
            } else {
                respondError(HttpStatusCode.Unauthorized)
            }
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    // Test 7 de la spec, parte del refresh.
    @Test
    fun un401EnLasRutasDeAuthNoDisparaRefresh() = runTest {
        val paths = mutableListOf<String>()
        val authorizations = mutableListOf<String?>()
        val fixture = clientFixture(oldTokens) { request ->
            paths += request.url.encodedPath
            authorizations += request.authorization()
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.post("auth/login") }
        assertFailsWith<ClientRequestException> { fixture.client.post("auth/refresh") }

        assertEquals(listOf("/api/v1/auth/login", "/api/v1/auth/refresh"), paths)
        assertEquals(listOf<String?>(null, null), authorizations)
        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    @Test
    fun un401DeOtroHostNoSeReintentaNiDisparaRefresh() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(oldTokens) { request ->
            requests += request
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> {
            fixture.client.get("https://bucket.example.com/img.jpg")
        }

        assertEquals("bucket.example.com", requests.single().url.host)
        assertNull(requests.single().authorization())
        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    @Test
    fun un401SinTokensGuardadosNoLlamaAlRefresh() = runTest {
        val paths = mutableListOf<String>()
        val fixture = clientFixture(tokens = null) { request ->
            paths += request.url.encodedPath
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(listOf("/api/v1/analyses"), paths)
        assertEquals(0, expired.size)
    }
}

/** Almacenamiento que siempre devuelve [tokens] y falla al borrar. */
private class StorageQueNoBorra(private val tokens: AuthTokens) : SecureTokenStorage {
    override suspend fun read(): AuthTokens = tokens

    override suspend fun save(tokens: AuthTokens) = Unit

    override suspend fun clear(): Unit = throw IllegalStateException("disco")
}
