package com.rubusai.app.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.lexend
import org.jetbrains.compose.resources.Font

/**
 * Lexend, la fuente base de todo el tema de la app Flutter. El archivo es variable (peso
 * 100 a 900), por eso cada peso es una entrada de la misma fuente. Outfit no se empaqueta:
 * solo la usan el panel admin y el registro, que no se migran.
 */
@Composable
internal fun rememberRubusTypography(): Typography {
    val lexend = FontFamily(
        Font(Res.font.lexend, FontWeight.Medium),
        Font(Res.font.lexend, FontWeight.SemiBold),
        Font(Res.font.lexend, FontWeight.Bold),
        Font(Res.font.lexend, FontWeight.ExtraBold),
    )
    return remember(lexend) { rubusTypography(lexend) }
}

// Escala de Material 3 con los pesos del kit de referencia: títulos y etiquetas en
// negrita, cuerpo en medio. `headlineLarge`, `titleLarge`, `bodyLarge`, `labelLarge` y
// `labelMedium` usan las medidas del kit; el resto conserva las de Material 3.
internal fun rubusTypography(fontFamily: FontFamily): Typography = Typography().run {
    fun TextStyle.lexend() = copy(fontFamily = fontFamily)
    copy(
        displayLarge = displayLarge.copy(fontWeight = FontWeight.ExtraBold).lexend(),
        displayMedium = displayMedium.copy(fontWeight = FontWeight.ExtraBold).lexend(),
        displaySmall = displaySmall.copy(fontWeight = FontWeight.ExtraBold).lexend(),
        headlineLarge = headlineLarge.copy(fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 52.sp).lexend(),
        headlineMedium = headlineMedium.copy(fontWeight = FontWeight.Bold).lexend(),
        headlineSmall = headlineSmall.copy(fontWeight = FontWeight.Bold).lexend(),
        titleLarge = titleLarge.copy(fontWeight = FontWeight.Bold, fontSize = 23.sp, lineHeight = 34.sp).lexend(),
        titleMedium = titleMedium.copy(fontWeight = FontWeight.Bold).lexend(),
        titleSmall = titleSmall.copy(fontWeight = FontWeight.Bold).lexend(),
        bodyLarge = bodyLarge.copy(fontWeight = FontWeight.Medium, fontSize = 17.sp, lineHeight = 26.6.sp).lexend(),
        bodyMedium = bodyMedium.copy(fontWeight = FontWeight.Medium).lexend(),
        bodySmall = bodySmall.copy(fontWeight = FontWeight.Medium).lexend(),
        labelLarge = labelLarge.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            letterSpacing = 0.8.sp,
        ).lexend(),
        labelMedium = labelMedium.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            lineHeight = 18.sp,
            letterSpacing = 0.8.sp,
        ).lexend(),
        labelSmall = labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp).lexend(),
        displayLargeEmphasized = displayLargeEmphasized.lexend(),
        displayMediumEmphasized = displayMediumEmphasized.lexend(),
        displaySmallEmphasized = displaySmallEmphasized.lexend(),
        headlineLargeEmphasized = headlineLargeEmphasized.lexend(),
        headlineMediumEmphasized = headlineMediumEmphasized.lexend(),
        headlineSmallEmphasized = headlineSmallEmphasized.lexend(),
        titleLargeEmphasized = titleLargeEmphasized.lexend(),
        titleMediumEmphasized = titleMediumEmphasized.lexend(),
        titleSmallEmphasized = titleSmallEmphasized.lexend(),
        bodyLargeEmphasized = bodyLargeEmphasized.lexend(),
        bodyMediumEmphasized = bodyMediumEmphasized.lexend(),
        bodySmallEmphasized = bodySmallEmphasized.lexend(),
        labelLargeEmphasized = labelLargeEmphasized.lexend(),
        labelMediumEmphasized = labelMediumEmphasized.lexend(),
        labelSmallEmphasized = labelSmallEmphasized.lexend(),
    )
}
