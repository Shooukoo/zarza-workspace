package com.rubusai.app.feature.capture

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.platform.PhotoPreview
import com.rubusai.app.core.platform.rememberLocationPermission
import com.rubusai.app.core.platform.rememberPhotoPicker
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.capture_campos_empty
import com.rubusai.app.resources.capture_campos_error
import com.rubusai.app.resources.capture_campos_loading
import com.rubusai.app.resources.capture_cancel
import com.rubusai.app.resources.capture_failure_compression
import com.rubusai.app.resources.capture_failure_invalid_image
import com.rubusai.app.resources.capture_failure_network
import com.rubusai.app.resources.capture_failure_rate_limited
import com.rubusai.app.resources.capture_failure_server
import com.rubusai.app.resources.capture_failure_session
import com.rubusai.app.resources.capture_failure_unexpected
import com.rubusai.app.resources.capture_field_title
import com.rubusai.app.resources.capture_pick_gallery
import com.rubusai.app.resources.capture_preview_description
import com.rubusai.app.resources.capture_retry
import com.rubusai.app.resources.capture_take_photo
import com.rubusai.app.resources.capture_title
import com.rubusai.app.resources.capture_upload
import com.rubusai.app.resources.capture_uploading
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import kotlinx.coroutines.flow.first
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun CaptureRoute(onClose: () -> Unit, onUploaded: () -> Unit) {
    val viewModel = koinViewModel<CaptureViewModel>()
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Sobreviven a la muerte del proceso; el ViewModel no. [ruta, id, fecha].
    var saved by rememberSaveable { mutableStateOf<List<String>?>(null) }
    LaunchedEffect(state.photo) {
        state.photo?.let { saved = listOf(it.path, it.offlineSyncId, it.capturedAt) }
    }
    LaunchedEffect(Unit) {
        saved?.let { (path, id, at) -> viewModel.restore(CapturedPhoto(path, id, at)) }
    }
    // La subida corre en el ViewModel y puede acabar en segundo plano: se espera a RESUMED para
    // que el guard del NavHost no descarte el aviso y el pop.
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    LaunchedEffect(state.uploaded) {
        if (state.uploaded) {
            lifecycle.currentStateFlow.first { it == Lifecycle.State.RESUMED }
            onUploaded()
        }
    }

    val picker = rememberPhotoPicker { path -> path?.let(viewModel::onPhotoChosen) }

    // El permiso de ubicación se pide una vez por sesión de captura, al pulsar "Subir".
    // Concedido o no, la subida sigue: negarlo solo deja la foto sin GPS.
    var askedLocation by rememberSaveable { mutableStateOf(false) }
    val locationPermission = rememberLocationPermission { viewModel.onUpload() }

    CaptureScreen(
        state = state,
        onTakePhoto = picker::takePhoto,
        onPickGallery = picker::pickFromGallery,
        onCampoSelected = viewModel::onCampoSelected,
        onRetryCampos = viewModel::loadCampos,
        onUpload = {
            if (askedLocation || locationPermission.isGranted()) {
                viewModel.onUpload()
            } else {
                askedLocation = true
                locationPermission.request()
            }
        },
        onClose = onClose,
    )
}

@Composable
internal fun CaptureScreen(
    state: CaptureUiState,
    onTakePhoto: () -> Unit,
    onPickGallery: () -> Unit,
    onCampoSelected: (String) -> Unit,
    onRetryCampos: () -> Unit,
    onUpload: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    RubusScreen(
        modifier = modifier,
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(text = stringResource(Res.string.capture_title), style = MaterialTheme.typography.headlineLarge)
        state.photo?.let {
            PhotoPreview(
                path = it.path,
                contentDescription = stringResource(Res.string.capture_preview_description),
                modifier = Modifier.fillMaxWidth().height(240.dp),
            )
        }
        RubusButton(
            text = stringResource(Res.string.capture_take_photo),
            onClick = onTakePhoto,
            enabled = !state.uploading,
            modifier = Modifier.fillMaxWidth(),
        )
        RubusButton(
            text = stringResource(Res.string.capture_pick_gallery),
            onClick = onPickGallery,
            enabled = !state.uploading,
            variant = RubusButtonVariant.Secondary,
            modifier = Modifier.fillMaxWidth(),
        )
        CamposSection(state, onCampoSelected, onRetryCampos)
        state.failure?.let {
            Text(
                text = stringResource(it.message()),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.error,
            )
        }
        RubusButton(
            text = stringResource(if (state.uploading) Res.string.capture_uploading else Res.string.capture_upload),
            onClick = onUpload,
            enabled = state.canUpload,
            modifier = Modifier.fillMaxWidth(),
        )
        RubusButton(
            text = stringResource(Res.string.capture_cancel),
            onClick = onClose,
            enabled = !state.uploading,
            variant = RubusButtonVariant.Outline,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun CamposSection(state: CaptureUiState, onSelect: (String) -> Unit, onRetry: () -> Unit) {
    when (val campos = state.campos) {
        CamposState.Loading -> Text(
            text = stringResource(Res.string.capture_campos_loading),
            style = MaterialTheme.typography.bodyLarge,
        )
        CamposState.Failed -> {
            Text(text = stringResource(Res.string.capture_campos_error), style = MaterialTheme.typography.bodyLarge)
            RubusButton(
                text = stringResource(Res.string.capture_retry),
                onClick = onRetry,
                variant = RubusButtonVariant.Outline,
            )
        }
        is CamposState.Loaded -> if (campos.campos.isEmpty()) {
            Text(text = stringResource(Res.string.capture_campos_empty), style = MaterialTheme.typography.bodyLarge)
        } else {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(text = stringResource(Res.string.capture_field_title), style = MaterialTheme.typography.titleLarge)
                campos.campos.forEach { campo ->
                    val selected = campo.id == state.selectedCampoId
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = selected,
                                enabled = !state.uploading,
                                role = Role.RadioButton,
                                onClick = { onSelect(campo.id) },
                            )
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = selected, onClick = null)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(text = campo.nombre, style = MaterialTheme.typography.bodyLarge)
                            if (campo.codigoCampo.isNotBlank()) {
                                Text(text = campo.codigoCampo, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun CaptureFailure.message(): StringResource = when (this) {
    CaptureFailure.Network -> Res.string.capture_failure_network
    CaptureFailure.InvalidImage -> Res.string.capture_failure_invalid_image
    CaptureFailure.RateLimited -> Res.string.capture_failure_rate_limited
    CaptureFailure.Server -> Res.string.capture_failure_server
    CaptureFailure.Session -> Res.string.capture_failure_session
    CaptureFailure.Unexpected -> Res.string.capture_failure_unexpected
    CaptureFailure.Compression -> Res.string.capture_failure_compression
}
