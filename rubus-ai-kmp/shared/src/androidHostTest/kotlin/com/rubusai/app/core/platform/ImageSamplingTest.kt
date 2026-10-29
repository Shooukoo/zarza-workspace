package com.rubusai.app.core.platform

import kotlin.test.Test
import kotlin.test.assertEquals

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
            assertEquals(true, side / sample >= IMAGE_MAX_SIDE_PX || sample == 1, "side=$side sample=$sample")
        }
    }

    @Test
    fun unaImagenPequenaNoSeSubmuestrea() = assertEquals(1, sampleSizeFor(800, 600))
}
