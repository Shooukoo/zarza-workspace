package com.rubusai.app.core.platform

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/** Cámara y galería del sistema. El resultado llega por el `onPicked` de [rememberPhotoPicker]. */
interface PhotoPicker {
    fun takePhoto()
    fun pickFromGallery()
}

/**
 * [onPicked] recibe la ruta de un archivo local con la foto, o `null` si el usuario canceló o
 * la foto no se pudo leer. Sobrevive a la rotación y a que el sistema mate la app mientras la
 * cámara está abierta.
 */
@Composable
expect fun rememberPhotoPicker(onPicked: (path: String?) -> Unit): PhotoPicker

interface LocationPermission {
    fun isGranted(): Boolean
    fun request()
}

/** [onResult] recibe `true` si se concedió alguno de los dos permisos de ubicación. */
@Composable
expect fun rememberLocationPermission(onResult: (granted: Boolean) -> Unit): LocationPermission

/** Vista previa de la foto en [path], con su orientación aplicada. No muestra nada si no se puede leer. */
@Composable
expect fun PhotoPreview(path: String, contentDescription: String, modifier: Modifier)
