package com.rubusai.app.feature.auth

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.dev.DevActions
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Pantalla alta (411x891 dp) a propósito: con la de Robolectric por defecto (320x470) el
// formulario desplazable deja los botones dev fuera del viewport y assertIsDisplayed falla.
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h891dp")
class LoginScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private fun render(
        state: LoginUiState = LoginUiState(),
        sessionExpired: Boolean = false,
        devActions: DevActions? = null,
        onEmailChange: (String) -> Unit = {},
        onSubmit: () -> Unit = {},
    ) {
        rule.setContent {
            RubusTheme {
                LoginScreen(
                    state = state,
                    sessionExpired = sessionExpired,
                    onEmailChange = onEmailChange,
                    onPasswordChange = {},
                    onSubmit = onSubmit,
                    devActions = devActions,
                )
            }
        }
    }

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    @Test
    fun muestraLosErroresDeCampo() {
        render(LoginUiState(emailError = LoginFieldError.EmailInvalid, passwordError = LoginFieldError.PasswordRequired))

        awaitText("Escribe un correo válido.")
        awaitText("Escribe tu contraseña.")
    }

    @Test
    fun muestraElErrorDeCredencialesBajoElFormulario() {
        render(LoginUiState(formError = LoginFailure.InvalidCredentials))

        awaitText("Correo o contraseña incorrectos.")
    }

    @Test
    fun mientrasEnviaElBotonDiceEntrandoYEstaDeshabilitado() {
        render(LoginUiState(submitting = true))

        awaitText("ENTRANDO…")
        rule.onNodeWithText("ENTRANDO…").assertIsNotEnabled()
    }

    @Test
    fun elBotonEnviaElFormulario() {
        var enviados = 0
        render(onSubmit = { enviados++ })
        awaitText("INICIAR SESIÓN")

        rule.onNodeWithText("INICIAR SESIÓN").performClick()

        assertEquals(1, enviados)
    }

    @Test
    fun escribirEnElCorreoAvisaDelCambio() {
        var recibido = ""
        render(onEmailChange = { recibido = it })
        // La etiqueta visible no es nodo de texto (clearAndSetSemantics): se espera por el nombre accesible del campo.
        rule.waitUntilAtLeastOneExists(hasContentDescription("Correo electrónico"), timeoutMillis = 5_000)

        rule.onNode(hasSetTextAction() and hasContentDescription("Correo electrónico")).performTextInput("a")

        assertEquals("a", recibido)
    }

    @Test
    fun muestraElAvisoDeSesionExpirada() {
        render(sessionExpired = true)

        awaitText("Tu sesión expiró. Inicia sesión de nuevo.")
    }

    @Test
    fun sinExpiracionNoMuestraElAviso() {
        render(sessionExpired = false)
        awaitText("INICIAR SESIÓN")

        rule.onNodeWithText("Tu sesión expiró. Inicia sesión de nuevo.").assertDoesNotExist()
    }

    @Test
    fun laContrasenaSePuedeMostrarYOcultar() {
        render()
        awaitText("Mostrar")

        rule.onNodeWithText("Mostrar").performClick()

        awaitText("Ocultar")
    }

    @Test
    fun losBotonesDevSoloSalenConDevActions() {
        render(devActions = DevActions(onDiagnostico = {}, onCatalogo = {}))

        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun sinDevActionsNoHayBotonesDev() {
        render(devActions = null)
        awaitText("INICIAR SESIÓN")

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }
}
