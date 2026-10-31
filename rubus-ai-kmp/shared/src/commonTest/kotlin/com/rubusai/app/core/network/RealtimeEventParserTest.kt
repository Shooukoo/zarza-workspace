package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class RealtimeEventParserTest {

    @Test
    fun authOkSeReconoce() {
        assertEquals(ServerMessage.AuthOk, parseServerMessage("""{"event":"auth_ok"}"""))
    }

    @Test
    fun analisisListoCompletoSeConvierteEnEvento() {
        val texto = """{"event":"analisis_listo","data":{"imageId":"raw/x.jpg","id":"a1","userId":"u1"}}"""

        assertEquals(
            ServerMessage.Evento(RealtimeEvent.AnalisisListo(analisisId = "a1", imageId = "raw/x.jpg")),
            parseServerMessage(texto),
        )
    }

    @Test
    fun analisisListoSinImageIdUsaCadenaVacia() {
        val texto = """{"event":"analisis_listo","data":{"id":"a1"}}"""

        assertEquals(
            ServerMessage.Evento(RealtimeEvent.AnalisisListo(analisisId = "a1", imageId = "")),
            parseServerMessage(texto),
        )
    }

    @Test
    fun analisisListoSinIdSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo","data":{"imageId":"raw/x.jpg"}}"""))
    }

    @Test
    fun analisisListoConIdNuloSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo","data":{"id":null}}"""))
    }

    @Test
    fun analisisListoSinDataSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo"}"""))
    }

    @Test
    fun analisisListoConDataQueNoEsObjetoSeDescarta() {
        assertNull(parseServerMessage("""{"event":"analisis_listo","data":"hola"}"""))
    }

    @Test
    fun unEventoQueLaAppNoUsaSaleComoDesconocido() {
        assertEquals(
            ServerMessage.Evento(RealtimeEvent.Desconocido("analysis_validated")),
            parseServerMessage("""{"event":"analysis_validated","data":{"action":"validado"}}"""),
        )
        assertEquals(
            ServerMessage.Evento(RealtimeEvent.Desconocido("pong")),
            parseServerMessage("""{"event":"pong","data":"ok"}"""),
        )
    }

    @Test
    fun loQueNoEsUnObjetoJsonConEventSeDescarta() {
        assertNull(parseServerMessage(""))
        assertNull(parseServerMessage("basura"))
        assertNull(parseServerMessage("[]"))
        assertNull(parseServerMessage("\"auth_ok\""))
        assertNull(parseServerMessage("""{"data":{}}"""))
        assertNull(parseServerMessage("""{"event":42}"""))
        assertNull(parseServerMessage("""{"event":null}"""))
    }
}
