package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.data.auth.TOKENS
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.network.mockEngine
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
import com.rubusai.app.core.platform.UserStorage
import com.rubusai.app.feature.auth.LoginViewModel
import com.rubusai.app.feature.capture.CaptureViewModel
import com.rubusai.app.feature.capture.FakeImageCompressor
import com.rubusai.app.feature.capture.FakeLocationProvider
import com.rubusai.app.feature.home.HomeViewModel
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
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeout
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
    fun elGrafoResuelveElSessionManagerComoUnicaInstancia() = runTest {
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val manager = app.koin.get<SessionManager>()

            assertSame(manager, app.koin.get<SessionManager>())
            app.koin.get<AuthRepository>()
            app.koin.get<LoginViewModel>()
            app.koin.get<HomeViewModel>()
        } finally {
            app.close()
        }
    }

    @Test
    fun elGrafoResuelveElLoginViewModel() = runTest {
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            app.koin.get<LoginViewModel>()
        } finally {
            app.close()
        }
    }

    @Test
    fun sessionEventsEsUnaUnicaInstanciaCompartidaPorElSessionManager() = runTest {
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage(TOKENS) }
            single<UserStorage> { InMemoryUserStorage(ana) }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            assertSame(app.koin.get<SessionEvents>(), app.koin.get<SessionEvents>())
            val manager = app.koin.get<SessionManager>()
            manager.start()
            assertEquals(SessionState.Authenticated(ana), manager.state.value)

            // El manager escucha en Dispatchers.Default: se espera en tiempo real, no virtual.
            app.koin.get<SessionEvents>().notifyExpired()

            val state = withContext(Dispatchers.Default) {
                withTimeout(5_000) { manager.state.first { it is SessionState.Unauthenticated } }
            }
            assertEquals(SessionState.Unauthenticated(expired = true), state)
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

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun elGrafoResuelveElViewModelDeCaptura() = runTest {
        // `CaptureViewModel` lanza en `viewModelScope` al crearse: necesita un `Main`.
        Dispatchers.setMain(StandardTestDispatcher())
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
            single<ImageCompressor> { FakeImageCompressor() }
            single<LocationProvider> { FakeLocationProvider() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            app.koin.get<CaptureViewModel>()
        } finally {
            app.close()
            Dispatchers.resetMain()
        }
    }
}
