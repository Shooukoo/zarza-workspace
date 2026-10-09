package com.example.rubus_ai_kmp.core.designsystem.theme

import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color

// Colores base y cantos de botón ("Depth") tomados del kit de referencia; donde el kit
// no da el canto, es el color base con negro al 20 % encima. Los "Ink" (texto sobre
// contenedores claros) no vienen del kit: son el color base al 50 % de brillo.
internal object RubusPalette {
    val Green = Color(0xFF58CC02)
    val GreenDepth = Color(0xFF46A302)
    val GreenInk = Color(0xFF2B6601)
    val GreenContainer = Color(0xFFD7FFB8)

    val Blue = Color(0xFF1CB0F6)
    val BlueDepth = Color(0xFF1899D6)
    val BlueInk = Color(0xFF0E587B)
    val BlueContainer = Color(0xFFDDF4FF)
    val BlueContainerStrong = Color(0xFFBBE7FC)

    // Muestreado de una captura con suavizado; el valor exacto puede variar un par de puntos.
    val BlueOutline = Color(0xFF84D8FF)

    val Purple = Color(0xFFCE82FF)
    val PurpleInk = Color(0xFF674180)
    val PurpleContainer = Color(0xFFF3E0FF)

    val Red = Color(0xFFFC4141)
    val RedDepth = Color(0xFFCA3434)
    val RedInk = Color(0xFF7E2121)
    val RedContainer = Color(0xFFFFB2B2)

    val Yellow = Color(0xFFFFC800)
    val YellowInk = Color(0xFF806400)
    val YellowContainer = Color(0xFFFFEEAE)

    val Navy = Color(0xFF235390)

    val White = Color(0xFFFFFFFF)
    val Gray50 = Color(0xFFF7F7F7)
    val Gray200 = Color(0xFFE5E5E5)
    val Gray400 = Color(0xFFAFAFAF)
    val Gray600 = Color(0xFF777777)
    val Gray800 = Color(0xFF4B4B4B)
    val Gray900 = Color(0xFF3C3C3C)
}

internal val LightColorScheme = lightColorScheme(
    primary = RubusPalette.Green,
    onPrimary = RubusPalette.White,
    primaryContainer = RubusPalette.GreenContainer,
    onPrimaryContainer = RubusPalette.GreenInk,
    secondary = RubusPalette.Blue,
    onSecondary = RubusPalette.White,
    secondaryContainer = RubusPalette.BlueContainer,
    onSecondaryContainer = RubusPalette.BlueInk,
    tertiary = RubusPalette.Purple,
    onTertiary = RubusPalette.White,
    tertiaryContainer = RubusPalette.PurpleContainer,
    onTertiaryContainer = RubusPalette.PurpleInk,
    error = RubusPalette.Red,
    onError = RubusPalette.White,
    errorContainer = RubusPalette.RedContainer,
    onErrorContainer = RubusPalette.RedInk,
    background = RubusPalette.White,
    onBackground = RubusPalette.Gray900,
    surface = RubusPalette.White,
    onSurface = RubusPalette.Gray800,
    surfaceVariant = RubusPalette.Gray50,
    onSurfaceVariant = RubusPalette.Gray600,
    surfaceTint = RubusPalette.White,
    surfaceBright = RubusPalette.White,
    surfaceDim = RubusPalette.Gray200,
    surfaceContainerLowest = RubusPalette.White,
    surfaceContainerLow = RubusPalette.White,
    surfaceContainer = RubusPalette.Gray50,
    surfaceContainerHigh = RubusPalette.Gray50,
    surfaceContainerHighest = RubusPalette.Gray200,
    inverseSurface = RubusPalette.Navy,
    inverseOnSurface = RubusPalette.White,
    inversePrimary = RubusPalette.GreenContainer,
    outline = RubusPalette.Gray200,
    outlineVariant = RubusPalette.Gray50,
    scrim = Color(0xFF000000),
)

/** Colores del diseño que no tienen sitio en el `ColorScheme` de Material 3. */
@Immutable
data class RubusColors(
    val primaryDepth: Color,
    val secondaryDepth: Color,
    val secondaryContainerStrong: Color,
    val secondaryOutline: Color,
    val errorDepth: Color,
    val warning: Color,
    val onWarningContainer: Color,
    val warningContainer: Color,
    val brand: Color,
    val onBrand: Color,
    val disabledContainer: Color,
    val onDisabledContainer: Color,
)

internal val LightRubusColors = RubusColors(
    primaryDepth = RubusPalette.GreenDepth,
    secondaryDepth = RubusPalette.BlueDepth,
    secondaryContainerStrong = RubusPalette.BlueContainerStrong,
    secondaryOutline = RubusPalette.BlueOutline,
    errorDepth = RubusPalette.RedDepth,
    warning = RubusPalette.Yellow,
    onWarningContainer = RubusPalette.YellowInk,
    warningContainer = RubusPalette.YellowContainer,
    brand = RubusPalette.Navy,
    onBrand = RubusPalette.White,
    disabledContainer = RubusPalette.Gray200,
    onDisabledContainer = RubusPalette.Gray400,
)

internal val LocalRubusColors = staticCompositionLocalOf { LightRubusColors }
