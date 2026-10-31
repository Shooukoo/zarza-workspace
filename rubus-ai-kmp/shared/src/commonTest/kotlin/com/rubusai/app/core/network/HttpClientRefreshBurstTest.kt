package com.rubusai.app.core.network

import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runTest

class HttpClientRefreshBurstTest {

    @Test
    fun variasPeticionesConUnRefreshTransitorioFallidoHacenUnaSolaLlamadaARefresh() = runTest {
        var refreshCalls = 0
        val fixture = clientFixture { request ->
            if (request.url.encodedPath.endsWith("/auth/refresh")) {
                refreshCalls++
                respondError(HttpStatusCode.ServiceUnavailable)
            } else {
                respondError(HttpStatusCode.Unauthorized)
            }
        }

        val results = (1..3).map { async { runCatching { fixture.client.get("analyses") } } }.awaitAll()

        assertEquals(1, refreshCalls)
        assertTrue(results.all { it.exceptionOrNull() is ClientRequestException })
        // La sesión se conserva: un fallo transitorio no la cierra.
        assertEquals(AuthTokens("access-old", "refresh-old"), fixture.storage.read())
    }
}
