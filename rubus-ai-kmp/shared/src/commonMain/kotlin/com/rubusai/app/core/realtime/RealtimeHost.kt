package com.rubusai.app.core.realtime

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.network.RealtimeClient

/**
 * Mantiene conectado el [client] mientras haya sesión y la app esté en primer plano (`RESUMED`).
 * No dibuja nada. Se llama desde la raíz de la app, así que `connect`/`disconnect` corren en el
 * hilo principal.
 */
@Composable
internal fun RealtimeHost(sessionState: SessionState, client: RealtimeClient) {
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    val estado by lifecycle.currentStateFlow.collectAsState()
    // Un cambio de usuario dentro de la misma sesión (refresco de rol) no cambia este booleano.
    val conectar = sessionState is SessionState.Authenticated && estado == Lifecycle.State.RESUMED

    DisposableEffect(conectar, client) {
        if (conectar) client.connect()
        onDispose { if (conectar) client.disconnect() }
    }
}
