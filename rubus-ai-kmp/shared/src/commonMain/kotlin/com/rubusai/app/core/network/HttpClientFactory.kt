package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.api.createClientPlugin
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.client.utils.EmptyContent
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.Url
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

private const val CONNECT_TIMEOUT_MS = 10_000L
private const val REQUEST_TIMEOUT_MS = 30_000L

private val AUTH_ROUTES = listOf("auth/login", "auth/refresh")

/** Cabeceras que llevan tokens: se enmascaran en el registro. */
private val SENSITIVE_HEADERS = listOf(HttpHeaders.Authorization, HttpHeaders.Cookie, HttpHeaders.SetCookie)

/**
 * `true` si [encodedPath] es una ruta de login o de refresh bajo [basePath] (la ruta de la
 * URL base, terminada en `/`). Esas peticiones no llevan `Bearer` ni disparan refresh.
 */
internal fun isAuthRoute(encodedPath: String, basePath: String): Boolean {
    if (!encodedPath.startsWith(basePath)) return false
    val relative = encodedPath.removePrefix(basePath)
    return AUTH_ROUTES.any { relative.startsWith(it) }
}

/**
 * `true` si [url] es de la API (mismo host y puerto que [base], bajo su ruta) y no es login
 * ni refresh. Solo esas peticiones llevan `Bearer` y pueden disparar un refresh: el token
 * no debe salir hacia otros hosts (por ejemplo, las URLs firmadas de las imágenes).
 */
internal fun needsBearer(url: Url, base: Url): Boolean =
    url.host == base.host && url.port == base.port &&
        url.encodedPath.startsWith(base.encodedPath) && !isAuthRoute(url.encodedPath, base.encodedPath)

/** Quita el `Content-Type` si no hay cuerpo: Fastify responde 400 a un cuerpo vacío declarado como JSON. */
private val SinContentTypeSinCuerpo = createClientPlugin("SinContentTypeSinCuerpo") {
    onRequest { request, content ->
        if (content is EmptyContent) request.headers.remove(HttpHeaders.ContentType)
    }
}

/**
 * Configuración que comparten el cliente de la app y el de refresh.
 * Las rutas se piden relativas y sin barra inicial (`client.get("health")`): con barra,
 * Ktor descarta el `/api/v1` de la URL base.
 * El `Content-Type` JSON es el valor por defecto solo para las peticiones con cuerpo.
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
    install(SinContentTypeSinCuerpo)
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

/**
 * Cliente HTTP de la app. Añade el token de acceso a las peticiones a la API salvo a las
 * rutas de login y refresh, y nunca a otros hosts. Lanza `ResponseException` ante cualquier respuesta que no sea 2xx.
 *
 * Los tokens se leen de [tokenStorage] en cada petición y no se cachean: quien guarde o
 * borre la sesión ahí no tiene que avisar al cliente.
 */
internal fun createHttpClient(
    engine: HttpClientEngine,
    logger: Logger,
    envConfig: EnvConfig,
    tokenStorage: SecureTokenStorage,
    tokenRefresher: TokenRefresher,
    sessionEvents: SessionEvents,
): HttpClient {
    val baseUrl = Url("${envConfig.apiBaseUrl}/")
    return HttpClient(engine) {
        expectSuccess = true
        installBase(envConfig)
        install(Logging) {
            this.logger = logger
            // Nunca cuerpos: llevan tokens y datos del usuario.
            level = if (envConfig.environment == Environment.DEV) LogLevel.HEADERS else LogLevel.NONE
            sanitizeHeader { name -> SENSITIVE_HEADERS.any { it.equals(name, ignoreCase = true) } }
        }
        install(Auth) {
            bearer {
                cacheTokens = false
                loadTokens {
                    tokenStorage.read()?.let { BearerTokens(it.accessToken, it.refreshToken) }
                }
                sendWithoutRequest { request -> needsBearer(request.url.build(), baseUrl) }
            }
        }
    }
}
