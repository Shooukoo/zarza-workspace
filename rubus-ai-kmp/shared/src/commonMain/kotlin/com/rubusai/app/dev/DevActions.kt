package com.rubusai.app.dev

import androidx.compose.runtime.Composable
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant

/** Accesos a las pantallas de desarrollo. Solo existen en `Environment.DEV`: fuera de DEV se pasa `null`. */
class DevActions(val onDiagnostico: () -> Unit, val onCatalogo: () -> Unit)

// Texto fijo a propósito: es herramienta de desarrollo y no se traduce.
@Composable
fun DevButtons(actions: DevActions) {
    RubusButton(text = "Diagnóstico", onClick = actions.onDiagnostico, variant = RubusButtonVariant.Secondary)
    RubusButton(text = "Catálogo", onClick = actions.onCatalogo, variant = RubusButtonVariant.Outline)
}
