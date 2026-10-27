package com.rubusai.app.core.designsystem.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Shapes
import androidx.compose.ui.unit.dp

internal val RubusShapes = Shapes(
    extraSmall = RoundedCornerShape(8.dp),
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(12.dp),
    large = RoundedCornerShape(16.dp),
    extraLarge = RoundedCornerShape(28.dp),
)

object RubusDimens {
    /** Borde de tarjetas, opciones y botones con contorno. */
    val BorderWidth = 2.dp

    /** Alto del canto inferior que da relieve a los botones de color. */
    val ButtonDepth = 4.dp

    /** Canto inferior de tarjetas, opciones y botones con contorno. */
    val OutlineDepth = 2.dp

    /** Alto total del botón, canto incluido. */
    val ButtonHeight = 50.dp
    val ButtonRadius = 16.dp

    /** Radio de las esquinas de las tarjetas. */
    val CardRadius = 16.dp
}
