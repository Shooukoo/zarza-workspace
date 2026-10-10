package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.koin.core.context.stopKoin
import org.koin.dsl.module

class KoinInitTest {
    private class Marker

    // startKoin registra el contexto global antes de ejecutar la declaración, así que
    // hay que pararlo aunque el test falle a mitad.
    @AfterTest
    fun tearDown() = stopKoin()

    @Test
    fun initKoinCargaLosModulosDeAppYElDePlataforma() {
        var declared = false
        val platformModule = module { single { Marker() } }

        val app = initKoin(Environment.DEV, devHost = "10.0.2.2", platformModule = platformModule) {
            declared = true
        }

        assertTrue(declared)
        assertEquals("http://10.0.2.2:3001/api/v1", app.koin.get<EnvConfig>().apiBaseUrl)
        app.koin.get<Marker>()
    }
}
