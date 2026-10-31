package com.rubusai.app.core.model

/** Evento de negocio que el servidor empuja por el WebSocket. */
sealed interface RealtimeEvent {
    /** Terminó el análisis [analisisId] de la imagen [imageId] (`imageId` vacío si el servidor no lo mandó). */
    data class AnalisisListo(val analisisId: String, val imageId: String) : RealtimeEvent

    /** Evento que esta versión de la app no usa (por ejemplo `analysis_validated`). */
    data class Desconocido(val nombre: String) : RealtimeEvent
}
