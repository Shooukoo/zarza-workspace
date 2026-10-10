package com.rubusai.app.core.network

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Avisos sobre la sesión que la capa de red emite y la de presentación escucha. */
class SessionEvents {
    private val _expired = MutableSharedFlow<Unit>(
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )

    /**
     * Emite cuando el backend rechaza el token de refresh y la sesión ya no se puede renovar.
     * No repite avisos anteriores a quien se suscribe después, y avisos seguidos pueden
     * fundirse en uno.
     *
     * Quien no esté suscrito en ese momento no lo recibe: hay que escucharlo desde un ámbito
     * que viva lo mismo que la app y, al arrancar o volver a primer plano, comprobar además
     * si `SecureTokenStorage.read()` devuelve `null`.
     */
    val expired: SharedFlow<Unit> = _expired.asSharedFlow()

    internal fun notifyExpired() {
        _expired.tryEmit(Unit)
    }
}
