package com.rubusai.app.core.data.campos

import com.rubusai.app.core.model.Campo
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.Serializable

internal sealed interface CamposResult {
    data class Success(val campos: List<Campo>) : CamposResult
    data object Failure : CamposResult
}

internal interface CamposRepository {
    /** `GET campos`. El backend filtra por rol: agrónomo, sus campos asignados; productor, los suyos; admin y monitor, todos. */
    suspend fun list(): CamposResult
}

@Serializable
internal data class CampoDto(val id: String, val nombre: String, val codigoCampo: String = "") {
    fun toCampo() = Campo(id, nombre, codigoCampo)
}

/** Usa el `HttpClient` de la app. Nada de lo que falla se registra: el mensaje de un `ResponseException` incluye el cuerpo. */
internal class CamposRepositoryImpl(private val client: HttpClient) : CamposRepository {

    override suspend fun list(): CamposResult = try {
        CamposResult.Success(client.get("campos").body<List<CampoDto>>().map { it.toCampo() })
    } catch (e: Exception) {
        // Una cancelación de quien llama se propaga; cualquier otra causa (red, 5xx, cuerpo ilegible) es un fallo.
        currentCoroutineContext().ensureActive()
        CamposResult.Failure
    }
}
