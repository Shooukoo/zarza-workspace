package com.rubusai.app.core.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

// Sin implementación hasta la Fase 9: la captura no hace nada en iOS, pero compila.

@Composable
actual fun rememberPhotoPicker(onPicked: (path: String?) -> Unit): PhotoPicker = remember {
    object : PhotoPicker {
        override fun takePhoto() = onPicked(null)
        override fun pickFromGallery() = onPicked(null)
    }
}

@Composable
actual fun rememberLocationPermission(onResult: (granted: Boolean) -> Unit): LocationPermission = remember {
    object : LocationPermission {
        override fun isGranted() = false
        override fun request() = onResult(false)
    }
}

@Composable
actual fun PhotoPreview(path: String, contentDescription: String, modifier: Modifier) = Unit
