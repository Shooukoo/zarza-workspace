package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Superficie de una pantalla completa: fondo del tema, respeto de las barras del sistema y del
 * teclado, y un margen de 24 dp. Por defecto centra el contenido; con [scrollable] el contenido
 * crece hacia abajo y no se centra: `verticalScroll` mide el contenido con altura infinita, así que
 * no queda espacio que repartir y el `verticalArrangement` no centra.
 */
@Composable
fun RubusScreen(
    modifier: Modifier = Modifier,
    scrollable: Boolean = false,
    verticalArrangement: Arrangement.Vertical = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    horizontalAlignment: Alignment.Horizontal = Alignment.CenterHorizontally,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .then(if (scrollable) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .padding(24.dp),
            verticalArrangement = verticalArrangement,
            horizontalAlignment = horizontalAlignment,
            content = content,
        )
    }
}
