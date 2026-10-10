package com.rubusai.app.core.network

import kotlinx.serialization.Serializable

/** Par de tokens de una sesión. */
@Serializable
data class AuthTokens(val accessToken: String, val refreshToken: String) {
    // Evita que los tokens acaben en un log o en el mensaje de una excepción.
    override fun toString(): String = "AuthTokens(***)"
}
