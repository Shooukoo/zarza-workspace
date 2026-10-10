package com.rubusai.app.core.config

enum class Environment {
    DEV,
    STAGING,
    PROD,
}

/**
 * URLs del backend para un entorno. [devHost] solo se usa en [Environment.DEV].
 * Los dominios de staging y prod son marcadores hasta que existan los reales.
 */
class EnvConfig(val environment: Environment, devHost: String) {
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
