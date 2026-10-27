package com.rubusai.app.core.di

import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.darwin.Darwin
import io.ktor.client.plugins.logging.Logger
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Implementaciones de `core/platform` y piezas de red propias de iOS.
 * La sesión se guarda en memoria y se pierde al cerrar la app hasta que exista
 * la implementación con Keychain (fase 9).
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun iosPlatformModule(): Module = module {
    single<HttpClientEngine> { Darwin.create() }
    single<Logger> {
        object : Logger {
            override fun log(message: String) = println(message)
        }
    }
    single<SecureTokenStorage> { InMemoryTokenStorage() }
}
