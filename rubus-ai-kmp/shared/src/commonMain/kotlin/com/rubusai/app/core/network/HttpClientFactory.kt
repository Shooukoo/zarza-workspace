package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

private const val CONNECT_TIMEOUT_MS = 10_000L
private const val REQUEST_TIMEOUT_MS = 30_000L

/**
 * Configuración que comparten el cliente de la app y el de refresh.
 * Las rutas se piden relativas y sin barra inicial (`client.get("health")`): con barra,
 * Ktor descarta el `/api/v1` de la URL base.
 */
private fun HttpClientConfig<*>.installBase(envConfig: EnvConfig) {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) {
        connectTimeoutMillis = CONNECT_TIMEOUT_MS
        requestTimeoutMillis = REQUEST_TIMEOUT_MS
    }
    defaultRequest {
        url("${envConfig.apiBaseUrl}/")
        contentType(ContentType.Application.Json)
    }
}

/**
 * Cliente que solo usa [TokenRefresher]. No lleva autenticación, para que la llamada a
 * `auth/refresh` no pueda disparar otro refresh, ni registro, para no volcar tokens.
 * No lanza por códigos de error: [TokenRefresher] los interpreta.
 */
internal fun createRefreshClient(engine: HttpClientEngine, envConfig: EnvConfig): HttpClient =
    HttpClient(engine) {
        expectSuccess = false
        installBase(envConfig)
    }
