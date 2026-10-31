package com.rubusai.app.core.platform

/** Lado máximo, en píxeles, de la imagen que se sube. */
const val IMAGE_MAX_SIDE_PX = 2048

/** Calidad JPEG de la imagen que se sube. */
const val IMAGE_JPEG_QUALITY = 85

/** La imagen no se pudo leer, decodificar o comprimir. */
class ImageCompressionException(message: String, cause: Throwable? = null) : Exception(message, cause)

/** Compresión de imágenes antes de subirlas. */
interface ImageCompressor {
    /**
     * Lee la imagen de [path] y devuelve un JPEG de lado máximo [IMAGE_MAX_SIDE_PX] y calidad
     * [IMAGE_JPEG_QUALITY], sin EXIF y con la orientación ya aplicada a los píxeles.
     *
     * @throws ImageCompressionException si el archivo no existe, no es una imagen o no hay memoria.
     */
    suspend fun compress(path: String): ByteArray
}
