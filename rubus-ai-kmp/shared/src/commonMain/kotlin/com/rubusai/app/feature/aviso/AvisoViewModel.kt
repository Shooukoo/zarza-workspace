package com.rubusai.app.feature.aviso

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.model.RealtimeEvent
import com.rubusai.app.core.network.RealtimeClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Aviso global «¡Análisis listo!». El [id] crece con cada aviso: dos seguidos son distintos para la UI. */
internal data class Aviso(val id: Long)

internal class AvisoViewModel(realtime: RealtimeClient, private val session: SessionManager) : ViewModel() {
    private val _aviso = MutableStateFlow<Aviso?>(null)
    val aviso: StateFlow<Aviso?> = _aviso.asStateFlow()

    private var contador = 0L

    init {
        // Sin sesión no hay a quién avisar: se descarta el pendiente y los eventos que lleguen.
        viewModelScope.launch {
            session.state.collect { if (it !is SessionState.Authenticated) _aviso.value = null }
        }
        viewModelScope.launch {
            realtime.events.collect { evento ->
                if (evento is RealtimeEvent.AnalisisListo && session.state.value is SessionState.Authenticated) {
                    _aviso.value = Aviso(++contador)
                }
            }
        }
    }

    /** La UI terminó con el aviso [id]; si ya llegó otro más nuevo, ese se conserva. */
    fun onAvisoMostrado(id: Long) {
        _aviso.update { if (it?.id == id) null else it }
    }
}
