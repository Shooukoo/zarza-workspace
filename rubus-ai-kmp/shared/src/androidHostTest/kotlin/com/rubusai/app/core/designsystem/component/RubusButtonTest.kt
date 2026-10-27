package com.rubusai.app.core.designsystem.component

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.assertIsNotEnabled
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
class RubusButtonTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun alPulsarLlamaAOnClick() {
        var clics = 0
        rule.setContent { RubusTheme { RubusButton(text = "Aceptar", onClick = { clics++ }) } }

        rule.onNodeWithText("ACEPTAR").performClick()

        assertEquals(1, clics)
    }

    @Test
    fun deshabilitadoNoLlamaAOnClick() {
        var clics = 0
        rule.setContent {
            RubusTheme { RubusButton(text = "Aceptar", onClick = { clics++ }, enabled = false) }
        }

        rule.onNodeWithText("ACEPTAR").assertIsNotEnabled().performClick()

        assertEquals(0, clics)
    }
}
