package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.AuthTokens
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ResponseException
import io.ktor.client.plugins.timeout
import io.ktor.client.request.get
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

    override suspend fun fetchMe(): User? = try {
        client.get("auth/me").body<UserDto>().toUserOrNull()
    } catch (e: Exception) {
        currentCoroutineContext().ensureActive()
        null
    }

    override suspend fun logout(refreshToken: String?) {
        try {
            client.post("auth/logout") {
                timeout { requestTimeoutMillis = LOGOUT_TIMEOUT_MS }
                // Sin token no hay cuerpo (ni Content-Type): Fastify responde 400 a un JSON vacío.
                if (refreshToken != null) setBody(LogoutRequest(refreshToken))
            }
        } catch (e: Exception) {
            currentCoroutineContext().ensureActive()
        }
    }
}

private fun HttpStatusCode.toLoginFailure(): LoginFailure = when (value) {
    401 -> LoginFailure.InvalidCredentials
    429 -> LoginFailure.RateLimited
    400 -> LoginFailure.InvalidInput
    else -> LoginFailure.Unexpected
}

// Acota la petición para que, sin red, el usuario no espere los 30 s del cliente al cerrar sesión.
// Un refresh disparado por un 401 queda fuera de este límite: usa su propio cliente y no es cancelable.
private const val LOGOUT_TIMEOUT_MS = 5_000L
