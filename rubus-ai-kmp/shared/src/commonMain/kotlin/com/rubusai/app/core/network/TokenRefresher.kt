package com.rubusai.app.core.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpStatusCode
import io.ktor.http.isSuccess
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.Serializable
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource

sealed interface RefreshResult {
    data class Success(val tokens: AuthTokens) : RefreshResult

    /** El backend respondió 401: el token de refresh ya no vale y la sesión terminó. */
    data object Rejected : RefreshResult

    /**
     * Error de red, 429, 5xx o respuesta inesperada. La sesión puede seguir siendo válida.
     *
     * Si la petición llegó al backend y la respuesta se perdió, el token de refresh guardado
     * ya está gastado: el siguiente intento dará 401 ([Rejected]) y habrá que volver a
     * iniciar sesión. No se reintenta aquí.
     * Tras un fallo así, [TokenRefresher] no vuelve a llamar con ese token durante unos segundos.
     */
    data object TransientFailure : RefreshResult
}

@Serializable
private data class RefreshRequest(val refreshToken: String)

@Serializable
private data class RefreshResponse(val token: String, val refreshToken: String)

/** Cuánto se recuerda que un refresh token acaba de fallar por una causa transitoria. */
private val FAILURE_MEMORY = 5.seconds

private class RecentFailure(val refreshToken: String, val at: TimeMark)

/**
 * Pide un par de tokens nuevo a `POST auth/refresh`. [client] debe ser el de
 * [createRefreshClient]: sin autenticación y con la misma URL base que el de la app.
 *
 * Si un refresh falla por una causa transitoria, durante [FAILURE_MEMORY] las llamadas con ese
 * mismo token responden [RefreshResult.TransientFailure] sin llegar al backend. Sin esto, N
 * peticiones en espera harían N llamadas (límite de 5 por minuto) y con timeouts la última
 * tardaría N × 30 s. A cambio, un reintento manual dentro de esa ventana falla sin intentarlo.
 */
class TokenRefresher(
    private val client: HttpClient,
    private val timeSource: TimeSource = TimeSource.Monotonic,
) {
    // `Auth` serializa las llamadas a `refreshTokens`; si dos coincidieran, lo peor es una petición de más.
    private var recentFailure: RecentFailure? = null

    suspend fun refresh(refreshToken: String): RefreshResult {
        recentFailure?.let {
            if (it.refreshToken == refreshToken && it.at.elapsedNow() < FAILURE_MEMORY) {
                return RefreshResult.TransientFailure
            }
        }
        val result = request(refreshToken)
        recentFailure = if (result == RefreshResult.TransientFailure) {
            RecentFailure(refreshToken, timeSource.markNow())
        } else {
            null
        }
        return result
    }

    private suspend fun request(refreshToken: String): RefreshResult = try {
        val response = client.post("auth/refresh") { setBody(RefreshRequest(refreshToken)) }
        when {
            response.status.isSuccess() -> {
                val body = response.body<RefreshResponse>()
                RefreshResult.Success(AuthTokens(body.token, body.refreshToken))
            }
            response.status == HttpStatusCode.Unauthorized -> RefreshResult.Rejected
            else -> RefreshResult.TransientFailure
        }
    } catch (e: Exception) {
        // Solo se propaga la cancelación de quien llama; una CancellationException
        // que venga del motor o de un cliente cerrado es un fallo más.
        currentCoroutineContext().ensureActive()
        RefreshResult.TransientFailure
    }
}
