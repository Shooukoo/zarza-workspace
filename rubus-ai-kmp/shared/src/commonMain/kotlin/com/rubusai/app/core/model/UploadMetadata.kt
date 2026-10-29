package com.rubusai.app.core.model

/**
 * Datos que acompañan a la imagen en la subida. [capturedAt] es ISO-8601 (`Instant.toString()`).
 * [offlineSyncId] identifica la captura y se reenvía igual en los reintentos.
 */
data class UploadMetadata(
    val capturedAt: String,
    val offlineSyncId: String,
    val campoId: String,
    val gpsLat: Double?,
    val gpsLon: Double?,
)
