package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import org.koin.core.module.Module
import org.koin.dsl.module

fun configModule(environment: Environment, devHost: String): Module = module {
    single { EnvConfig(environment, devHost) }
}

val networkModule = module { }
val databaseModule = module { }
val repositoryModule = module { }
val viewModelModule = module { }

fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule,
    databaseModule,
    repositoryModule,
    viewModelModule,
)
