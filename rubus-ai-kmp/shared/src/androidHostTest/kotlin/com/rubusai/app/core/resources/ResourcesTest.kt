package com.rubusai.app.core.resources

import androidx.compose.foundation.Image
import androidx.compose.material3.Text
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.login_submit
import com.rubusai.app.resources.logo_rubus
import kotlin.test.Test
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Primer uso de recursos de texto e imagen de Compose en el proyecto: si Robolectric no los
// resuelve, los tests de pantalla de la fase no se pueden escribir como están en el plan.
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ResourcesTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun lasCadenasDeComposeSeResuelvenEnRobolectric() {
        rule.setContent { Text(stringResource(Res.string.login_submit)) }

        rule.waitUntilAtLeastOneExists(hasText("Iniciar sesión"), timeoutMillis = 5_000)
    }

    @Test
    fun elLogoSeDibuja() {
        rule.setContent {
            Image(painterResource(Res.drawable.logo_rubus), contentDescription = "logo")
        }

        rule.waitUntilAtLeastOneExists(hasContentDescription("logo"), timeoutMillis = 5_000)
    }
}
