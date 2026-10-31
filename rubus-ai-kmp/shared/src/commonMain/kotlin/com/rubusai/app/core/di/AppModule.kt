package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.data.auth.AuthRepositoryImpl
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposRepositoryImpl
import com.rubusai.app.core.data.ingestion.IngestionRepository
import com.rubusai.app.core.data.ingestion.IngestionRepositoryImpl
import com.rubusai.app.core.data.realtime.RealtimeSession
import com.rubusai.app.core.network.KtorWsTransport
import com.rubusai.app.core.network.RealtimeClient
import com.rubusai.app.core.network.RealtimeClientImpl
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.network.createHttpClient
import com.rubusai.app.core.network.createRealtimeHttpClient
import com.rubusai.app.core.network.createRefreshClient
import com.rubusai.app.feature.auth.LoginViewModel
import com.rubusai.app.feature.aviso.AvisoViewModel
import com.rubusai.app.feature.capture.CaptureViewModel
import com.rubusai.app.feature.home.HomeViewModel
import io.ktor.client.plugins.logging.Logger
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModel
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module

internal fun configModule(environment: Environment, devHost: String): Module {
    // Se crea aquí y no dentro del `single` para que una configuración inválida
    // falle en el arranque y no en la primera inyección.
    val config = EnvConfig(environment, devHost)
    return module { single { config } }
}

/**
 * Cliente HTTP de la app y sus colaboradores. El motor, el `Logger` de Ktor y
 * `SecureTokenStorage` los aporta el módulo de cada plataforma.
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun networkModule(): Module = module {
    single { SessionEvents() }
    // Su cliente no se registra en el grafo: solo debe usarlo TokenRefresher.
    single { TokenRefresher(createRefreshClient(engine = get(), envConfig = get())) }
    single {
        createHttpClient(
            engine = get(),
            logger = get(),
            envConfig = get(),
            tokenStorage = get(),
            tokenRefresher = get(),
            sessionEvents = get(),
        )
    }
}

/**
 * Sesión: repositorio y `SessionManager`. Cada módulo de plataforma aporta `UserStorage`.
 * El ámbito del `SessionManager` vive lo mismo que la app, para escuchar `SessionEvents.expired`
 * todo el tiempo.
 */
internal fun authModule(): Module = module {
    single<AuthRepository> { AuthRepositoryImpl(client = get()) }
    single {
        SessionManager(
            repository = get(),
            tokenStorage = get(),
            userStorage = get(),
            sessionEvents = get(),
            scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
        )
    }
    viewModelOf(::LoginViewModel)
    viewModelOf(::HomeViewModel)
}

/** Captura: repositorios de campos e ingestión y el `ViewModel`. El compresor y el GPS los aporta cada plataforma. */
internal fun captureModule(): Module = module {
    single<CamposRepository> { CamposRepositoryImpl(client = get()) }
    single<IngestionRepository> { IngestionRepositoryImpl(client = get()) }
    viewModel { CaptureViewModel(campos = get(), ingestion = get(), compressor = get(), location = get()) }
}

/**
 * Canal en tiempo real. Su `HttpClient` es propio (sin `Auth` ni timeout de petición) y comparte el
 * motor con los demás; el token lo da `RealtimeSession`, que pasa por el cliente principal.
 * El ámbito vive lo mismo que la app; `RealtimeHost` es quien conecta y desconecta.
 */
internal fun realtimeModule(): Module = module {
    single { RealtimeSession(auth = get(), tokenStorage = get()) }
    single<RealtimeClient> {
        val logger = get<Logger>()
        RealtimeClientImpl(
            transport = KtorWsTransport(createRealtimeHttpClient(engine = get())),
            wsUrl = get<EnvConfig>().wsUrl,
            token = get<RealtimeSession>()::freshToken,
            scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
            log = logger::log,
        )
    }
    viewModelOf(::AvisoViewModel)
}

internal fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule(),
    authModule(),
    captureModule(),
    realtimeModule(),
)
