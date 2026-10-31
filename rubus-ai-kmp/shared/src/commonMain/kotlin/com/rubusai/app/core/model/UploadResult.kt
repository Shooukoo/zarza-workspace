package com.rubusai.app.core.model

/** Lo que el backend devuelve al aceptar una imagen (`POST ingestion/upload`, 201). */
data class UploadResult(val imageId: String, val storageKey: String)
