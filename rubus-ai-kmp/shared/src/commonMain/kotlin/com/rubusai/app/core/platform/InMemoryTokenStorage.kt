package com.rubusai.app.core.platform

import com.rubusai.app.core.network.AuthTokens
import kotlin.concurrent.Volatile

/**
 * Guarda el par en memoria: la sesión se pierde al cerrar el proceso.
 * Doble de test e implementación temporal de iOS hasta que exista la de Keychain.
 */
class InMemoryTokenStorage(initial: AuthTokens? = null) : SecureTokenStorage {
    @Volatile
    private var tokens: AuthTokens? = initial

    override suspend fun read(): AuthTokens? = tokens

    override suspend fun save(tokens: AuthTokens) {
        this.tokens = tokens
    }

    override suspend fun clear() {
        tokens = null
    }
}
