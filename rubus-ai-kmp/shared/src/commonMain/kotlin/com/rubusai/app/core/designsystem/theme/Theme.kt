package com.rubusai.app.core.designsystem.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.ReadOnlyComposable

@Composable
fun RubusTheme(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalRubusColors provides LightRubusColors) {
        MaterialTheme(
            colorScheme = LightColorScheme,
            typography = RubusTypography,
            shapes = RubusShapes,
            content = content,
        )
    }
}

object RubusTheme {
    val colors: RubusColors
        @Composable
        @ReadOnlyComposable
        get() = LocalRubusColors.current
}
