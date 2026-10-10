package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockEngineConfig
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope

internal const val TEST_BASE_URL = "http://10.0.2.2:3001/api/v1"

internal val testEnvConfig = EnvConfig(Environment.DEV, devHost = "10.0.2.2")

/** Error que lanza el motor falso para simular que no hay red. */
internal class FakeNetworkException : Exception("sin red")

/**
 * Motor falso que responde en el dispatcher del test. Si respondiera en `Dispatchers.IO`,
 * el tiempo virtual de `runTest` podría disparar los timeouts de `HttpTimeout`.
 */
internal fun TestScope.mockEngine(handler: MockRequestHandler): MockEngine =
    MockEngine(
        MockEngineConfig().apply {
            dispatcher = StandardTestDispatcher(testScheduler)
            addHandler(handler)
        },
    )

internal fun MockRequestHandleScope.respondJson(
    body: String,
    status: HttpStatusCode = HttpStatusCode.OK,
): HttpResponseData = respond(
    content = body,
    status = status,
    headers = headersOf(HttpHeaders.ContentType, "application/json"),
)

/** Respuesta de `auth/refresh` con un par nuevo. */
internal fun MockRequestHandleScope.respondNewTokens(): HttpResponseData =
    respondJson("""{"token":"access-new","refreshToken":"refresh-new"}""")
