package com.rubusai.app.core.network

import io.ktor.client.engine.mock.respondOk
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.HttpHeaders
import io.ktor.http.Url
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

class HttpClientTest {

    // Test 1 de la spec.
    @Test
    fun unaPeticionAutenticadaLlevaElTokenDeAcceso() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("analyses")

        assertEquals("Bearer access-old", requests.single().headers[HttpHeaders.Authorization])
    }

    @Test
    fun sinTokensLaPeticionSaleSinCabecera() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(tokens = null) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("health")

        assertNull(requests.single().headers[HttpHeaders.Authorization])
    }

    @Test
    fun usaLosTokensGuardadosDespuesDeCrearElCliente() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(tokens = null) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("health")
        fixture.storage.save(AuthTokens("access-login", "refresh-login"))
        fixture.client.get("analyses")

        assertNull(requests[0].headers[HttpHeaders.Authorization])
        assertEquals("Bearer access-login", requests[1].headers[HttpHeaders.Authorization])
    }

    @Test
    fun usaElParGuardadoMasRecienteEnCadaPeticion() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("analyses")
        fixture.storage.save(AuthTokens("access-login", "refresh-login"))
        fixture.client.get("analyses")
        fixture.storage.clear()
        fixture.client.get("analyses")

        assertEquals(
            listOf("Bearer access-old", "Bearer access-login", null),
            requests.map { it.headers[HttpHeaders.Authorization] },
        )
    }

    @Test
    fun unaUrlDeOtroHostSaleSinCabecera() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("https://bucket.example.com/img.jpg?firma=abc")

        assertNull(requests.single().headers[HttpHeaders.Authorization])
        assertEquals("bucket.example.com", requests.single().url.host)
    }

    @Test
    fun unaUrlDelMismoHostFueraDeLaBaseSaleSinCabecera() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("http://10.0.2.2:3001/health")

        assertNull(requests.single().headers[HttpHeaders.Authorization])
    }

    @Test
    fun unaUrlAbsolutaDeLaApiLlevaElToken() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("$TEST_BASE_URL/analyses")

        assertEquals("Bearer access-old", requests.single().headers[HttpHeaders.Authorization])
    }

    // Test 7 de la spec, parte de la cabecera.
    @Test
    fun lasRutasDeAuthSalenSinCabecera() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.post("auth/login")
        fixture.client.post("auth/refresh")

        assertEquals(2, requests.size)
        assertNull(requests[0].headers[HttpHeaders.Authorization])
        assertNull(requests[1].headers[HttpHeaders.Authorization])
    }

    // Test 8 de la spec.
    @Test
    fun lasRutasRelativasSeResuelvenSobreLaUrlBase() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(tokens = null) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("health")

        assertEquals("$TEST_BASE_URL/health", requests.single().url.toString())
    }

    @Test
    fun isAuthRouteSoloReconoceLoginYRefreshBajoLaBase() {
        assertTrue(isAuthRoute("/api/v1/auth/login", basePath = "/api/v1/"))
        assertTrue(isAuthRoute("/api/v1/auth/refresh", basePath = "/api/v1/"))
        assertFalse(isAuthRoute("/api/v1/auth/me", basePath = "/api/v1/"))
        assertFalse(isAuthRoute("/api/v1/analyses", basePath = "/api/v1/"))
        assertFalse(isAuthRoute("/otra/auth/login", basePath = "/api/v1/"))
    }

    @Test
    fun needsBearerSoloParaLaApiSalvoLoginYRefresh() {
        val base = Url("$TEST_BASE_URL/")

        assertTrue(needsBearer(Url("$TEST_BASE_URL/analyses"), base))
        assertTrue(needsBearer(Url("$TEST_BASE_URL/auth/me"), base))
        assertFalse(needsBearer(Url("$TEST_BASE_URL/auth/login"), base))
        assertFalse(needsBearer(Url("$TEST_BASE_URL/auth/refresh"), base))
        // Otro host, otro puerto y fuera de la ruta base.
        assertFalse(needsBearer(Url("http://bucket.example.com:3001/api/v1/analyses"), base))
        assertFalse(needsBearer(Url("http://10.0.2.2:9000/api/v1/analyses"), base))
        assertFalse(needsBearer(Url("http://10.0.2.2:3001/health"), base))
        // Otro esquema con el mismo puerto escrito.
        assertFalse(needsBearer(Url("https://10.0.2.2:3001/api/v1/analyses"), base))
        // El host no distingue mayúsculas de minúsculas.
        assertTrue(
            needsBearer(Url("https://API.Example.com/api/v1/analyses"), Url("https://api.example.com/api/v1/")),
        )
        // El puerto por defecto del esquema cuenta igual escrito o sin escribir.
        assertTrue(
            needsBearer(Url("https://api.example.com:443/api/v1/analyses"), Url("https://api.example.com/api/v1/")),
        )
    }

    @Test
    fun unPostSinCuerpoNoLlevaContentType() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.post("auth/logout")

        assertNull(requests.single().headers[HttpHeaders.ContentType])
        assertNull(requests.single().body.contentType)
        assertEquals("Bearer access-old", requests.single().headers[HttpHeaders.Authorization])
    }
}
