package com.rubusai.app.core.data.auth

import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.CompletableDeferred
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
}
