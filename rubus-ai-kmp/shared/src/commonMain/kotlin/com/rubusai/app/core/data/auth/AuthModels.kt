package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.AuthTokens

/** Por qué falló un login. La presentación convierte cada causa en un texto. */
enum class LoginFailure {
    InvalidCredentials,
    RateLimited,
    Network,
    InvalidInput,
    UnsupportedRole,
    Unexpected,
}

/** Lo que devuelve un login correcto: el par de tokens y el usuario. */
data class AuthSession(val tokens: AuthTokens, val user: User)

sealed interface LoginResult {
    data class Success(val session: AuthSession) : LoginResult
    data class Failure(val reason: LoginFailure) : LoginResult
}
