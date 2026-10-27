package com.rubusai.app.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.text.AnnotatedString
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusTextFieldTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun muestraElTextoDeError() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "",
                    onValueChange = {},
                    label = "Correo",
                    errorText = "Obligatorio",
                    supportingText = "Texto de ayuda",
                )
            }
        }

        rule.onNodeWithText("Obligatorio").assertIsDisplayed()
        // El error sustituye a la ayuda.
        rule.onNodeWithText("Texto de ayuda").assertDoesNotExist()
    }

    @Test
    fun deshabilitadoNoAceptaTexto() {
        rule.setContent {
            RubusTheme { RubusTextField(value = "", onValueChange = {}, label = "Correo", enabled = false) }
        }

        // Deshabilitado no expone la acción de escribir, así que se localiza por su texto editable.
        rule.onNode(hasEditableText()).assertIsNotEnabled()
        rule.onNode(hasSetTextAction()).assertDoesNotExist()
    }

    @Test
    fun escribirLlamaAOnValueChange() {
        var valor by mutableStateOf("")
        rule.setContent {
            RubusTheme { RubusTextField(value = valor, onValueChange = { valor = it }, label = "Correo") }
        }

        rule.onNode(hasSetTextAction()).performTextInput("ana@example.com")

        assertEquals("ana@example.com", valor)
    }

    @Test
    fun laContrasenaSeOcultaYSeMuestraConElBoton() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "secreto",
                    onValueChange = {},
                    label = "Contraseña",
                    isPassword = true,
                    showPasswordLabel = "Mostrar",
                    hidePasswordLabel = "Ocultar",
                )
            }
        }

        // InputText conserva el valor real; lo que se pinta (EditableText) es lo que se oculta.
        rule.onNode(editableTextIs("•••••••")).assertIsDisplayed()

        rule.onNodeWithText("Mostrar").performClick()

        rule.onNode(editableTextIs("secreto")).assertIsDisplayed()
        rule.onNodeWithText("Ocultar").assertIsDisplayed()
    }

    private fun hasEditableText() = SemanticsMatcher.keyIsDefined(SemanticsProperties.EditableText)

    private fun editableTextIs(texto: String) =
        SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString(texto))
}
