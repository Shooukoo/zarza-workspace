package com.rubusai.app.core.navigation

import com.rubusai.app.core.config.Environment
import kotlin.reflect.KClass
import kotlinx.serialization.Serializable

/**
 * Destinos de la app. Los parámetros viajan en la propia ruta (Navigation Compose tipado).
 * Panel admin y registro de usuarios no se migran, así que no tienen ruta.
 */
@Serializable
sealed interface Route {
    @Serializable data object Splash : Route
    @Serializable data object Login : Route
    @Serializable data object Home : Route
    @Serializable data object History : Route
    @Serializable data object Solicitudes : Route
    @Serializable data class SolicitudDetalle(val id: String) : Route
    @Serializable data object Notifications : Route
    @Serializable data object Profile : Route
    @Serializable data object Capture : Route
    @Serializable data class Result(val id: String) : Route
    @Serializable data object Queue : Route

    /** Solo en el flavor dev: flavor, URL y prueba de conexión. */
    @Serializable data object Diagnostico : Route

    /** Solo en el flavor dev: los componentes del design system. */
    @Serializable data object Catalogo : Route
}

internal val StartRoute: Route = Route.Splash

internal val migratedRoutes: List<KClass<out Route>> = listOf(
    Route.Splash::class,
    Route.Login::class,
    Route.Home::class,
    Route.History::class,
    Route.Solicitudes::class,
    Route.SolicitudDetalle::class,
    Route.Notifications::class,
    Route.Profile::class,
    Route.Capture::class,
    Route.Result::class,
    Route.Queue::class,
)

private val devRoutes: List<KClass<out Route>> = listOf(
    Route.Diagnostico::class,
    Route.Catalogo::class,
)

/** Rutas que existen en el grafo de [environment]: las de desarrollo solo en DEV. */
internal fun registeredRoutes(environment: Environment): List<KClass<out Route>> =
    if (environment == Environment.DEV) migratedRoutes + devRoutes else migratedRoutes
