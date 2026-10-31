package com.rubusai.app.core.data.realtime

import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.platform.SecureTokenStorage

/**
 * Da al WebSocket un access token vigente. No cierra ni abre sesiones: `RealtimeHost` desconecta
 * el socket cuando la sesión termina.
 */
internal class RealtimeSession(
    private val auth: AuthRepository,
    private val tokenStorage: SecureTokenStorage,
) {
    /**
     * El access token guardado, o `null` si no se pudo confirmar la sesión. Antes pide `auth/me`
     * con el cliente principal: si el access token venció, su 401 dispara el refresh y deja el
     * par nuevo en [tokenStorage]; por eso el token se lee después. Si `auth/me` falla (red o
     * sesión muerta) no se devuelve el token viejo.
     */
    suspend fun freshToken(): String? {
        if (auth.fetchMe() == null) return null
        return tokenStorage.read()?.accessToken
    }
}
