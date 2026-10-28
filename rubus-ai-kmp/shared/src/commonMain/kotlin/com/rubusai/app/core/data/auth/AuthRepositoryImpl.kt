package com.rubusai.app.core.data.auth

import com.rubusai.app.core.network.AuthTokens
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ResponseException
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

/**
 * Usa el `HttpClient` de la app (el único con refresh de token). Nada de lo que falla se
 * registra: el mensaje de un `ResponseException` incluye el cuerpo de la respuesta.
 */
internal class AuthRepositoryImpl(private val client: HttpClient) : AuthRepository {

    override suspend fun login(email: String, password: String): LoginResult {
        val response = try {
            client.post("auth/login") { setBody(LoginRequest(email, password)) }
        } catch (e: ResponseException) {
            return LoginResult.Failure(e.response.status.toLoginFailure())
        } catch (e: Exception) {
            // Una cancelación de quien llama se propaga; cualquier otra excepción sin respuesta
            // del servidor es un fallo de red.
            currentCoroutineContext().ensureActive()
            return LoginResult.Failure(LoginFailure.Network)
        }
        val body = try {
            response.body<LoginResponse>()
        } catch (e: Exception) {
            currentCoroutineContext().ensureActive()
            return LoginResult.Failure(LoginFailure.Unexpected)
        }
        val user = body.user.toUserOrNull() ?: return LoginResult.Failure(LoginFailure.UnsupportedRole)
        return LoginResult.Success(AuthSession(AuthTokens(body.token, body.refreshToken), user))
    }
}

private fun HttpStatusCode.toLoginFailure(): LoginFailure = when (value) {
    401 -> LoginFailure.InvalidCredentials
    429 -> LoginFailure.RateLimited
    400 -> LoginFailure.InvalidInput
    else -> LoginFailure.Unexpected
}
