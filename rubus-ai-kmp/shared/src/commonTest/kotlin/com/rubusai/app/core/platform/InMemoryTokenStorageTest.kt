package com.rubusai.app.core.platform

import com.rubusai.app.core.network.AuthTokens
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

class InMemoryTokenStorageTest {

    @Test
    fun empiezaVacioSiNoRecibeTokens() = runTest {
        assertNull(InMemoryTokenStorage().read())
    }

    @Test
    fun devuelveLosTokensIniciales() = runTest {
        val tokens = AuthTokens("access-1", "refresh-1")

        assertEquals(tokens, InMemoryTokenStorage(tokens).read())
    }

    @Test
    fun guardarSustituyeElParAnterior() = runTest {
        val storage = InMemoryTokenStorage(AuthTokens("access-1", "refresh-1"))

        storage.save(AuthTokens("access-2", "refresh-2"))

        assertEquals(AuthTokens("access-2", "refresh-2"), storage.read())
    }

    @Test
    fun borrarLoDejaVacio() = runTest {
        val storage = InMemoryTokenStorage(AuthTokens("access-1", "refresh-1"))

        storage.clear()

        assertNull(storage.read())
    }

    @Test
    fun toStringNoMuestraLosTokens() {
        val text = AuthTokens("access-1", "refresh-1").toString()

        assertFalse(text.contains("access-1"))
        assertFalse(text.contains("refresh-1"))
    }
}
