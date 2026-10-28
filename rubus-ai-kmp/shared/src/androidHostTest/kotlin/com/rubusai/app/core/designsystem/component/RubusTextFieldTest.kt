package com.rubusai.app.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertHeightIsEqualTo
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.getUnclippedBoundsInRoot
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.height
import com.rubusai.app.core.designsystem.theme.RubusDimens
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
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
    fun elBotonDeContrasenaTieneAreaTactilDe48dp() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "",
                    onValueChange = {},
                    label = "Clave",
                    isPassword = true,
                    showPasswordLabel = "Mostrar",
                    hidePasswordLabel = "Ocultar",
                )
            }
        }

        rule.onNodeWithText("Mostrar").assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp)
    }

    @Test
    fun elCampoDeContrasenaNoEsMasAltoQueElNormal() {
        rule.setContent {
            RubusTheme {
                RubusTextField(value = "", onValueChange = {}, label = "Normal")
                RubusTextField(
                    value = "",
                    onValueChange = {},
                    label = "Clave",
                    isPassword = true,
                    showPasswordLabel = "Mostrar",
                    hidePasswordLabel = "Ocultar",
                )
            }
        }

        // El botón de 48 dp cabe dentro del alto del campo; no debe agrandarlo. El alto de
        // referencia es el del campo normal (el texto de 26,6 sp más el relleno supera los 50 dp).
        val normal = rule.onNode(hasSetTextAction() and hasContentDescription("Normal"))
            .getUnclippedBoundsInRoot().height
        // Holgura de 2 dp por el redondeo del interlineado; detecta relleno duplicado.
        assertTrue(normal >= RubusDimens.ButtonHeight && normal <= RubusDimens.ButtonHeight + 2.dp)
        rule.onNode(hasSetTextAction() and hasContentDescription("Clave")).assertHeightIsEqualTo(normal)
    }

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

    @Test
    fun laEtiquetaDaNombreAlCampo() {
        rule.setContent { RubusTheme { RubusTextField(value = "", onValueChange = {}, label = "Correo") } }

        rule.onNode(hasSetTextAction() and hasContentDescription("Correo")).assertExists()
    }

    @Test
    fun elErrorSeAdjuntaAlCampo() {
        rule.setContent {
            RubusTheme {
                RubusTextField(value = "", onValueChange = {}, label = "Correo", errorText = "Obligatorio")
            }
        }

        rule.onNode(hasEditableText())
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Error, "Obligatorio"))
    }

    @Test
    fun soloAyudaSeMuestra() {
        rule.setContent {
            RubusTheme {
                RubusTextField(value = "", onValueChange = {}, label = "Correo", supportingText = "Texto de ayuda")
            }
        }

        rule.onNodeWithText("Texto de ayuda").assertIsDisplayed()
    }

    @Test
    fun alternarDeVueltaVuelveAOcultar() {
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

        rule.onNodeWithText("Mostrar").performClick()
        rule.onNodeWithText("Ocultar").performClick()

        rule.onNode(editableTextIs("•••••••")).assertIsDisplayed()
        rule.onNodeWithText("Mostrar").assertIsDisplayed()
    }

    @Test
    fun deshabilitadoDesactivaElBotonDeContrasena() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "secreto",
                    onValueChange = {},
                    label = "Contraseña",
                    enabled = false,
                    isPassword = true,
                    showPasswordLabel = "Mostrar",
                    hidePasswordLabel = "Ocultar",
                )
            }
        }

        rule.onNodeWithText("Mostrar").assertIsNotEnabled()
    }

    @Test
    fun contrasenaSinTextosEsInvalida() {
        assertFailsWith<IllegalArgumentException> {
            rule.setContent {
                RubusTheme { RubusTextField(value = "", onValueChange = {}, label = "C", isPassword = true) }
            }
        }
    }

    @Test
    fun laEtiquetaNoSeLeeAparte() {
        rule.setContent { RubusTheme { RubusTextField(value = "", onValueChange = {}, label = "Correo") } }

        rule.onNodeWithText("Correo").assertDoesNotExist()
    }

    @Test
    fun soloElErrorSeAnuncia() {
        rule.setContent {
            RubusTheme {
                RubusTextField(value = "", onValueChange = {}, label = "Correo", errorText = "Obligatorio")
            }
        }

        rule.onNodeWithText("Obligatorio")
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.LiveRegion, LiveRegionMode.Polite))
    }

    @Test
    fun laAyudaNoSeAnuncia() {
        rule.setContent {
            RubusTheme {
                RubusTextField(value = "", onValueChange = {}, label = "Correo", supportingText = "Ayuda")
            }
        }

        rule.onNodeWithText("Ayuda")
            .assert(SemanticsMatcher.keyNotDefined(SemanticsProperties.LiveRegion))
    }

    private fun hasEditableText() = SemanticsMatcher.keyIsDefined(SemanticsProperties.EditableText)

    private fun editableTextIs(texto: String) =
        SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString(texto))
}
