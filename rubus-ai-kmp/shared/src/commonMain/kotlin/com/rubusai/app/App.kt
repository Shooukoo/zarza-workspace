package com.rubusai.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.theme.RubusTheme
import org.koin.compose.koinInject

// Pantalla provisional: comprueba a simple vista que flavor, Koin y tema están
// conectados. La sustituye la navegación.
@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()

    RubusTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .safeDrawingPadding()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = envConfig.environment.name,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = envConfig.apiBaseUrl,
                    style = MaterialTheme.typography.bodyLarge,
                )
                RubusButton(text = "Continuar", onClick = {})
            }
        }
    }
}
