package com.rubusai.app.feature.aviso

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AvisoSnackbarTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun conUnAvisoMuestraElTexto() {
        rule.setContent { RubusTheme { AvisoSnackbar(aviso = Aviso(1), onMostrado = {}) } }

        rule.waitUntilAtLeastOneExists(hasText("¡Análisis listo!"), timeoutMillis = 5_000)
    }

    @Test
    fun sinAvisoNoMuestraNada() {
        rule.setContent { RubusTheme { AvisoSnackbar(aviso = null, onMostrado = {}) } }
        rule.waitForIdle()

        rule.onAllNodesWithText("¡Análisis listo!").assertCountEquals(0)
    }

    @Test
    fun alTerminarDeMostrarseAvisaConSuId() {
        val mostrados = mutableListOf<Long>()
        rule.setContent { RubusTheme { AvisoSnackbar(aviso = Aviso(7), onMostrado = { mostrados += it }) } }
        rule.waitUntilAtLeastOneExists(hasText("¡Análisis listo!"), timeoutMillis = 5_000)

        // SnackbarDuration.Short dura ~4 s; el reloj del test avanza solo.
        rule.waitUntil(timeoutMillis = 10_000) { mostrados.isNotEmpty() }

        assertEquals(listOf(7L), mostrados)
    }
}
