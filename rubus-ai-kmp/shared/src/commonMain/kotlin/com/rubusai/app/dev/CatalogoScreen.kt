package com.rubusai.app.dev

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusCard
import com.rubusai.app.core.designsystem.component.RubusErrorState
import com.rubusai.app.core.designsystem.component.RubusLoadingState
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.designsystem.component.RubusTextField

// Solo existe en el flavor dev: cada componente del design system en sus estados, para
// revisarlos a ojo en un dispositivo.
@Composable
fun CatalogoScreen() {
    var texto by remember { mutableStateOf("") }
    var clave by remember { mutableStateOf("") }

    RubusScreen(
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.Start,
    ) {
        Text("Tipografía", style = MaterialTheme.typography.headlineLarge)
        Text("Título grande", style = MaterialTheme.typography.titleLarge)
        Text("Cuerpo de texto de ejemplo", style = MaterialTheme.typography.bodyLarge)

        Text("Botones", style = MaterialTheme.typography.titleLarge)
        RubusButtonVariant.entries.forEach { variante ->
            RubusButton(text = variante.name, onClick = {}, variant = variante, modifier = Modifier.fillMaxWidth())
        }
        RubusButton(text = "Deshabilitado", onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth())

        Text("Campos de texto", style = MaterialTheme.typography.titleLarge)
        RubusTextField(
            value = texto,
            onValueChange = { texto = it },
            label = "Correo",
            supportingText = "Texto de ayuda",
            modifier = Modifier.fillMaxWidth(),
        )
        RubusTextField(
            value = "",
            onValueChange = {},
            label = "Con error",
            errorText = "Este campo es obligatorio",
            modifier = Modifier.fillMaxWidth(),
        )
        RubusTextField(
            value = "Deshabilitado",
            onValueChange = {},
            label = "Deshabilitado",
            enabled = false,
            modifier = Modifier.fillMaxWidth(),
        )
        RubusTextField(
            value = clave,
            onValueChange = { clave = it },
            label = "Contraseña",
            isPassword = true,
            showPasswordLabel = "Mostrar",
            hidePasswordLabel = "Ocultar",
            modifier = Modifier.fillMaxWidth(),
        )

        Text("Tarjetas", style = MaterialTheme.typography.titleLarge)
        RubusCard(modifier = Modifier.fillMaxWidth()) {
            Text("Tarjeta sin acción", style = MaterialTheme.typography.bodyLarge)
        }
        RubusCard(onClick = {}, modifier = Modifier.fillMaxWidth()) {
            Text("Tarjeta clicable", style = MaterialTheme.typography.bodyLarge)
        }

        Text("Estados", style = MaterialTheme.typography.titleLarge)
        RubusLoadingState(modifier = Modifier.fillMaxWidth().height(160.dp), message = "Cargando…")
        RubusErrorState(
            message = "No se pudo cargar",
            retryLabel = "Reintentar",
            onRetry = {},
            modifier = Modifier.fillMaxWidth().height(200.dp),
        )
    }
}
