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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.theme.RubusTheme
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

// Pantalla provisional: comprueba a simple vista que flavor, Koin, tema y red están
// conectados. La sustituye la navegación.
@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()
    val httpClient = koinInject<HttpClient>()
    val scope = rememberCoroutineScope()
    var checking by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }

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
                RubusButton(
                    text = "Probar conexión",
                    enabled = !checking,
                    onClick = {
                        checking = true
                        result = null
                        scope.launch {
                            result = checkConnection(httpClient)
                            checking = false
                        }
                    },
                )
                result?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

/** `GET health` contra el backend: "Conectado" o el mensaje del error. */
private suspend fun checkConnection(client: HttpClient): String = try {
    client.get("health")
    "Conectado"
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    e.message ?: e::class.simpleName ?: "Error desconocido"
}
