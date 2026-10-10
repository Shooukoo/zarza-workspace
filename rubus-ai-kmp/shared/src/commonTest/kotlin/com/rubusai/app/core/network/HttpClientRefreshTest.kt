package com.rubusai.app.core.network

import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
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
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                okOnlyWithNewToken(request)
            }
        }

        val responses = listOf("analyses", "campos", "solicitudes")
            .map { path -> async { fixture.client.get(path) } }
            .awaitAll()

        assertEquals(List(3) { HttpStatusCode.OK }, responses.map { it.status })
        assertEquals(1, refreshCalls)
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
