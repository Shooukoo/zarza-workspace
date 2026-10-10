package com.rubusai.app.core.config

import kotlin.test.Test
import kotlin.test.assertEquals

class EnvConfigTest {

    @Test
    fun devUsaElHostRecibido() {
        val config = EnvConfig(Environment.DEV, devHost = "192.168.1.50")

        assertEquals("http://192.168.1.50:3001/api/v1", config.apiBaseUrl)
        assertEquals("ws://192.168.1.50:3001/ws", config.wsUrl)
    }

    @Test
    fun stagingIgnoraElHostDeDev() {
        val config = EnvConfig(Environment.STAGING, devHost = "192.168.1.50")

        assertEquals("https://staging.api.zarza.example/api/v1", config.apiBaseUrl)
        assertEquals("wss://staging.api.zarza.example/ws", config.wsUrl)
    }

    @Test
    fun prodIgnoraElHostDeDev() {
        val config = EnvConfig(Environment.PROD, devHost = "192.168.1.50")

        assertEquals("https://api.zarza.example/api/v1", config.apiBaseUrl)
        assertEquals("wss://api.zarza.example/ws", config.wsUrl)
    }

    @Test
    fun exponeElEntorno() {
        assertEquals(Environment.STAGING, EnvConfig(Environment.STAGING, devHost = "").environment)
    }
}
