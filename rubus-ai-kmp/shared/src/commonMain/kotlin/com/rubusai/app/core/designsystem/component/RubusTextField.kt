package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.theme.RubusDimens
import com.rubusai.app.core.designsystem.theme.RubusTheme

/**
 * Campo de una línea con etiqueta encima y borde del grosor del resto del sistema. El borde
 * pasa a azul con el foco y a rojo con [errorText], que sustituye a [supportingText].
 *
 * Con [isPassword] el valor se oculta y aparece un botón de texto para mostrarlo; sin iconos
 * en el proyecto, sus textos ([showPasswordLabel] y [hidePasswordLabel]) los pone quien llama.
 */
@Composable
fun RubusTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    errorText: String? = null,
    supportingText: String? = null,
    isPassword: Boolean = false,
    showPasswordLabel: String = "",
    hidePasswordLabel: String = "",
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    require(!isPassword || (showPasswordLabel.isNotEmpty() && hidePasswordLabel.isNotEmpty())) {
        "Un campo de contraseña necesita los textos de mostrar y ocultar"
    }
    val scheme = MaterialTheme.colorScheme
    val extra = RubusTheme.colors
    val shape = MaterialTheme.shapes.large
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    var passwordVisible by remember { mutableStateOf(false) }
    val hasError = errorText != null

    val borderColor = when {
        !enabled -> extra.disabledContainer
        hasError -> scheme.error
        focused -> scheme.secondary
        else -> scheme.outline
    }
    val textStyle = MaterialTheme.typography.bodyLarge.copy(
        color = if (enabled) scheme.onSurface else extra.onDisabledContainer,
    )

    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = if (hasError) scheme.error else scheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(4.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = true,
            textStyle = textStyle,
            cursorBrush = SolidColor(scheme.secondary),
            visualTransformation = if (isPassword && !passwordVisible) {
                PasswordVisualTransformation()
            } else {
                VisualTransformation.None
            },
            keyboardOptions = if (isPassword) {
                keyboardOptions.copy(keyboardType = KeyboardType.Password)
            } else {
                keyboardOptions
            },
            keyboardActions = keyboardActions,
            interactionSource = interactionSource,
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = RubusDimens.ButtonHeight)
                        .background(if (enabled) scheme.surface else extra.disabledContainer, shape)
                        .border(RubusDimens.BorderWidth, borderColor, shape)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.weight(1f)) { innerTextField() }
                    if (isPassword) {
                        Text(
                            text = if (passwordVisible) hidePasswordLabel else showPasswordLabel,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (enabled) scheme.secondary else extra.onDisabledContainer,
                            modifier = Modifier
                                .clickable(enabled = enabled, role = Role.Button) {
                                    passwordVisible = !passwordVisible
                                }
                                .padding(start = 12.dp),
                        )
                    }
                }
            },
        )
        (errorText ?: supportingText)?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = if (hasError) scheme.error else scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
