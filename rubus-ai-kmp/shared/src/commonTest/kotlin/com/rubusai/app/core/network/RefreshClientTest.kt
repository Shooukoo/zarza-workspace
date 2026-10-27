package com.rubusai.app.core.network

import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.Serializable

@Serializable
private data class CuerpoDePrueba(val nombre: String)

class RefreshClientTest {

    /** Hace una petición con el cliente de refresh y devuelve lo que recibió el motor. */
    private suspend fun TestScope.capturar(peticion: suspend HttpClient.() -> Unit): HttpRequestData {
        var capturada: HttpRequestData? = null
        val client = createRefreshClient(
            mockEngine { request ->
                capturada = request
                respondOk()
            },
            testEnvConfig,
        )

        client.peticion()

        return assertNotNull(capturada)
    }

    private fun assertSinContentType(request: HttpRequestData) {
        assertNull(request.headers[HttpHeaders.ContentType])
        assertNull(request.body.contentType)
    }

    @Test
    fun unPostSinCuerpoNoLlevaContentType() = runTest {
        val request = capturar { post("auth/logout") }

        assertSinContentType(request)
    }

    @Test
    fun unGetSinCuerpoNoLlevaContentType() = runTest {
        val request = capturar { get("health") }

        assertSinContentType(request)
    }

    @Test
    fun unDeleteSinCuerpoNoLlevaContentType() = runTest {
        val request = capturar { delete("campos/1") }

        assertSinContentType(request)
    }

    @Test
    fun unPostConCuerpoSaleComoJson() = runTest {
        val request = capturar { post("campos") { setBody(CuerpoDePrueba("norte")) } }

        assertEquals(ContentType.Application.Json, request.body.contentType?.withoutParameters())
    }
}
