package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface SessionState {
    /** Valor inicial: todavía se está leyendo el almacenamiento. */
    data object Loading : SessionState

    data class Authenticated(val user: User) : SessionState

    /** [expired] es `true` si el backend rechazó el refresh y la sesión se cerró sola. */
    data class Unauthenticated(val expired: Boolean = false) : SessionState
}

/**
 * Única fuente de verdad de la sesión. La navegación observa [state] y redirige; nadie más
 * decide a dónde va la app según la sesión.
 *
 * [scope] debe vivir lo mismo que la app: escucha `SessionEvents.expired` y hace el refresco
 * del usuario en segundo plano.
 */
class SessionManager(
    private val repository: AuthRepository,
    private val tokenStorage: SecureTokenStorage,
    private val userStorage: UserStorage,
    private val sessionEvents: SessionEvents,
    private val scope: CoroutineScope,
) {
    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    // Serializa las transiciones (login, logout, expiración, refresco del usuario) para que
    // un evento tardío no resucite una sesión ya cerrada.
    private val transitions = Mutex()
    private val startLock = Mutex()
    private var started = false

    /** Lee la sesión guardada y empieza a escuchar su expiración. Idempotente. */
    suspend fun start() {
        startLock.withLock {
            if (started) return
            started = true
        }
        // UNDISPATCHED: la suscripción existe antes de leer nada, porque `expired` no repite avisos.
        scope.launch(start = CoroutineStart.UNDISPATCHED) {
            sessionEvents.expired.collect { expire() }
        }
        try {
            restore()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Un Keystore que falla dos veces seguidas: se pide iniciar sesión sin borrar nada,
            // para que la sesión guardada sobreviva al siguiente arranque.
            leaveLoading(SessionState.Unauthenticated())
        }
    }

    private suspend fun restore() {
        val tokens = readWithRetry { tokenStorage.read() }
        if (tokens == null) {
            // Un usuario sin tokens es resto de una sesión cerrada a medias.
            bestEffort { userStorage.clear() }
            leaveLoading(SessionState.Unauthenticated())
            return
        }
        val user = readWithRetry { userStorage.read() }
        if (user != null) {
            _state.value = SessionState.Authenticated(user)
            scope.launch { refreshUser() }
            return
        }
        // Tokens sin usuario (almacenamiento corrupto): no se adivina el rol.
        val fetched = repository.fetchMe()
        if (fetched != null) {
            userStorage.save(fetched)
            _state.value = SessionState.Authenticated(fetched)
        } else {
            clearStorage()
            leaveLoading(SessionState.Unauthenticated())
        }
    }

    /** Actualiza rol y nombre con `GET auth/me`; si falla por cualquier causa, la sesión sigue como estaba. */
    private suspend fun refreshUser() {
        val fresh = repository.fetchMe() ?: return
        transitions.withLock {
            val current = _state.value
            if (current !is SessionState.Authenticated || current.user == fresh) return
            try {
                userStorage.save(fresh)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                return
            }
            _state.value = SessionState.Authenticated(fresh)
        }
    }

    private suspend fun expire() = transitions.withLock {
        // Tras un logout o sin sesión no hay nada que expirar (y no debe salir el aviso).
        if (_state.value is SessionState.Unauthenticated) return@withLock
        clearStorage()
        _state.value = SessionState.Unauthenticated(expired = true)
    }

    /** Pasa de `Loading` a [next] sin pisar una transición que haya ocurrido mientras tanto. */
    private fun leaveLoading(next: SessionState) {
        _state.update { if (it is SessionState.Loading) next else it }
    }

    /** Un único reintento: un Keystore ocupado suele resolverse al instante. */
    private suspend fun <T> readWithRetry(read: suspend () -> T): T = try {
        read()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        read()
    }

    /** Borra tokens y luego usuario. Si el almacenamiento falla no hay nada más que hacer: la sesión ya no es válida. */
    private suspend fun clearStorage() {
        bestEffort { tokenStorage.clear() }
        bestEffort { userStorage.clear() }
    }

    private suspend fun bestEffort(block: suspend () -> Unit) {
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin acción: ver clearStorage.
        }
    }
}
