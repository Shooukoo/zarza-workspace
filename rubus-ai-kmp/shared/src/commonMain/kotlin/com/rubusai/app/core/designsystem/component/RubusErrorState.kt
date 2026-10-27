package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Mensaje de error centrado. El botón de reintento aparece solo si se pasan [retryLabel]
 * y [onRetry] a la vez; si se pasa solo uno, `require` lanza IllegalArgumentException.
 * No impone tamaño; para pantalla completa se pasa `Modifier.fillMaxSize()`.
 */
@Composable
fun RubusErrorState(
    message: String,
    modifier: Modifier = Modifier,
    retryLabel: String? = null,
    onRetry: (() -> Unit)? = null,
) {
    require((retryLabel == null) == (onRetry == null)) {
        "retryLabel y onRetry se pasan juntos o ninguno"
    }
    Column(
        modifier = modifier.padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = message,
            // Para que los lectores de pantalla anuncien el error al aparecer.
            modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center,
        )
        if (retryLabel != null && onRetry != null) {
            RubusButton(text = retryLabel, onClick = onRetry, variant = RubusButtonVariant.Secondary)
        }
    }
}
