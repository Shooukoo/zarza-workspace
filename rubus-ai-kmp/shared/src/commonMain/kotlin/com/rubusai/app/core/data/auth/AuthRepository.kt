package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User

interface AuthRepository {
    /** `POST auth/login`. No guarda nada: quien llama decide qué persistir. Nunca lanza, salvo por cancelación. */
    suspend fun login(email: String, password: String): LoginResult

    /**
     * `GET auth/me`: el usuario actual, o `null` ante cualquier fallo (red, 4xx, 5xx, cuerpo
     * ilegible o rol desconocido). Un 401 ya lo gestiona el cliente con el refresh de token.
     */
    suspend fun fetchMe(): User?

    /**
     * `POST auth/logout` con el refresh token, como mucho 5 s. Nunca lanza, salvo por
     * cancelación: si falla, el cierre de sesión local sigue adelante igual.
     */
    suspend fun logout(refreshToken: String?)
}
