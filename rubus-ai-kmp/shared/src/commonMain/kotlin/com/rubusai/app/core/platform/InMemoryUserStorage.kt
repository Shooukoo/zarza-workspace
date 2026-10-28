package com.rubusai.app.core.platform

import com.rubusai.app.core.model.User
import kotlin.concurrent.Volatile

/**
 * Guarda el usuario en memoria: se pierde al cerrar el proceso.
 * Doble de test e implementación temporal de iOS hasta que exista la de Keychain.
 */
class InMemoryUserStorage(initial: User? = null) : UserStorage {
    @Volatile
    private var user: User? = initial

    override suspend fun read(): User? = user

    override suspend fun save(user: User) {
        this.user = user
    }

    override suspend fun clear() {
        user = null
    }
}
