package com.example.rubus_ai_kmp.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Escala de Material 3 con los pesos del kit de referencia: títulos y etiquetas en
// negrita, cuerpo en medio. `titleLarge`, `bodyLarge` y `labelLarge` usan las medidas
// exactas del kit; el resto conserva las de Material 3. La familia es la del sistema.
internal val RubusTypography = Typography().run {
    copy(
        displayLarge = displayLarge.copy(fontWeight = FontWeight.ExtraBold),
        displayMedium = displayMedium.copy(fontWeight = FontWeight.ExtraBold),
        displaySmall = displaySmall.copy(fontWeight = FontWeight.ExtraBold),
        headlineLarge = headlineLarge.copy(fontWeight = FontWeight.Bold),
        headlineMedium = headlineMedium.copy(fontWeight = FontWeight.Bold),
        headlineSmall = headlineSmall.copy(fontWeight = FontWeight.Bold),
        titleLarge = titleLarge.copy(fontWeight = FontWeight.Bold, fontSize = 23.sp, lineHeight = 34.sp),
        titleMedium = titleMedium.copy(fontWeight = FontWeight.Bold),
        titleSmall = titleSmall.copy(fontWeight = FontWeight.Bold),
        bodyLarge = bodyLarge.copy(fontWeight = FontWeight.Medium, fontSize = 17.sp, lineHeight = 26.6.sp),
        bodyMedium = bodyMedium.copy(fontWeight = FontWeight.Medium),
        bodySmall = bodySmall.copy(fontWeight = FontWeight.Medium),
        labelLarge = labelLarge.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 15.sp,
            lineHeight = 17.sp,
            letterSpacing = 0.51.sp,
        ),
        labelMedium = labelMedium.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.51.sp),
        labelSmall = labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.51.sp),
    )
}
