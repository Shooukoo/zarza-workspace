package com.example.rubus_ai_kmp.core.designsystem.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

internal val RubusShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(20.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

object RubusDimens {
    /** Borde de tarjetas, opciones y botones con contorno. */
    val BorderWidth = 2.dp

    /** Alto del canto inferior que da relieve a los botones. */
    val ButtonDepth = 4.dp
    val ButtonHeight = 48.dp
    val ButtonRadius = 16.dp
}
