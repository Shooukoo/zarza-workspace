package com.rubusai.app.core.data.ingestion

import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.model.UploadResult
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ResponseException
import io.ktor.client.plugins.timeout
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

private const val UPLOAD_TIMEOUT_MS = 90_000L

internal enum class UploadFailure { Network, InvalidImage, RateLimited, Server, Unauthorized, Unexpected }

internal sealed interface UploadOutcome {
    /** [result] es `null` si el backend respondió 409 (la captura ya existía): no hay cuerpo que leer. */
    data class Success(val result: UploadResult?) : UploadOutcome
    data class Failure(val reason: UploadFailure) : UploadOutcome
}

internal interface IngestionRepository {
    /** `POST ingestion/upload`, multipart. [jpeg] ya viene comprimido. */
    suspend fun upload(jpeg: ByteArray, metadata: UploadMetadata): UploadOutcome
}

@Serializable
internal data class UploadResponseDto(
    @SerialName("image_id") val imageId: String,
    @SerialName("storage_key") val storageKey: String,
)

/**
 * Usa el `HttpClient` de la app (con refresh de token). El cuerpo multipart se construye desde un
 * `ByteArray`, así que Ktor puede reenviarlo tras un refresh. El `Content-Type` lo fija el
 * propio multipart (con su `boundary`); no se declara a mano.
 */
internal class IngestionRepositoryImpl(private val client: HttpClient) : IngestionRepository {

    override suspend fun upload(jpeg: ByteArray, metadata: UploadMetadata): UploadOutcome {
        val response = try {
            client.post("ingestion/upload") {
                timeout { requestTimeoutMillis = UPLOAD_TIMEOUT_MS }
                setBody(
                    MultiPartFormDataContent(
                        formData {
                            append(
                                "file",
                                jpeg,
                                Headers.build {
                                    append(HttpHeaders.ContentType, ContentType.Image.JPEG.toString())
                                    append(HttpHeaders.ContentDisposition, "filename=\"${metadata.offlineSyncId}.jpg\"")
                                },
                            )
                            append("campoId", metadata.campoId)
                            append("capturedAt", metadata.capturedAt)
                            append("offlineSyncId", metadata.offlineSyncId)
                            metadata.gpsLat?.let { append("gpsLat", it.toString()) }
                            metadata.gpsLon?.let { append("gpsLon", it.toString()) }
                        },
                    ),
                )
            }
        } catch (e: ResponseException) {
            val status = e.response.status
            return if (status == HttpStatusCode.Conflict) {
                UploadOutcome.Success(null)
            } else {
                UploadOutcome.Failure(status.toUploadFailure())
            }
        } catch (e: Exception) {
            // Una cancelación de quien llama se propaga; cualquier otra excepción sin respuesta
            // del servidor (sin red, timeout) es un fallo de red.
            currentCoroutineContext().ensureActive()
            return UploadOutcome.Failure(UploadFailure.Network)
        }
        val body = try {
            response.body<UploadResponseDto>()
        } catch (e: Exception) {
            currentCoroutineContext().ensureActive()
            return UploadOutcome.Failure(UploadFailure.Unexpected)
        }
        return UploadOutcome.Success(UploadResult(body.imageId, body.storageKey))
    }
}

private val invalidImageCodes = setOf(
    HttpStatusCode.BadRequest,
    HttpStatusCode.PayloadTooLarge,
    HttpStatusCode.UnsupportedMediaType,
    HttpStatusCode.UnprocessableEntity,
)

private fun HttpStatusCode.toUploadFailure(): UploadFailure = when {
    this == HttpStatusCode.Unauthorized -> UploadFailure.Unauthorized
    this == HttpStatusCode.TooManyRequests -> UploadFailure.RateLimited
    // 400/413/415/422: la causa es la imagen y reintentar no sirve.
    this in invalidImageCodes -> UploadFailure.InvalidImage
    value >= 500 -> UploadFailure.Server
    else -> UploadFailure.Unexpected
}
