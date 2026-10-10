package com.rubusai.app.core.config

enum class Environment {
    DEV,
    STAGING,
    PROD,
}

object EnvConfig {
    fun baseUrl(environment: Environment): String = when (environment) {
        Environment.DEV -> TODO("URL base de DEV pendiente")
        Environment.STAGING -> TODO("URL base de STAGING pendiente")
        Environment.PROD -> TODO("URL base de PROD pendiente")
    }
}
