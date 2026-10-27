package com.rubusai.app.core.config

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class EnvConfigTest {

    @Test
    fun devUsaElHostRecibido() {
        val config = EnvConfig(Environment.DEV, devHost = "192.168.1.50")

        assertEquals("http://192.168.1.50:3001/api/v1", config.apiBaseUrl)
    }

    @Test
    fun stagingIgnoraElHostDeDev() {
        val config = EnvConfig(Environment.STAGING, devHost = "192.168.1.50")

        assertEquals("https://staging.api.zarza.example/api/v1", config.apiBaseUrl)
    }

    @Test
    fun prodIgnoraElHostDeDev() {
        val config = EnvConfig(Environment.PROD, devHost = "192.168.1.50")

        assertEquals("https://api.zarza.example/api/v1", config.apiBaseUrl)
    }

    @Test
    fun prodFuncionaConHostDeDevVacio() {
        val config = EnvConfig(Environment.PROD, devHost = "")

        assertEquals(Environment.PROD, config.environment)
        assertEquals("https://api.zarza.example/api/v1", config.apiBaseUrl)
    }

    @Test
    fun devSinHostFalla() {
        assertFailsWith<IllegalArgumentException> { EnvConfig(Environment.DEV, devHost = "") }
    }
}
