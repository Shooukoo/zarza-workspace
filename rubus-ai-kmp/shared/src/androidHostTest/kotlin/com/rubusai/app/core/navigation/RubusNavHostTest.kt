package com.rubusai.app.core.navigation

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusNavHostTest {

    @get:Rule
    val rule = createComposeRule()

    private fun render(env: Environment): NavHostController {
        lateinit var nav: NavHostController
        rule.setContent {
            nav = rememberNavController()
            RubusTheme { RubusNavHost(environment = env, navController = nav) }
        }
        rule.waitForIdle()
        return nav
    }

    // Une el registro (registeredRoutes) con el grafo real: una ruta sin composable<>, o un
    // composable<> sin registrar, rompe el test.
    private fun assertGrafoIgualARegistro(env: Environment) {
        val nav = render(env)

        val enGrafo = nav.graph.map { it.route!!.substringBefore('/') }.toSet()
        val registradas = registeredRoutes(env).map { it.qualifiedName!! }.toSet()

        assertTrue(registradas.isNotEmpty())
        assertEquals(registradas, enGrafo)
    }

    @Test
    fun grafoDevCoincideConRutasRegistradas() = assertGrafoIgualARegistro(Environment.DEV)

    @Test
    fun grafoStagingCoincideConRutasRegistradas() = assertGrafoIgualARegistro(Environment.STAGING)

    @Test
    fun grafoProdCoincideConRutasRegistradas() = assertGrafoIgualARegistro(Environment.PROD)

    @Test
    fun enDevElSplashOfreceDiagnosticoYCatalogo() {
        render(Environment.DEV)

        rule.onNodeWithText("Splash").assertIsDisplayed()
        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun enProdElSplashNoOfreceRutasDeDesarrollo() {
        render(Environment.PROD)

        rule.onNodeWithText("Splash").assertIsDisplayed()
        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }

    @Test
    fun enStagingElSplashNoOfreceRutasDeDesarrollo() {
        render(Environment.STAGING)

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }
}
