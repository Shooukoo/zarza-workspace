package com.rubusai.app.core.data.realtime

import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.TOKENS
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.platform.InMemoryTokenStorage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

class RealtimeSessionTest {

    @Test
    fun conSesionDevuelveElTokenGuardado() = runTest {
        val auth = FakeAuthRepository().apply { me = ana }

        val token = RealtimeSession(auth, InMemoryTokenStorage(TOKENS)).freshToken()

        assertEquals("access-old", token)
        assertEquals(1, auth.meCalls)
    }

    @Test
    fun siAuthMeFallaNoHayTokenAunqueHayaUnoGuardado() = runTest {
        val auth = FakeAuthRepository().apply { me = null }

        assertNull(RealtimeSession(auth, InMemoryTokenStorage(TOKENS)).freshToken())
    }

    @Test
    fun sinTokensGuardadosNoHayToken() = runTest {
        val auth = FakeAuthRepository().apply { me = ana }

        assertNull(RealtimeSession(auth, InMemoryTokenStorage()).freshToken())
    }

    @Test
    fun leeElTokenDespuesDeAuthMeParaCogerElRefrescado() = runTest {
        val storage = InMemoryTokenStorage(TOKENS)
        // El refresh del cliente principal guarda un par nuevo mientras `auth/me` se resuelve.
        val auth = object : AuthRepository by FakeAuthRepository() {
            override suspend fun fetchMe(): User? {
                storage.save(AuthTokens("access-new", "refresh-new"))
                return ana
            }
        }

        assertEquals("access-new", RealtimeSession(auth, storage).freshToken())
    }
}
