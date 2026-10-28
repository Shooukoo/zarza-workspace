package com.rubusai.app.core.platform

import com.rubusai.app.core.model.User

/**
 * Almacén del usuario de la sesión. Va aparte de [SecureTokenStorage] porque el refresco de
 * tokens solo reescribe tokens: en la misma entrada, cada refresh borraría al usuario.
 */
interface UserStorage {
    /**
     * El usuario guardado, o `null` si no hay o lo guardado es ilegible. Una implementación
     * puede borrar lo ilegible al leerlo.
     */
    suspend fun read(): User?

    suspend fun save(user: User)

    suspend fun clear()
}
