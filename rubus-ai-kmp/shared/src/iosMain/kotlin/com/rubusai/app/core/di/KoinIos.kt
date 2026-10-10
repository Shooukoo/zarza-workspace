package com.rubusai.app.core.di

import com.rubusai.app.core.config.Environment

/** Arranque de Koin desde Swift: `KoinIosKt.startKoinIos()`. Siempre DEV hasta la Fase 9. */
fun startKoinIos() {
    initKoin(
        environment = Environment.DEV,
        devHost = "127.0.0.1",
        platformModule = iosPlatformModule,
    )
}
