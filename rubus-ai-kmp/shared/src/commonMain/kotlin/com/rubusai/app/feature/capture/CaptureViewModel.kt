package com.rubusai.app.feature.capture

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.data.ingestion.IngestionRepository
import com.rubusai.app.core.data.ingestion.UploadFailure
import com.rubusai.app.core.data.ingestion.UploadOutcome
import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.platform.Coordinates
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
import kotlin.coroutines.cancellation.CancellationException
import kotlin.time.Clock
import kotlin.uuid.Uuid
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Foto elegida. [offlineSyncId] y [capturedAt] se fijan al elegirla y no cambian en los reintentos. */
internal data class CapturedPhoto(val path: String, val offlineSyncId: String, val capturedAt: String)

internal sealed interface CamposState {
    data object Loading : CamposState
    data class Loaded(val campos: List<Campo>) : CamposState
    data object Failed : CamposState
}

internal enum class CaptureFailure {
    Network, InvalidImage, RateLimited, Server, Session, Unexpected, Compression;

    /** Con una imagen inválida o ilegible reintentar no sirve: hay que elegir otra. */
    val retryable: Boolean get() = this != InvalidImage && this != Compression
}

internal data class CaptureUiState(
    val campos: CamposState = CamposState.Loading,
    val photo: CapturedPhoto? = null,
    val selectedCampoId: String? = null,
    val uploading: Boolean = false,
    val failure: CaptureFailure? = null,
    val uploaded: Boolean = false,
) {
    val canUpload: Boolean
        get() = photo != null && selectedCampoId != null && !uploading && failure?.retryable != false
}

internal class CaptureViewModel(
    private val campos: CamposRepository,
    private val ingestion: IngestionRepository,
    private val compressor: ImageCompressor,
    private val location: LocationProvider,
    private val clock: Clock = Clock.System,
    private val newId: () -> String = { Uuid.random().toString() },
) : ViewModel() {
    private val _state = MutableStateFlow(CaptureUiState())
    val state: StateFlow<CaptureUiState> = _state.asStateFlow()

    // Se conservan entre reintentos de la misma foto: comprimir y esperar al GPS es lo caro.
    private var compressed: ByteArray? = null
    private var coordinates: Coordinates? = null
    private var coordinatesResolved = false

    init {
        loadCampos()
    }

    fun loadCampos() {
        _state.update { it.copy(campos = CamposState.Loading) }
        viewModelScope.launch {
            when (val result = campos.list()) {
                is CamposResult.Success -> _state.update {
                    // Con un solo campo no hay nada que elegir; con varios se conserva la elección previa si sigue existiendo.
                    val selected = result.campos.singleOrNull()?.id
                        ?: it.selectedCampoId?.takeIf { id -> result.campos.any { c -> c.id == id } }
                    it.copy(campos = CamposState.Loaded(result.campos), selectedCampoId = selected)
                }
                CamposResult.Failure -> _state.update { it.copy(campos = CamposState.Failed) }
            }
        }
    }

    fun onCampoSelected(id: String) = _state.update { it.copy(selectedCampoId = id) }

    fun onPhotoChosen(path: String) =
        setPhoto(CapturedPhoto(path, newId(), clock.now().toString()))

    /** Recupera la foto tras la muerte del proceso. No hace nada si ya hay una elegida. */
    fun restore(photo: CapturedPhoto) {
        if (_state.value.photo == null) setPhoto(photo)
    }

    private fun setPhoto(photo: CapturedPhoto) {
        compressed = null
        coordinates = null
        coordinatesResolved = false
        _state.update { it.copy(photo = photo, failure = null, uploaded = false) }
    }

    fun onUpload() {
        val current = _state.value
        val photo = current.photo ?: return
        val campoId = current.selectedCampoId ?: return
        if (current.uploading) return
        _state.update { it.copy(uploading = true, failure = null) }

        viewModelScope.launch {
            val jpeg = try {
                compressed ?: compressor.compress(photo.path).also { compressed = it }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                fail(CaptureFailure.Compression)
                return@launch
            }
            val position = resolveCoordinates()
            val metadata = UploadMetadata(
                capturedAt = photo.capturedAt,
                offlineSyncId = photo.offlineSyncId,
                campoId = campoId,
                gpsLat = position?.latitude,
                gpsLon = position?.longitude,
            )
            when (val outcome = ingestion.upload(jpeg, metadata)) {
                is UploadOutcome.Success -> _state.update { it.copy(uploading = false, uploaded = true) }
                is UploadOutcome.Failure -> fail(outcome.reason.toCaptureFailure())
            }
        }
    }

    // Sin permiso, sin señal o con el servicio caído, la captura sigue sin GPS.
    private suspend fun resolveCoordinates(): Coordinates? {
        if (!coordinatesResolved) {
            coordinates = try {
                location.current()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                null
            }
            coordinatesResolved = true
        }
        return coordinates
    }

    private fun fail(failure: CaptureFailure) =
        _state.update { it.copy(uploading = false, failure = failure) }
}

private fun UploadFailure.toCaptureFailure(): CaptureFailure = when (this) {
    UploadFailure.Network -> CaptureFailure.Network
    UploadFailure.InvalidImage -> CaptureFailure.InvalidImage
    UploadFailure.RateLimited -> CaptureFailure.RateLimited
    UploadFailure.Server -> CaptureFailure.Server
    UploadFailure.Unauthorized -> CaptureFailure.Session
    UploadFailure.Unexpected -> CaptureFailure.Unexpected
}
