package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpHeaders
import io.ktor.http.headersOf
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlinx.coroutines.test.runTest
import kotlinx.serialization.Serializable

/** Guarda los mensajes del registro para poder inspeccionarlos. */
private class CapturingLogger : Logger {
    val messages = mutableListOf<String>()

    override fun log(message: String) {
        messages += message
    }
}

@Serializable
private data class CuerpoConToken(val refreshToken: String)

class HttpClientLoggingTest {

    @Test
    fun enDevNoSeRegistranLosTokens() = runTest {
        val logger = CapturingLogger()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old"), logger = logger) {
            respond(
                content = """{"token":"access-new","refreshToken":"refresh-new"}""",
                headers = headersOf(
                    HttpHeaders.ContentType to listOf("application/json"),
                    HttpHeaders.SetCookie to listOf("access_token=access-cookie; HttpOnly"),
                ),
            )
        }

        fixture.client.post("analyses") {
            header(HttpHeaders.Cookie, "refresh_token=refresh-cookie")
            setBody(CuerpoConToken("refresh-old"))
        }

        val log = logger.messages.joinToString("\n")
        assertContains(log, "/api/v1/analyses")
        listOf(
            "access-old",
            "access-cookie",
            "refresh-cookie",
            "refresh-old",
            "access-new",
            "refresh-new",
        ).forEach { secreto ->
            assertFalse(secreto in log, "El registro contiene «$secreto»:\n$log")
        }
    }

    @Test
    fun unaCabeceraAuthorizationEnMinusculasTambienSeEnmascara() = runTest {
        val logger = CapturingLogger()
        val fixture = clientFixture(tokens = null, logger = logger) { respondOk() }

        fixture.client.get("analyses") {
            header("authorization", "Bearer access-manual")
        }

        val log = logger.messages.joinToString("\n")
        assertContains(log, "/api/v1/analyses")
        assertFalse("access-manual" in log, "El registro contiene el token:\n$log")
    }

    @Test
    fun fueraDeDevNoSeRegistraNada() = runTest {
        listOf(Environment.STAGING, Environment.PROD).forEach { environment ->
            val logger = CapturingLogger()
            val fixture = clientFixture(
                logger = logger,
                envConfig = EnvConfig(environment, devHost = ""),
            ) { respondOk() }

            fixture.client.get("analyses")

            assertEquals(emptyList(), logger.messages, "Se registró algo en $environment")
        }
    }
}
