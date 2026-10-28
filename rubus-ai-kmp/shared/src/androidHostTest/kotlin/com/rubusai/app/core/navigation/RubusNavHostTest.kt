package com.rubusai.app.core.navigation

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import androidx.navigation.NavGraph
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.data.auth.anaAdmin
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.feature.auth.LoginViewModel
import com.rubusai.app.feature.home.HomeViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import org.junit.Rule
import org.junit.runner.RunWith
import org.koin.compose.KoinApplication
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Pantalla alta (411x891 dp) a propósito: con la de Robolectric por defecto (320x470) el Login
// desplazable deja los botones dev fuera del viewport y los toques no los alcanzan.
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h891dp")
class RubusNavHostTest {

    @get:Rule
    val rule = createComposeRule()

    // Koin acotado a la composición (no el global): Login y Home piden sus ViewModels.
    private fun testModule(): Module {
        val manager = SessionManager(
            FakeAuthRepository(), InMemoryTokenStorage(), InMemoryUserStorage(), SessionEvents(),
            scope = CoroutineScope(SupervisorJob()),
        )
        return module {
            single { manager }
            viewModelOf(::LoginViewModel)
            viewModelOf(::HomeViewModel)
        }
    }

    private fun render(
        env: Environment,
        state: MutableState<SessionState> = mutableStateOf(SessionState.Loading),
    ): NavHostController {
        lateinit var nav: NavHostController
        rule.setContent {
            KoinApplication(application = { modules(testModule()) }) {
                nav = rememberNavController()
                RubusTheme { RubusNavHost(environment = env, sessionState = state.value, navController = nav) }
            }
        }
        rule.waitForIdle()
        return nav
    }

    private fun setSession(state: MutableState<SessionState>, value: SessionState) {
        rule.runOnIdle { state.value = value }
        rule.waitForIdle()
    }

    private fun NavHostController.visibleRoutes(): List<String?> =
        currentBackStack.value.filter { it.destination !is NavGraph }.map { it.destination.route }

    private fun route(route: Route) = route::class.qualifiedName

    // Une el registro (registeredRoutes) con el grafo real: una ruta sin composable<>, o un
    // composable<> sin registrar, rompe el test.
    private fun assertGrafoIgualARegistro(env: Environment) {
        val nav = render(env)

        // El patrón puede llevar "/{arg}" o "?opt={arg}": nos quedamos con el nombre de la clase.
        val enGrafo = nav.graph.map { it.route!!.substringBefore('/').substringBefore('?') }.toSet()
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
    fun mientrasCargaLaSesionSeQuedaEnElSplash() {
        val nav = render(Environment.PROD)

        assertEquals(listOf(route(Route.Splash)), nav.visibleRoutes())
    }

    @Test
    fun sinSesionVaAlLogin() {
        val state = mutableStateOf<SessionState>(SessionState.Loading)
        val nav = render(Environment.PROD, state)

        setSession(state, SessionState.Unauthenticated())

        assertEquals(listOf(route(Route.Login)), nav.visibleRoutes())
    }

    @Test
    fun conSesionVaAHomeYAtrasNoVuelveAlSplashNiAlLogin() {
        val state = mutableStateOf<SessionState>(SessionState.Loading)
        val nav = render(Environment.PROD, state)
        setSession(state, SessionState.Unauthenticated())

        setSession(state, SessionState.Authenticated(ana))

        assertEquals(listOf(route(Route.Home)), nav.visibleRoutes())
    }

    @Test
    fun alExpirarLaSesionVuelveAlLoginConElAvisoYSinPilaPrevia() {
        val state = mutableStateOf<SessionState>(SessionState.Authenticated(ana))
        val nav = render(Environment.PROD, state)

        setSession(state, SessionState.Unauthenticated(expired = true))

        assertEquals(listOf(route(Route.Login)), nav.visibleRoutes())
        rule.waitUntilAtLeastOneExists(hasText("Tu sesión expiró. Inicia sesión de nuevo."), timeoutMillis = 5_000)
    }

    @Test
    fun unRefrescoDelUsuarioNoNavega() {
        val state = mutableStateOf<SessionState>(SessionState.Authenticated(ana))
        val nav = render(Environment.PROD, state)
        var cambios = 0
        rule.runOnUiThread { nav.addOnDestinationChangedListener { _, _, _ -> cambios++ } }
        val antes = cambios

        setSession(state, SessionState.Authenticated(anaAdmin))

        assertEquals(antes, cambios)
        assertEquals(listOf(route(Route.Home)), nav.visibleRoutes())
    }

    @Test
    fun enDevElLoginOfreceDiagnosticoYCatalogo() {
        render(Environment.DEV, mutableStateOf(SessionState.Unauthenticated()))

        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun enDevElHomeOfreceDiagnosticoYCatalogo() {
        render(Environment.DEV, mutableStateOf(SessionState.Authenticated(ana)))

        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun undobleToqueEnCatalogoNoLoApilaDosVeces() {
        val nav = render(Environment.DEV, mutableStateOf(SessionState.Unauthenticated()))

        // Reloj parado: la transición no termina y el botón sigue en pantalla para el 2.º toque.
        rule.mainClock.autoAdvance = false
        rule.onNodeWithText("CATÁLOGO").performClick()
        rule.onNodeWithText("CATÁLOGO").performClick()
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()

        val catalogos = nav.currentBackStack.value.count { it.destination.route == Route.Catalogo::class.qualifiedName }
        assertEquals(1, catalogos)
    }

    @Test
    fun enProdElLoginNoOfreceRutasDeDesarrollo() {
        render(Environment.PROD, mutableStateOf(SessionState.Unauthenticated()))
        rule.waitUntilAtLeastOneExists(hasText("INICIAR SESIÓN"), timeoutMillis = 5_000)

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }

    @Test
    fun enStagingElLoginNoOfreceRutasDeDesarrollo() {
        render(Environment.STAGING, mutableStateOf(SessionState.Unauthenticated()))
        rule.waitUntilAtLeastOneExists(hasText("INICIAR SESIÓN"), timeoutMillis = 5_000)

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }
}
