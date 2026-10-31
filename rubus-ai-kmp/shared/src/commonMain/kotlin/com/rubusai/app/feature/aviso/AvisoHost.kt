package com.rubusai.app.feature.aviso

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.aviso_analisis_listo
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

/** Snackbar global: se monta una vez en la raíz de la app y se dibuja sobre cualquier pantalla. */
@Composable
internal fun AvisoHost() {
    val viewModel = koinViewModel<AvisoViewModel>()
    val aviso by viewModel.aviso.collectAsStateWithLifecycle()
    AvisoSnackbar(aviso = aviso, onMostrado = viewModel::onAvisoMostrado)
}

/**
 * Muestra «¡Análisis listo!» por cada [aviso] nuevo y avisa con [onMostrado] cuando termina. Un aviso
 * nuevo cancela el anterior: queda el último. La capa no captura toques.
 */
@Composable
internal fun AvisoSnackbar(aviso: Aviso?, onMostrado: (Long) -> Unit, modifier: Modifier = Modifier) {
    val state = remember { SnackbarHostState() }
    val texto = stringResource(Res.string.aviso_analisis_listo)

    LaunchedEffect(aviso?.id) {
        val actual = aviso ?: return@LaunchedEffect
        try {
            state.showSnackbar(texto)
        } finally {
            onMostrado(actual.id)
        }
    }

    Box(modifier = modifier.fillMaxSize().safeDrawingPadding()) {
        SnackbarHost(hostState = state, modifier = Modifier.align(Alignment.BottomCenter))
    }
}
