package com.rubusai.app.core.platform

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ImageSamplingTest {

    @Test
    fun unaFotoDe12MpNoSeSubmuestrea() = assertEquals(1, sampleSizeFor(4000, 3000))

    @Test
    fun unaFotoMuyGrandeSeSubmuestreaEnPotenciasDeDos() {
        assertEquals(2, sampleSizeFor(8000, 6000))
        assertEquals(4, sampleSizeFor(16000, 12000))
    }

    @Test
    fun elSubmuestreoNuncaDejaElLadoLargoPorDebajoDelMaximo() {
        for (side in listOf(2049, 3000, 4095, 4096, 4100, 8191, 8192, 20000)) {
            val sample = sampleSizeFor(side, side / 2)
            val msg = "side=$side sample=$sample"
            assertTrue(sample >= 1 && (sample and (sample - 1)) == 0, msg)
            if (sample == 1) {
                assertTrue(side / 2 < IMAGE_MAX_SIDE_PX, msg)
            } else {
                assertTrue(side / sample >= IMAGE_MAX_SIDE_PX, msg)
                assertTrue(side / (sample * 2) < IMAGE_MAX_SIDE_PX, msg)
            }
        }
    }

    @Test
    fun unaImagenPequenaNoSeSubmuestrea() = assertEquals(1, sampleSizeFor(800, 600))
}
