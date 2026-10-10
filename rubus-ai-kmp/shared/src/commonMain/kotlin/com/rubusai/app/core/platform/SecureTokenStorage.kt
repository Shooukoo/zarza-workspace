package com.rubusai.app.core.platform

import com.rubusai.app.core.network.AuthTokens

/** Almacenamiento seguro de los tokens de sesión. Los dos tokens se guardan y se borran juntos. */
interface SecureTokenStorage {
    /**
     * El par guardado, o `null` si no hay sesión o lo guardado es ilegible. Una
     * implementación puede borrar lo ilegible al leerlo.
     */
    suspend fun read(): AuthTokens?

    suspend fun save(tokens: AuthTokens)

    suspend fun clear()
}
