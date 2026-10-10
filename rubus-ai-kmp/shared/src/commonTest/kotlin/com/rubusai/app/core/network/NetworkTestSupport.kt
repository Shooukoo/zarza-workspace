package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.platform.InMemoryTokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockEngineConfig
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respond
import io.ktor.client.plugins.logging.EMPTY
import io.ktor.client.plugins.logging.Logger
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
 * Motor falso que corre en el dispatcher del test: los handlers y `HttpTimeout` usan tiempo
 * virtual y un solo hilo, así que los tests son deterministas y pueden simular esperas con
 * `delay`.
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

/** Cliente de la app montado sobre un motor falso, con sus colaboradores a la vista. */
internal class ClientFixture(
    val client: HttpClient,
    val storage: InMemoryTokenStorage,
    val sessionEvents: SessionEvents,
)

/**
 * [handler] recibe todas las peticiones: las del cliente de la app y las de `auth/refresh`
 * que hace [TokenRefresher], porque ambos clientes comparten el motor.
 */
internal fun TestScope.clientFixture(
    tokens: AuthTokens? = AuthTokens("access-old", "refresh-old"),
    handler: MockRequestHandler,
): ClientFixture {
    val engine = mockEngine(handler)
    val storage = InMemoryTokenStorage(tokens)
    val sessionEvents = SessionEvents()
    val client = createHttpClient(
        engine = engine,
        logger = Logger.EMPTY,
        envConfig = testEnvConfig,
        tokenStorage = storage,
        tokenRefresher = TokenRefresher(createRefreshClient(engine, testEnvConfig)),
        sessionEvents = sessionEvents,
    )
    return ClientFixture(client, storage, sessionEvents)
}
