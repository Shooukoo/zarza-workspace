package com.rubusai.app.core.data.ingestion

import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.model.UploadResult
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.TEST_BASE_URL
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import com.rubusai.app.core.network.respondNewTokens
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.request.HttpRequestData
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class IngestionRepositoryTest {

    private val metadata = UploadMetadata(
        capturedAt = "2026-10-28T18:00:00Z",
        offlineSyncId = "sync-1",
        campoId = "campo-1",
        gpsLat = 19.4326,
        gpsLon = -99.1332,
    )
    private val jpeg = "JPEGBYTES".encodeToByteArray()
    private val created =
        """{"image_id":"img-1","storage_key":"uploads/img-1.jpg","status":"UPLOADED","metadata":{"capturedAt":"x"}}"""

    private fun TestScope.repository(handler: MockRequestHandler) =
        IngestionRepositoryImpl(clientFixture(handler = handler).client)

    private suspend fun HttpRequestData.bodyText() = body.toByteArray().decodeToString()

    private suspend fun TestScope.failureFor(status: HttpStatusCode): UploadOutcome =
        repository { respondError(status) }.upload(jpeg, metadata)

    @Test
    fun enviaElArchivoYLosCamposComoMultipart() = runTest {
        var method: HttpMethod? = null
        var url: String? = null
        var contentType: ContentType? = null
        var text: String? = null
        val repository = repository { request ->
            method = request.method
            url = request.url.toString()
            contentType = (request.body as OutgoingContent).contentType?.withoutParameters()
            text = request.bodyText()
            respondJson(created)
        }

        repository.upload(jpeg, metadata)

        assertEquals(HttpMethod.Post, method)
        assertEquals("$TEST_BASE_URL/ingestion/upload", url)
        assertEquals(ContentType.MultiPart.FormData, contentType)
        val body = text!!
        listOf("JPEGBYTES", "image/jpeg", "sync-1.jpg", "campo-1", "2026-10-28T18:00:00Z", "sync-1", "19.4326", "-99.1332")
            .forEach { assertTrue(body.contains(it), "falta $it en el cuerpo") }
    }

    @Test
    fun sinCoordenadasNoEnviaGpsLatNiGpsLon() = runTest {
        var text: String? = null
        val repository = repository { request ->
            text = request.bodyText()
            respondJson(created)
        }

        repository.upload(jpeg, metadata.copy(gpsLat = null, gpsLon = null))

        assertFalse(text!!.contains("gpsLat"))
        assertFalse(text!!.contains("gpsLon"))
    }

    @Test
    fun un201DevuelveElResultado() = runTest {
        val repository = repository { respondJson(created, HttpStatusCode.Created) }

        assertEquals(
            UploadOutcome.Success(UploadResult("img-1", "uploads/img-1.jpg")),
            repository.upload(jpeg, metadata),
        )
    }

    @Test
    fun un409EsExitoSinResultado() = runTest {
        // El backend actual no lo devuelve; se trata como éxito por si lo hiciera (la captura ya existía).
        assertEquals(UploadOutcome.Success(null), failureFor(HttpStatusCode.Conflict))
    }

    @Test
    fun cadaCodigoSeMapeaASuFallo() = runTest {
        assertEquals(UploadOutcome.Failure(UploadFailure.InvalidImage), failureFor(HttpStatusCode.BadRequest))
        assertEquals(UploadOutcome.Failure(UploadFailure.RateLimited), failureFor(HttpStatusCode.TooManyRequests))
        assertEquals(UploadOutcome.Failure(UploadFailure.Server), failureFor(HttpStatusCode.ServiceUnavailable))
        assertEquals(UploadOutcome.Failure(UploadFailure.Unexpected), failureFor(HttpStatusCode.NotFound))
    }

    @Test
    fun sinRedEsFalloDeRed() = runTest {
        val repository = repository { throw FakeNetworkException() }

        assertEquals(UploadOutcome.Failure(UploadFailure.Network), repository.upload(jpeg, metadata))
    }

    @Test
    fun superarLos90SegundosEsFalloDeRed() = runTest {
        val repository = repository {
            delay(91_000)
            respondJson(created)
        }

        assertEquals(UploadOutcome.Failure(UploadFailure.Network), repository.upload(jpeg, metadata))
    }

    @Test
    fun unaRespuestaIlegibleEsInesperada() = runTest {
        val repository = repository { respondJson("no es json") }

        assertEquals(UploadOutcome.Failure(UploadFailure.Unexpected), repository.upload(jpeg, metadata))
    }

    @Test
    fun un401SinRemedioEsNoAutorizado() = runTest {
        // Todo da 401, también el refresh: el backend rechaza la sesión.
        assertEquals(UploadOutcome.Failure(UploadFailure.Unauthorized), failureFor(HttpStatusCode.Unauthorized))
    }

    @Test
    fun trasUnRefreshReenviaElMismoCuerpo() = runTest {
        var uploads = 0
        var retriedBody: String? = null
        val repository = repository { request ->
            when {
                request.url.encodedPath.endsWith("/auth/refresh") -> respondNewTokens()
                request.headers[HttpHeaders.Authorization] == "Bearer access-new" -> {
                    uploads++
                    retriedBody = request.bodyText()
                    respondJson(created)
                }
                else -> {
                    uploads++
                    respondError(HttpStatusCode.Unauthorized)
                }
            }
        }

        val outcome = repository.upload(jpeg, metadata)

        assertEquals(UploadOutcome.Success(UploadResult("img-1", "uploads/img-1.jpg")), outcome)
        assertEquals(2, uploads)
        assertTrue(retriedBody!!.contains("JPEGBYTES"), "el reintento perdió el archivo")
    }
}
