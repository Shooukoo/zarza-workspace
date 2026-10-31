package com.rubusai.app.core.platform

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import java.io.File
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val CAPTURES_DIR = "captures"
private const val PREVIEW_MAX_SIDE_PX = 1024
private const val STALE_CAPTURE_MS = 24L * 60 * 60 * 1000

@Composable
actual fun rememberPhotoPicker(onPicked: (path: String?) -> Unit): PhotoPicker {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    // El objeto devuelto vive más que una composición: siempre se llama a la última lambda.
    val currentOnPicked by rememberUpdatedState(onPicked)
    // La ruta del archivo que está escribiendo la cámara se guarda: si el sistema mata la app
    // mientras la cámara está abierta, al volver el resultado llega a una instancia nueva.
    var pendingCameraPath by rememberSaveable { mutableStateOf<String?>(null) }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { taken ->
        val path = pendingCameraPath
        pendingCameraPath = null
        currentOnPicked(if (taken) path else null)
    }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) currentOnPicked(null) else scope.launch { currentOnPicked(copyToCache(context, uri)) }
    }

    return remember(camera, gallery, context) {
        object : PhotoPicker {
            override fun takePhoto() {
                val file = newCaptureFile(context)
                pendingCameraPath = file.path
                try {
                    camera.launch(FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file))
                } catch (e: ActivityNotFoundException) {
                    // Sin app de cámara en el dispositivo.
                    pendingCameraPath = null
                    currentOnPicked(null)
                }
            }

            override fun pickFromGallery() =
                gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
    }
}

@Composable
actual fun rememberLocationPermission(onResult: (granted: Boolean) -> Unit): LocationPermission {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        onResult(grants.values.any { it })
    }
    return remember(context, launcher) {
        object : LocationPermission {
            override fun isGranted() = hasLocationPermission(context)

            override fun request() = launcher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            )
        }
    }
}

@Composable
actual fun PhotoPreview(path: String, contentDescription: String, modifier: Modifier) {
    val bitmap by produceState<ImageBitmap?>(initialValue = null, path) {
        value = withContext(Dispatchers.IO) { decodePreview(path) }
    }
    bitmap?.let {
        Image(bitmap = it, contentDescription = contentDescription, modifier = modifier, contentScale = ContentScale.Fit)
    }
}

private fun decodePreview(path: String): ImageBitmap? = try {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        null
    } else {
        val options = BitmapFactory.Options().apply {
            inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, PREVIEW_MAX_SIDE_PX)
        }
        BitmapFactory.decodeFile(path, options)?.let { raw ->
            Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, orientationMatrix(readOrientation(path)), true)
                .asImageBitmap()
        }
    }
} catch (e: OutOfMemoryError) {
    null
}

// Las capturas originales conservan el EXIF (con el GPS): no se dejan en la caché más de un día.
private fun capturesDir(context: Context): File = File(context.cacheDir, CAPTURES_DIR).apply {
    mkdirs()
    listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > STALE_CAPTURE_MS }?.forEach { it.delete() }
}

private fun newCaptureFile(context: Context): File = File.createTempFile("captura_", ".jpg", capturesDir(context))

/** La galería devuelve un `content://`: se copia a un archivo propio para que el compresor lea una ruta. */
private suspend fun copyToCache(context: Context, uri: Uri): String? = withContext(Dispatchers.IO) {
    val input = try {
        context.contentResolver.openInputStream(uri)
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        null
    } ?: return@withContext null
    var file: File? = null
    try {
        file = newCaptureFile(context)
        input.use { source -> file.outputStream().use { source.copyTo(it) } }
        file.path
    } catch (e: CancellationException) {
        file?.delete()
        throw e
    } catch (e: Exception) {
        file?.delete()
        null
    }
}
