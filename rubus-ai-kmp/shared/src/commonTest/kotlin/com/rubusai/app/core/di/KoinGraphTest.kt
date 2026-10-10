package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import kotlin.test.Test
import kotlin.test.assertEquals
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
}
