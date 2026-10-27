package com.rubusai.app.core.navigation

import com.rubusai.app.core.config.Environment
import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.descriptors.elementDescriptors
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RoutesTest {

    private val migradas = listOf(
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

    @Test
    fun elInicioEsElSplash() {
        assertEquals(Route.Splash, StartRoute)
    }

    @Test
    fun prodSoloTieneLasRutasMigradas() {
        assertEquals(migradas, registeredRoutes(Environment.PROD))
    }

    @Test
    fun stagingSoloTieneLasRutasMigradas() {
        assertEquals(migradas, registeredRoutes(Environment.STAGING))
    }

    @Test
    fun devAnadeDiagnosticoYCatalogo() {
        val rutas = registeredRoutes(Environment.DEV)

        assertEquals(migradas, rutas.take(migradas.size))
        assertTrue(Route.Diagnostico::class in rutas)
        assertTrue(Route.Catalogo::class in rutas)
        assertEquals(migradas.size + 2, rutas.size)
    }

    @Test
    fun diagnosticoYCatalogoNoEstanFueraDeDev() {
        for (entorno in listOf(Environment.STAGING, Environment.PROD)) {
            val rutas = registeredRoutes(entorno)

            assertFalse(Route.Diagnostico::class in rutas)
            assertFalse(Route.Catalogo::class in rutas)
        }
    }

    // sealedSubclasses es solo JVM: se leen del descriptor, donde el elemento [1] es el "value" del sealed
    // (el [0] es "type") y sus hijos son los subtipos declarados.
    @OptIn(ExperimentalSerializationApi::class)
    @Test
    fun todoSubtipoDeRouteEstaRegistradoEnDev() {
        val declaradas = Route.serializer().descriptor.elementDescriptors.toList()[1]
            .elementDescriptors.map { it.serialName }.toSet()

        assertEquals(declaradas, registeredRoutes(Environment.DEV).map { it.qualifiedName }.toSet())
    }
}
