package com.rubusai.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Home provisional: el usuario y el cierre de sesión. La Fase 4 lo sustituye por el inicio real. */
internal class HomeViewModel(private val sessionManager: SessionManager) : ViewModel() {
    val sessionState: StateFlow<SessionState> get() = sessionManager.state

    private val _loggingOut = MutableStateFlow(false)
    val loggingOut: StateFlow<Boolean> = _loggingOut.asStateFlow()

    fun onLogout() {
        if (_loggingOut.value) return
        _loggingOut.value = true
        // El estado de sesión cambia al terminar y la navegación sale de esta pantalla.
        viewModelScope.launch { sessionManager.logout() }
    }
}
