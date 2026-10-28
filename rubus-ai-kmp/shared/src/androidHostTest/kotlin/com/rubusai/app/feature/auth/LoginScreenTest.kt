package com.rubusai.app.feature.auth

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performImeAction
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

    private val mensajesDeFalla = mapOf(
        LoginFailure.InvalidCredentials to "Correo o contraseña incorrectos.",
        LoginFailure.RateLimited to "Demasiados intentos. Espera un minuto.",
        LoginFailure.Network to "Sin conexión con el servidor. Verifica tu red.",
        LoginFailure.InvalidInput to "Revisa el correo y la contraseña.",
        LoginFailure.UnsupportedRole to "Tu cuenta tiene un rol que esta versión de la app no reconoce.",
        LoginFailure.Unexpected to "Ocurrió un error. Intenta de nuevo.",
    )

    private val mensajesDeCampo = mapOf(
        LoginFieldError.EmailRequired to "Escribe tu correo.",
        LoginFieldError.EmailInvalid to "Escribe un correo válido.",
        LoginFieldError.PasswordRequired to "Escribe tu contraseña.",
    )

    @Test
    fun cadaFallaMuestraSuPropioMensaje() {
        // Si se añade un caso nuevo sin mensaje esperado, esto avisa.
        assertEquals(LoginFailure.entries.toSet(), mensajesDeFalla.keys)
        assertEquals(mensajesDeFalla.size, mensajesDeFalla.values.toSet().size)
        var state by mutableStateOf(LoginUiState())
        rule.setContent {
            RubusTheme {
                LoginScreen(
                    state = state, sessionExpired = false, onEmailChange = {},
                    onPasswordChange = {}, onSubmit = {},
                )
            }
        }
        for ((falla, texto) in mensajesDeFalla) {
            state = LoginUiState(formError = falla)
            rule.waitForIdle()
            rule.onNodeWithText(texto).assertIsDisplayed()
            for (otro in mensajesDeFalla.values - texto) rule.onNodeWithText(otro).assertDoesNotExist()
        }
    }

    @Test
    fun cadaErrorDeCampoMuestraSuPropioMensaje() {
        assertEquals(LoginFieldError.entries.toSet(), mensajesDeCampo.keys)
        assertEquals(mensajesDeCampo.size, mensajesDeCampo.values.toSet().size)
        var state by mutableStateOf(LoginUiState())
        rule.setContent {
            RubusTheme {
                LoginScreen(
                    state = state, sessionExpired = false, onEmailChange = {},
                    onPasswordChange = {}, onSubmit = {},
                )
            }
        }
        for ((error, texto) in mensajesDeCampo) {
            state = LoginUiState(emailError = error)
            rule.waitForIdle()
            rule.onNodeWithText(texto).assertIsDisplayed()
            for (otro in mensajesDeCampo.values - texto) rule.onNodeWithText(otro).assertDoesNotExist()
        }
    }

    @Test
    fun mientrasEnviaLosCamposEstanDeshabilitados() {
        render(LoginUiState(submitting = true))
        awaitText("ENTRANDO…")

        // Deshabilitado, el campo pierde la acción de texto: se localiza por su nombre accesible.
        rule.onNode(hasContentDescription("Correo electrónico")).assertIsNotEnabled()
        rule.onNode(hasContentDescription("Contraseña")).assertIsNotEnabled()
    }

    @Test
    fun laAccionDoneDelTecladoEnviaElFormulario() {
        var enviados = 0
        render(onSubmit = { enviados++ })
        awaitText("INICIAR SESIÓN")

        rule.onAllNodes(hasSetTextAction())[1].performImeAction()

        assertEquals(1, enviados)
    }
}
