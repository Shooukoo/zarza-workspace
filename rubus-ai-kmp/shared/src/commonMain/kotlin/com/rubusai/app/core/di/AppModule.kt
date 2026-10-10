package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.network.createHttpClient
import com.rubusai.app.core.network.createRefreshClient
import org.koin.core.module.Module
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

internal val databaseModule: Module = module { }
internal val repositoryModule: Module = module { }
internal val viewModelModule: Module = module { }

internal fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule(),
    databaseModule,
    repositoryModule,
    viewModelModule,
)
