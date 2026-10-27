package com.rubusai.app.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TypographyTest {

    private val family = FontFamily.Cursive

    private fun Typography.todosLosEstilos() = listOf(
        displayLarge, displayMedium, displaySmall,
        headlineLarge, headlineMedium, headlineSmall,
        titleLarge, titleMedium, titleSmall,
        bodyLarge, bodyMedium, bodySmall,
        labelLarge, labelMedium, labelSmall,
        displayLargeEmphasized, displayMediumEmphasized, displaySmallEmphasized,
        headlineLargeEmphasized, headlineMediumEmphasized, headlineSmallEmphasized,
        titleLargeEmphasized, titleMediumEmphasized, titleSmallEmphasized,
        bodyLargeEmphasized, bodyMediumEmphasized, bodySmallEmphasized,
        labelLargeEmphasized, labelMediumEmphasized, labelSmallEmphasized,
    )

    @Test
    fun todosLosEstilosUsanLaFamiliaRecibida() {
        val estilos = rubusTypography(family).todosLosEstilos()

        assertTrue(estilos.all { it.fontFamily == family })
    }

    @Test
    fun conservaLosPesosDelKit() {
        val typography = rubusTypography(family)

        assertEquals(FontWeight.ExtraBold, typography.displayLarge.fontWeight)
        assertEquals(FontWeight.Bold, typography.headlineLarge.fontWeight)
        assertEquals(FontWeight.Medium, typography.bodyLarge.fontWeight)
    }
}
