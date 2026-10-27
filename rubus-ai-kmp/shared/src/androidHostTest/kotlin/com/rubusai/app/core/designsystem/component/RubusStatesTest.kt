package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusStatesTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun cargaMuestraElMensaje() {
        rule.setContent { RubusTheme { RubusLoadingState(modifier = Modifier.fillMaxSize(), message = "Cargando análisis") } }

        rule.onNodeWithText("Cargando análisis").assertIsDisplayed()
    }

    @Test
    fun errorMuestraElMensaje() {
        rule.setContent { RubusTheme { RubusErrorState(modifier = Modifier.fillMaxSize(), message = "Sin conexión") } }

        rule.onNodeWithText("Sin conexión").assertIsDisplayed()
    }

    @Test
    fun errorSinReintentoNoMuestraBoton() {
        rule.setContent { RubusTheme { RubusErrorState(message = "Sin conexión") } }

        rule.onNodeWithText("REINTENTAR").assertDoesNotExist()
    }

    @Test
    fun reintentarLlamaAOnRetry() {
        var reintentos = 0
        rule.setContent {
            RubusTheme {
                RubusErrorState(
                    modifier = Modifier.fillMaxSize(),
                    message = "Sin conexión",
                    retryLabel = "Reintentar",
                    onRetry = { reintentos++ },
                )
            }
        }

        rule.onNodeWithText("REINTENTAR").performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun retryLabelSinOnRetryEsInvalido() {
        assertFailsWith<IllegalArgumentException> {
            rule.setContent { RubusTheme { RubusErrorState(message = "x", retryLabel = "Reintentar") } }
        }
    }

    @Test
    fun onRetrySinRetryLabelEsInvalido() {
        assertFailsWith<IllegalArgumentException> {
            rule.setContent { RubusTheme { RubusErrorState(message = "x", onRetry = {}) } }
        }
    }
}
