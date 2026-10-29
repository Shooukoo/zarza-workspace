package com.rubusai.app.feature.home

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HomeScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private val ana = User("u1", "ana@zarza.example", UserRole.AGRONOMO, "Ana", "Pérez")

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    @Test
    fun muestraNombreCorreoYRolDelUsuario() {
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = {}) } }

        awaitText("Inicio")
        awaitText("Ana")
        awaitText("ana@zarza.example")
        awaitText("Agrónomo")
    }

    @Test
    fun elBotonCierraSesion() {
        var cierres = 0
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = { cierres++ }) } }
        awaitText("CERRAR SESIÓN")

        rule.onNodeWithText("CERRAR SESIÓN").performClick()

        assertEquals(1, cierres)
    }

    @Test
    fun mientrasCierraElBotonDiceCerrandoYEstaDeshabilitado() {
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = true, onLogout = {}) } }

        awaitText("CERRANDO SESIÓN…")
        rule.onNodeWithText("CERRANDO SESIÓN…").assertIsNotEnabled()
    }

    @Test
    fun elBotonCapturarLlamaASuCallback() {
        var capturas = 0
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = {}, onCapture = { capturas++ }) } }
        awaitText("CAPTURAR")

        rule.onNodeWithText("CAPTURAR").performClick()

        assertEquals(1, capturas)
    }

    @Test
    fun muestraElAvisoDeImagenEnviadaSoloSiSeIndica() {
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = {}, uploadNotice = true) } }

        awaitText("Imagen enviada.")
    }
}
