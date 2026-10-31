package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Lo que el servidor manda por el socket: la confirmación de auth o un evento de negocio. */
internal sealed interface ServerMessage {
    data object AuthOk : ServerMessage

    data class Evento(val evento: RealtimeEvent) : ServerMessage
}

/**
 * Convierte un mensaje de texto del servidor (`{"event":"…","data":{…}}`) en un [ServerMessage].
 * Devuelve `null` si no es un objeto JSON con `event` de texto, o si `analisis_listo` llega sin `data.id`.
 */
internal fun parseServerMessage(texto: String): ServerMessage? {
    val objeto = try {
        Json.parseToJsonElement(texto) as? JsonObject
    } catch (e: IllegalArgumentException) {
        // SerializationException (JSON roto) es una IllegalArgumentException.
        null
    } ?: return null
    val nombre = objeto.cadena("event") ?: return null
    return when (nombre) {
        "auth_ok" -> ServerMessage.AuthOk
        "analisis_listo" -> {
            val data = objeto["data"] as? JsonObject ?: return null
            val id = data.cadena("id") ?: return null
            ServerMessage.Evento(RealtimeEvent.AnalisisListo(id, data.cadena("imageId").orEmpty()))
        }
        else -> ServerMessage.Evento(RealtimeEvent.Desconocido(nombre))
    }
}

/** El valor de [clave] si es una cadena JSON (no un número, ni `null`). */
private fun JsonObject.cadena(clave: String): String? =
    (this[clave] as? JsonPrimitive)?.takeIf { it.isString }?.content
