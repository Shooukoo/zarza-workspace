package com.rubusai.app.core.designsystem.component

import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.assert
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHasNoClickAction
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusCardTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun muestraSuContenido() {
        rule.setContent { RubusTheme { RubusCard { Text("Contenido") } } }

        rule.onNodeWithText("Contenido").assertIsDisplayed()
    }

    @Test
    fun sinOnClickNoEsClicable() {
        rule.setContent { RubusTheme { RubusCard { Text("Contenido") } } }

        rule.onNodeWithText("Contenido").assertHasNoClickAction()
    }

    @Test
    fun elContenidoTomaElColorSobreSuperficie() {
        var esperado: Color? = null
        var obtenido: Color? = null
        rule.setContent {
            RubusTheme {
                esperado = MaterialTheme.colorScheme.onSurface
                RubusCard { obtenido = LocalContentColor.current }
            }
        }

        rule.waitForIdle()
        assertEquals(esperado, obtenido)
    }

    @Test
    fun conOnClickLoLlama() {
        var clics = 0
        rule.setContent { RubusTheme { RubusCard(onClick = { clics++ }) { Text("Contenido") } } }

        rule.onNodeWithText("Contenido").assertHasClickAction()
            .assert(SemanticsMatcher.expectValue(SemanticsProperties.Role, Role.Button))
            .performClick()

        assertEquals(1, clics)
    }
}
