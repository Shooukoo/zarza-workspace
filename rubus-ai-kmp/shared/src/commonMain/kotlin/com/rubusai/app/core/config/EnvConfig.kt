package com.rubusai.app.core.config

enum class Environment {
    DEV,
    STAGING,
    PROD,
}

/**
 * URLs del backend para un entorno. [devHost] es solo host o IP (sin esquema ni puerto)
 * y solo se usa en [Environment.DEV], donde es obligatorio.
 * Los dominios de staging y prod son marcadores hasta que existan los reales.
 *
 * [apiBaseUrl] no termina en `/`: al usarla como base de Ktor hay que añadirla
 * (`url("$apiBaseUrl/")`) y pedir rutas relativas sin barra inicial.
 */
class EnvConfig(val environment: Environment, devHost: String) {
    init {
        require(environment != Environment.DEV || devHost.isNotBlank()) {
            "devHost es obligatorio en el entorno DEV"
        }
    }

    val apiBaseUrl: String = when (environment) {
        Environment.DEV -> "http://$devHost:3001/api/v1"
        Environment.STAGING -> "https://staging.api.zarza.example/api/v1"
        Environment.PROD -> "https://api.zarza.example/api/v1"
    }

    val wsUrl: String = when (environment) {
        Environment.DEV -> "ws://$devHost:3001/ws"
        Environment.STAGING -> "wss://staging.api.zarza.example/ws"
        Environment.PROD -> "wss://api.zarza.example/ws"
    }
}
