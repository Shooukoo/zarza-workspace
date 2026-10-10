package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import org.koin.core.module.Module
import org.koin.dsl.module

internal fun configModule(environment: Environment, devHost: String): Module {
    // Se crea aquí y no dentro del `single` para que una configuración inválida
    // falle en el arranque y no en la primera inyección.
    val config = EnvConfig(environment, devHost)
    return module { single { config } }
}

internal val networkModule: Module = module { }
internal val databaseModule: Module = module { }
internal val repositoryModule: Module = module { }
internal val viewModelModule: Module = module { }

internal fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule,
    databaseModule,
    repositoryModule,
    viewModelModule,
)
