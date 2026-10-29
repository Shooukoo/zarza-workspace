package com.rubusai.app.core.platform

/** Tiempo máximo que se espera una posición. */
const val LOCATION_TIMEOUT_MS = 8_000L

data class Coordinates(val latitude: Double, val longitude: Double)

/** Acceso a la ubicación GPS del dispositivo. */
interface LocationProvider {
    /**
     * Posición actual con precisión alta, o `null` si no hay permiso, no llega señal en
     * [LOCATION_TIMEOUT_MS] o el servicio falla. No lanza, salvo por cancelación.
     */
    suspend fun current(): Coordinates?
}
