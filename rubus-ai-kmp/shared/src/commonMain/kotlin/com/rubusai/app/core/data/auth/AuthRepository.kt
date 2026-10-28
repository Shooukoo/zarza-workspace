package com.rubusai.app.core.data.auth

interface AuthRepository {
    /** `POST auth/login`. No guarda nada: quien llama decide qué persistir. Nunca lanza, salvo por cancelación. */
    suspend fun login(email: String, password: String): LoginResult
}
