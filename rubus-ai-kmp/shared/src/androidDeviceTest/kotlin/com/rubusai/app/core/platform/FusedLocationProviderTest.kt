package com.rubusai.app.core.platform

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.system.measureTimeMillis
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FusedLocationProviderTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun sinPermisoDevuelveNullAlInstante() {
        // La app de pruebas no declara ni tiene el permiso de ubicación.
        val provider = FusedLocationProvider(context)

        var result: Coordinates? = Coordinates(0.0, 0.0)
        val elapsed = measureTimeMillis { result = runBlocking { provider.current() } }

        assertNull(result)
        assertTrue(elapsed < 1_000, "tardó $elapsed ms")
    }
}
