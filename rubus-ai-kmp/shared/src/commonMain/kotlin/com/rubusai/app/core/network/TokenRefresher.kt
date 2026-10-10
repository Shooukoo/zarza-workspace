package com.rubusai.app.core.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpStatusCode
import io.ktor.http.isSuccess
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.serialization.Serializable

sealed interface RefreshResult {
    data class Success(val tokens: AuthTokens) : RefreshResult

    /** El backend respondió 401: el token de refresh ya no vale y la sesión terminó. */
    data object Rejected : RefreshResult

    /** Error de red, 429, 5xx o respuesta inesperada. La sesión puede seguir siendo válida. */
    data object TransientFailure : RefreshResult
}

@Serializable
private data class RefreshRequest(val refreshToken: String)

@Serializable
private data class RefreshResponse(val token: String, val refreshToken: String)

/**
 * Pide un par de tokens nuevo a `POST auth/refresh`. [client] debe ser el de
 * [createRefreshClient]: sin autenticación y con la misma URL base que el de la app.
 */
class TokenRefresher(private val client: HttpClient) {

    suspend fun refresh(refreshToken: String): RefreshResult = try {
        val response = client.post("auth/refresh") { setBody(RefreshRequest(refreshToken)) }
        when {
            response.status.isSuccess() -> {
                val body = response.body<RefreshResponse>()
                RefreshResult.Success(AuthTokens(body.token, body.refreshToken))
            }
            response.status == HttpStatusCode.Unauthorized -> RefreshResult.Rejected
            else -> RefreshResult.TransientFailure
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        RefreshResult.TransientFailure
    }
}
