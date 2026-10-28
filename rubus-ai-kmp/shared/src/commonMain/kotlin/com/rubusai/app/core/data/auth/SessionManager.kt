package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.async
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext

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
    private var startup: Deferred<Unit>? = null

    /**
     * Lee la sesión guardada y empieza a escuchar su expiración. Idempotente y a prueba de
     * cancelación: la lectura corre en [scope], así que si se cancela quien llama (una rotación)
     * otra llamada la espera.
     */
    suspend fun start() {
        val job = startLock.withLock {
            startup ?: run {
                // UNDISPATCHED: la suscripción existe antes de leer nada, porque `expired` no repite avisos.
                scope.launch(start = CoroutineStart.UNDISPATCHED) {
                    sessionEvents.expired.collect { expire() }
                }
                scope.async {
                    try {
                        restore()
                    } catch (e: CancellationException) {
                        throw e
                    } catch (e: Exception) {
                        // Un Keystore que falla dos veces seguidas: se pide iniciar sesión sin borrar nada,
                        // para que la sesión guardada sobreviva al siguiente arranque.
                        leaveLoading(SessionState.Unauthenticated())
                    }
                }.also { startup = it }
            }
        }
        job.await()
    }

    /**
     * Inicia sesión. Si el backend acepta, guarda los tokens y luego el usuario y pasa a
     * `Authenticated`. Si no puede guardarlos, borra lo guardado y propaga el error: no queda
     * media sesión. Un `Mutex` impide dos logins a la vez.
     */
    suspend fun login(email: String, password: String): LoginResult = transitions.withLock {
        val result = repository.login(email, password)
        if (result !is LoginResult.Success) return@withLock result
        val session = result.session
        try {
            tokenStorage.save(session.tokens)
            userStorage.save(session.user)
        } catch (e: Exception) {
            // NonCancellable: si lo que falló fue una cancelación, aun así hay que limpiar.
            withContext(NonCancellable) { clearStorage() }
            throw e
        }
        _state.value = SessionState.Authenticated(session.user)
        result
    }

    /**
     * Cierra la sesión. Llama al backend **antes** de borrar: necesita el `Bearer` para que
     * limpie el token FCM de este usuario. Pase lo que pase con la llamada, la sesión local
     * se borra. No se cancela a medias: dejaría la sesión abierta con el usuario ya fuera.
     */
    suspend fun logout() = withContext(NonCancellable) {
        transitions.withLock {
            if (_state.value !is SessionState.Authenticated) return@withLock
            val refreshToken = try {
                tokenStorage.read()?.refreshToken
            } catch (e: Exception) {
                null
            }
            repository.logout(refreshToken)
            clearStorage()
            _state.value = SessionState.Unauthenticated()
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
            leaveLoading(SessionState.Authenticated(user))
            scope.launch { refreshUser() }
            return
        }
        // Tokens sin usuario (almacenamiento corrupto): no se adivina el rol.
        val fetched = repository.fetchMe()
        if (fetched != null) {
            userStorage.save(fetched)
            leaveLoading(SessionState.Authenticated(fetched))
        } else {
            // Se limpia todo aunque el fallo de `me` sea de red: sin usuario no hay rol con el que entrar (lo sanciona el spec).
            // Si la causa fue un rechazo de refresh, el aviso de sesión expirada puede no mostrarse.
            clearStorage()
            leaveLoading(SessionState.Unauthenticated())
        }
    }

    /** Actualiza rol y nombre con `GET auth/me`; si falla por cualquier causa, la sesión sigue como estaba. */
    private suspend fun refreshUser() {
        val fresh = repository.fetchMe() ?: return
        transitions.withLock {
            val current = _state.value
            if (current !is SessionState.Authenticated || current.user.id != fresh.id || current.user == fresh) return
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
