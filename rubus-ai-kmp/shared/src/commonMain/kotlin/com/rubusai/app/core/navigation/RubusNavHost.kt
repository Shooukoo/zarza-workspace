package com.rubusai.app.core.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.dev.CatalogoScreen
import com.rubusai.app.dev.DiagnosticoScreen

/**
 * Grafo de la app. Cada destino migrado es un marcador con el nombre de la ruta; cada fase
 * sustituye los suyos por la pantalla real. `Diagnostico` y `Catalogo` solo existen en dev.
 */
@Composable
fun RubusNavHost(
    environment: Environment,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    val enDev = remember(environment) { Route.Diagnostico::class in registeredRoutes(environment) }

    NavHost(navController = navController, startDestination = StartRoute, modifier = modifier) {
        composable<Route.Splash> {
            Marcador("Splash") {
                if (enDev) {
                    // launchSingleTop: un doble toque no apila la pantalla dev dos veces.
                    RubusButton(
                        text = "Diagnóstico",
                        onClick = { navController.navigate(Route.Diagnostico) { launchSingleTop = true } },
                        variant = RubusButtonVariant.Secondary,
                    )
                    RubusButton(
                        text = "Catálogo",
                        onClick = { navController.navigate(Route.Catalogo) { launchSingleTop = true } },
                        variant = RubusButtonVariant.Outline,
                    )
                }
            }
        }
        composable<Route.Login> { Marcador("Login") }
        composable<Route.Home> { Marcador("Home") }
        composable<Route.History> { Marcador("History") }
        composable<Route.Solicitudes> { Marcador("Solicitudes") }
        composable<Route.SolicitudDetalle> { entry ->
            Marcador("Solicitud ${entry.toRoute<Route.SolicitudDetalle>().id}")
        }
        composable<Route.Notifications> { Marcador("Notifications") }
        composable<Route.Profile> { Marcador("Profile") }
        composable<Route.Capture> { Marcador("Capture") }
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
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(text = nombre, style = MaterialTheme.typography.headlineLarge)
            content()
        }
    }
}
