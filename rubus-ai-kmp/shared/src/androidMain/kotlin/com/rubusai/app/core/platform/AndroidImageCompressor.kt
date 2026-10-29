package com.rubusai.app.core.platform

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.IOException
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Decodifica ya reducida (`inSampleSize`), aplica la orientación del EXIF a los píxeles y
 * reescala al lado máximo en un solo paso. `Bitmap.compress` no escribe EXIF, así que el
 * resultado no lleva ni la orientación ni las coordenadas de la foto original.
 */
internal class AndroidImageCompressor : ImageCompressor {

    override suspend fun compress(path: String): ByteArray = withContext(Dispatchers.Default) {
        try {
            compressBlocking(path)
        } catch (e: CancellationException) {
            throw e
        } catch (e: ImageCompressionException) {
            throw e
        } catch (e: OutOfMemoryError) {
            throw ImageCompressionException("Sin memoria para procesar la imagen", e)
        } catch (e: Exception) {
            throw ImageCompressionException("No se pudo procesar la imagen", e)
        }
    }

    private fun compressBlocking(path: String): ByteArray {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw ImageCompressionException("El archivo no es una imagen legible")
        }

        val options = BitmapFactory.Options().apply { inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight) }
        val decoded = BitmapFactory.decodeFile(path, options)
            ?: throw ImageCompressionException("No se pudo decodificar la imagen")

        val matrix = orientationMatrix(readOrientation(path))
        val scale = minOf(1f, IMAGE_MAX_SIDE_PX.toFloat() / maxOf(decoded.width, decoded.height))
        if (scale < 1f) matrix.postScale(scale, scale)
        val result = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        if (result !== decoded) decoded.recycle()

        return try {
            ByteArrayOutputStream().use { out ->
                result.compress(Bitmap.CompressFormat.JPEG, IMAGE_JPEG_QUALITY, out)
                out.toByteArray()
            }
        } finally {
            result.recycle()
        }
    }
}

/** Mayor potencia de dos con la que el lado largo sigue siendo al menos [maxSide]. */
internal fun sampleSizeFor(width: Int, height: Int, maxSide: Int = IMAGE_MAX_SIDE_PX): Int {
    var sample = 1
    val longest = maxOf(width, height)
    while (longest / (sample * 2) >= maxSide) sample *= 2
    return sample
}

internal fun readOrientation(path: String): Int = try {
    ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
} catch (e: IOException) {
    ExifInterface.ORIENTATION_NORMAL
}

/** Matriz que lleva los píxeles guardados a la orientación en que se tomó la foto. */
internal fun orientationMatrix(orientation: Int): Matrix = Matrix().apply {
    when (orientation) {
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> setScale(-1f, 1f)
        ExifInterface.ORIENTATION_ROTATE_180 -> setRotate(180f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
            setRotate(180f)
            postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_TRANSPOSE -> {
            setRotate(90f)
            postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_ROTATE_90 -> setRotate(90f)
        ExifInterface.ORIENTATION_TRANSVERSE -> {
            setRotate(-90f)
            postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_ROTATE_270 -> setRotate(-90f)
    }
}
