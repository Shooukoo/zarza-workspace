package com.rubusai.app.core.data.auth

import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlin.test.assertTrue
import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

/** Almacén de tokens que falla las próximas [failures] lecturas, como un Keystore ocupado. */
private class FlakyTokenStorage(
    private val delegate: SecureTokenStorage,
    var failures: Int = 0,
) : SecureTokenStorage {
    var clears = 0

    override suspend fun read(): AuthTokens? {
        if (failures > 0) {
            failures--
            throw IllegalStateException("keystore ocupado")
        }
        return delegate.read()
    }

    override suspend fun save(tokens: AuthTokens) = delegate.save(tokens)

    override suspend fun clear() {
        clears++
        delegate.clear()
    }
}

/** Almacén de usuario cuya lectura devuelve lo guardado al llamar, pero solo cuando se abre [gate]. */
private class GatedUserStorage(
    private val delegate: UserStorage,
    val gate: CompletableDeferred<Unit> = CompletableDeferred(),
) : UserStorage {
    override suspend fun read(): User? {
        val value = delegate.read()
        gate.await()
        return value
    }

    override suspend fun save(user: User) = delegate.save(user)

    override suspend fun clear() = delegate.clear()
}

/** Registra el orden de los `save` de tokens y usuario. */
private class LoggingTokenStorage(private val log: MutableList<String>) : SecureTokenStorage {
    private val delegate = InMemoryTokenStorage()
    override suspend fun read() = delegate.read()
    override suspend fun save(tokens: AuthTokens) {
        log += "tokens"
        delegate.save(tokens)
    }
    override suspend fun clear() = delegate.clear()
}

private class LoggingUserStorage(private val log: MutableList<String>) : UserStorage {
    private val delegate = InMemoryUserStorage()
    override suspend fun read() = delegate.read()
    override suspend fun save(user: User) {
        log += "usuario"
        delegate.save(user)
    }
    override suspend fun clear() = delegate.clear()
}

/** Almacén de usuario cuyo guardado falla, como un disco lleno. */
private class FailingSaveUserStorage : UserStorage {
    override suspend fun read(): User? = null
    override suspend fun save(user: User) = throw IllegalStateException("disco lleno")
    override suspend fun clear() = Unit
}

@OptIn(ExperimentalCoroutinesApi::class)
class SessionManagerTest {

    private fun TestScope.manager(
        repository: FakeAuthRepository = FakeAuthRepository(),
        tokens: SecureTokenStorage = InMemoryTokenStorage(),
        users: UserStorage = InMemoryUserStorage(),
        events: SessionEvents = SessionEvents(),
    ) = SessionManager(repository, tokens, users, events, scope = backgroundScope)

    @Test
    fun alCrearseEstaEnLoading() = runTest {
        assertEquals(SessionState.Loading, manager().state.value)
    }

    @Test
    fun sinTokensEmiteUnauthenticatedYBorraUnUsuarioHuerfano() = runTest {
        val users = InMemoryUserStorage(ana)
        val manager = manager(users = users)

        manager.start()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
        assertNull(users.read())
    }

    @Test
    fun conTokensYUsuarioEmiteAuthenticatedSinEsperarLaRed() = runTest {
        val repository = FakeAuthRepository().apply { meGate = CompletableDeferred() }
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana))

        manager.start()

        // `me` sigue en vuelo (la compuerta no se ha abierto) y la sesión ya está lista.
        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun elRefrescoEnSegundoPlanoActualizaElUsuarioYLoGuarda() = runTest {
        val repository = FakeAuthRepository().apply {
            meGate = CompletableDeferred()
            me = anaAdmin
        }
        val users = InMemoryUserStorage(ana)
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), users)
        manager.start()
        runCurrent()

        repository.meGate!!.complete(Unit)
        runCurrent()

        assertEquals(SessionState.Authenticated(anaAdmin), manager.state.value)
        assertEquals(anaAdmin, users.read())
    }

    @Test
    fun siElRefrescoEnSegundoPlanoFallaLaSesionSigue() = runTest {
        val repository = FakeAuthRepository().apply { me = null }
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana))

        manager.start()
        runCurrent()

        assertEquals(1, repository.meCalls)
        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun conTokensSinUsuarioPideMeYAutentica() = runTest {
        val repository = FakeAuthRepository().apply { me = ana }
        val users = InMemoryUserStorage()
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), users)

        manager.start()

        assertEquals(SessionState.Authenticated(ana), manager.state.value)
        assertEquals(ana, users.read())
    }

    @Test
    fun conTokensSinUsuarioYMeFallidoLimpiaTodo() = runTest {
        val repository = FakeAuthRepository().apply { me = null }
        val tokens = InMemoryTokenStorage(TOKENS)
        val manager = manager(repository, tokens, InMemoryUserStorage())

        manager.start()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
        assertNull(tokens.read())
    }

    @Test
    fun unaLecturaPasajeraSeReintentaUnaVez() = runTest {
        val tokens = FlakyTokenStorage(InMemoryTokenStorage(TOKENS), failures = 1)
        val manager = manager(tokens = tokens, users = InMemoryUserStorage(ana))

        manager.start()

        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun dosLecturasFallidasDejanUnauthenticatedSinBorrarNada() = runTest {
        val tokens = FlakyTokenStorage(InMemoryTokenStorage(TOKENS), failures = 2)
        val users = InMemoryUserStorage(ana)
        val manager = manager(tokens = tokens, users = users)

        manager.start()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
        assertEquals(0, tokens.clears)
        assertEquals(ana, users.read())
    }

    @Test
    fun startEsIdempotente() = runTest {
        val repository = FakeAuthRepository()
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana))

        manager.start()
        manager.start()
        runCurrent()

        assertEquals(1, repository.meCalls)
    }

    @Test
    fun expiredBorraLaSesionYEmiteUnauthenticatedConExpired() = runTest {
        val events = SessionEvents()
        val tokens = InMemoryTokenStorage(TOKENS)
        val users = InMemoryUserStorage(ana)
        val manager = manager(tokens = tokens, users = users, events = events)
        manager.start()

        events.notifyExpired()
        runCurrent()

        assertEquals(SessionState.Unauthenticated(expired = true), manager.state.value)
        assertNull(tokens.read())
        assertNull(users.read())
    }

    @Test
    fun expiredSinSesionNoCambiaElEstado() = runTest {
        val events = SessionEvents()
        val manager = manager(events = events)
        manager.start()

        events.notifyExpired()
        runCurrent()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun unStartCanceladoNoDejaLaSesionEnLoading() = runTest {
        val repository = FakeAuthRepository().apply {
            meGate = CompletableDeferred()
            me = ana
        }
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage())
        val first = launch { manager.start() }
        runCurrent()
        first.cancel()
        runCurrent()

        launch { manager.start() }
        repository.meGate!!.complete(Unit)
        runCurrent()

        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun unExpiredDuranteLaRestauracionNoResucitaLaSesion() = runTest {
        val events = SessionEvents()
        val tokens = InMemoryTokenStorage(TOKENS)
        val users = GatedUserStorage(InMemoryUserStorage(ana))
        val manager = manager(tokens = tokens, users = users, events = events)
        launch { manager.start() }
        runCurrent()

        events.notifyExpired()
        runCurrent()
        users.gate.complete(Unit)
        runCurrent()

        assertEquals(SessionState.Unauthenticated(expired = true), manager.state.value)
        assertNull(tokens.read())
        assertNull(users.read())
    }

    @Test
    fun unRefrescoDeOtroUsuarioNoPisaALaSesionActual() = runTest {
        val repository = FakeAuthRepository().apply { me = ana.copy(id = "u2", role = UserRole.ADMIN) }
        val users = InMemoryUserStorage(ana)
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), users)

        manager.start()
        runCurrent()

        assertEquals(SessionState.Authenticated(ana), manager.state.value)
        assertEquals(ana, users.read())
    }

    @Test
    fun unLoginCorrectoGuardaTokensYUsuarioEnOrdenYEmiteAuthenticated() = runTest {
        val log = mutableListOf<String>()
        val manager = manager(tokens = LoggingTokenStorage(log), users = LoggingUserStorage(log))
        manager.start()

        val result = manager.login("ana@zarza.example", "secreto")

        assertTrue(result is LoginResult.Success)
        assertEquals(listOf("tokens", "usuario"), log)
        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun unLoginFallidoNoGuardaNadaNiCambiaElEstado() = runTest {
        val repository = FakeAuthRepository().apply {
            loginResult = LoginResult.Failure(LoginFailure.InvalidCredentials)
        }
        val tokens = InMemoryTokenStorage()
        val manager = manager(repository, tokens)
        manager.start()

        val result = manager.login("ana@zarza.example", "mala")

        assertEquals(LoginResult.Failure(LoginFailure.InvalidCredentials), result)
        assertNull(tokens.read())
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun siFallaElGuardadoDelUsuarioSeBorranLosTokensYSePropagaElError() = runTest {
        val tokens = InMemoryTokenStorage()
        val manager = manager(tokens = tokens, users = FailingSaveUserStorage())
        manager.start()

        assertFailsWith<IllegalStateException> { manager.login("ana@zarza.example", "secreto") }

        assertNull(tokens.read())
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun dosLoginsSimultaneosSeSerializan() = runTest {
        val repository = FakeAuthRepository().apply { loginGate = CompletableDeferred() }
        val manager = manager(repository)
        manager.start()

        val first = launch { manager.login("ana@zarza.example", "secreto") }
        val second = launch { manager.login("ana@zarza.example", "secreto") }
        runCurrent()
        assertEquals(1, repository.loginCalls.size)

        repository.loginGate!!.complete(Unit)
        runCurrent()

        first.join()
        second.join()
        assertEquals(2, repository.loginCalls.size)
        assertEquals(1, repository.maxActiveLogins)
    }

    @Test
    fun logoutLlamaAlBackendConElRefreshTokenYLimpiaTodo() = runTest {
        val repository = FakeAuthRepository()
        val tokens = InMemoryTokenStorage(TOKENS)
        val users = InMemoryUserStorage(ana)
        val manager = manager(repository, tokens, users)
        manager.start()

        manager.logout()

        assertEquals(listOf<String?>("refresh-old"), repository.logoutCalls)
        assertNull(tokens.read())
        assertNull(users.read())
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun logoutLimpiaAunqueLaLecturaDeTokensFalle() = runTest {
        val repository = FakeAuthRepository()
        val tokens = FlakyTokenStorage(InMemoryTokenStorage(TOKENS))
        val manager = manager(repository, tokens, InMemoryUserStorage(ana))
        manager.start()
        tokens.failures = Int.MAX_VALUE

        manager.logout()

        assertEquals(listOf<String?>(null), repository.logoutCalls)
        assertEquals(1, tokens.clears)
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun logoutSinSesionNoLlamaAlBackend() = runTest {
        val repository = FakeAuthRepository()
        val manager = manager(repository)
        manager.start()

        manager.logout()

        assertTrue(repository.logoutCalls.isEmpty())
    }

    @Test
    fun unExpiredTardioTrasElLogoutNoMuestraElAviso() = runTest {
        val events = SessionEvents()
        val manager = manager(tokens = InMemoryTokenStorage(TOKENS), users = InMemoryUserStorage(ana), events = events)
        manager.start()

        manager.logout()
        events.notifyExpired()
        runCurrent()

        assertEquals(SessionState.Unauthenticated(expired = false), manager.state.value)
    }
}
