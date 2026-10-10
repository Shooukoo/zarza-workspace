package com.rubusai.app.core.di

import com.rubusai.app.core.config.Environment
import org.koin.core.KoinApplication
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration

/**
 * Único punto de arranque de Koin. Cada plataforma lo llama una vez con su entorno
 * y su módulo de plataforma; [appDeclaration] permite añadir configuración propia
 * de la plataforma (por ejemplo `androidContext`).
 */
fun initKoin(
    environment: Environment,
    devHost: String,
    platformModule: Module,
    appDeclaration: KoinAppDeclaration = {},
): KoinApplication = startKoin {
    appDeclaration()
    modules(appModules(environment, devHost) + platformModule)
}
