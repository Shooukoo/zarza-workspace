package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.network.mockEngine
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.plugins.logging.EMPTY
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.request.get
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertSame
import kotlinx.coroutines.test.runTest
import org.koin.dsl.koinApplication
import org.koin.dsl.module

class KoinGraphTest {

    @Test
    fun elGrafoResuelveEnvConfigConElEntornoRecibido() {
        val platformModule = module { }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val config = app.koin.get<EnvConfig>()

            assertEquals(Environment.DEV, config.environment)
            assertEquals("http://10.0.2.2:3001/api/v1", config.apiBaseUrl)
        } finally {
            app.close()
        }
    }

    @Test
    fun configModuleFallaAlCrearseSiFaltaElHostEnDev() {
        assertFailsWith<IllegalArgumentException> { configModule(Environment.DEV, devHost = "") }
    }

    @Test
    fun elGrafoResuelveElHttpClientConUnModuloDePlataformaDePrueba() = runTest {
        // mockEngine y no MockEngine { }: responde en el dispatcher del test.
        val authorizations = mutableListOf<String?>()
        val engine = mockEngine { request ->
            authorizations += request.headers[HttpHeaders.Authorization]
            respondOk()
        }
        val platformModule = module {
            single<HttpClientEngine> { engine }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage(AuthTokens("access-old", "refresh-old")) }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val client = app.koin.get<HttpClient>()

            assertSame(client, app.koin.get<HttpClient>())
            app.koin.get<SessionEvents>()
            app.koin.get<TokenRefresher>()
            assertEquals(HttpStatusCode.OK, client.get("health").status)
            // Prueba que el cliente está conectado con el almacenamiento de sesión.
            assertEquals(listOf<String?>("Bearer access-old"), authorizations)
        } finally {
            app.close()
        }
    }
}
