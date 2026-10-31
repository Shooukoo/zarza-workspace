package com.rubusai.app.core.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.dev.CatalogoScreen
import com.rubusai.app.dev.DevActions
import com.rubusai.app.dev.DiagnosticoScreen
import com.rubusai.app.feature.auth.LoginRoute
import com.rubusai.app.feature.capture.CaptureRoute
import com.rubusai.app.feature.home.HomeRoute
import com.rubusai.app.feature.splash.SplashScreen

// Home lo lee al volver de la captura para mostrar "Imagen enviada".
private const val UPLOADED_KEY = "imagen_enviada"

/**
 * Grafo de la app. Redirige según [sessionState]: `Loading` se queda en el Splash,
 * `Authenticated` va a `Home` y `Unauthenticated` a `Login`. Cada destino todavía no migrado
 * es un marcador con el nombre de la ruta; cada fase sustituye los suyos por la pantalla real.
 * `Diagnostico` y `Catalogo` solo existen en dev.
 */
@Composable
fun RubusNavHost(
    environment: Environment,
    sessionState: SessionState,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    val enDev = remember(environment) { Route.Diagnostico::class in registeredRoutes(environment) }
    val devActions = remember(navController, enDev) {
        if (enDev) {
            // launchSingleTop: un doble toque no apila la pantalla dev dos veces.
            DevActions(
                onDiagnostico = { navController.navigate(Route.Diagnostico) { launchSingleTop = true } },
                onCatalogo = { navController.navigate(Route.Catalogo) { launchSingleTop = true } },
            )
        } else {
            null
        }
    }

    // Se compara el destino y no el estado: un refresco del usuario (mismo tipo de estado)
    // no vuelve a navegar ni recarga la pantalla.
    val destination: Route? = when (sessionState) {
        SessionState.Loading -> null
        is SessionState.Authenticated -> Route.Home
        is SessionState.Unauthenticated -> Route.Login
    }
    // Guardado entre recreaciones: al rotar, `rememberNavController` ya restaura la pila y
    // volver a navegar destruiría el Login (y lo escrito) o sacaría de una pantalla dev.
    var aplicado by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(destination) {
        val key = destination?.let { it::class.qualifiedName } ?: return@LaunchedEffect
        if (key == aplicado) return@LaunchedEffect
        aplicado = key
        // Vacía toda la pila: "atrás" no debe volver al Splash, al login ni a la sesión anterior.
        navController.navigate(destination) { popUpTo(navController.graph.id) { inclusive = true } }
    }

    // Con el proceso restaurado la pila puede ser [Home] y la sesión aún estar cargando: no se
    // compone el grafo hasta saber la sesión (el navController vive fuera, la pila se conserva).
    if (sessionState == SessionState.Loading) {
        SplashScreen(modifier)
        return
    }

    NavHost(navController = navController, startDestination = StartRoute, modifier = modifier) {
        composable<Route.Splash> { SplashScreen() }
        composable<Route.Login> {
            LoginRoute(
                sessionExpired = (sessionState as? SessionState.Unauthenticated)?.expired == true,
                devActions = devActions,
            )
        }
        composable<Route.Home> { entry ->
            val uploaded by entry.savedStateHandle.getStateFlow(UPLOADED_KEY, false).collectAsStateWithLifecycle()
            HomeRoute(
                devActions = devActions,
                uploadNotice = uploaded,
                onCapture = {
                    entry.savedStateHandle[UPLOADED_KEY] = false
                    navController.navigate(Route.Capture) { launchSingleTop = true }
                },
            )
        }
        composable<Route.History> { Marcador("History") }
        composable<Route.Solicitudes> { Marcador("Solicitudes") }
        composable<Route.SolicitudDetalle> { entry ->
            Marcador("Solicitud ${entry.toRoute<Route.SolicitudDetalle>().id}")
        }
        composable<Route.Notifications> { Marcador("Notifications") }
        composable<Route.Profile> { Marcador("Profile") }
        composable<Route.Capture> { entry ->
            // Durante la animación de salida la pantalla sigue compuesta: un 2.º pop sacaría Home.
            val resumed = { entry.lifecycle.currentState == Lifecycle.State.RESUMED }
            CaptureRoute(
                onClose = { if (resumed()) navController.popBackStack() },
                onUploaded = {
                    if (resumed()) {
                        navController.previousBackStackEntry?.savedStateHandle?.set(UPLOADED_KEY, true)
                        navController.popBackStack()
                    }
                },
            )
        }
        composable<Route.Result> { entry ->
            Marcador("Result ${entry.toRoute<Route.Result>().id}")
        }
        composable<Route.Queue> { Marcador("Queue") }
        if (enDev) {
            composable<Route.Diagnostico> { DiagnosticoScreen() }
            composable<Route.Catalogo> { CatalogoScreen() }
        }
    }
}

// Destino vacío de una ruta que todavía no tiene pantalla.
@Composable
private fun Marcador(nombre: String, content: @Composable ColumnScope.() -> Unit = {}) {
    RubusScreen(verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text(text = nombre, style = MaterialTheme.typography.headlineLarge)
        content()
    }
}
