package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.rubusai.app.core.network.AuthTokens
import java.io.File
import java.nio.file.Files
import kotlin.io.encoding.Base64
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class DataStoreTokenStorageTest {

    /** Invierte los bytes: reversible y distinto del texto original. */
    private class ReversingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain.reversedArray()
        override fun decrypt(data: ByteArray): ByteArray = data.reversedArray()
    }

    private class FailingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw IllegalStateException("clave perdida")
    }

    private val directory: File = Files.createTempDirectory("session-test").toFile()

    @AfterTest
    fun tearDown() {
        directory.deleteRecursively()
    }

    private fun TestScope.newDataStore(): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(scope = backgroundScope) {
            File(directory, "session.preferences_pb")
        }

    private suspend fun DataStore<Preferences>.storedValue(): String? =
        data.first()[DataStoreTokenStorage.TOKENS_KEY]

    @Test
    fun sinNadaGuardadoDevuelveNull() = runTest {
        val storage = DataStoreTokenStorage(newDataStore(), ReversingCipher())

        assertNull(storage.read())
    }

    @Test
    fun guardaYLeeElPar() = runTest {
        val storage = DataStoreTokenStorage(newDataStore(), ReversingCipher())

        storage.save(AuthTokens("access-1", "refresh-1"))

        assertEquals(AuthTokens("access-1", "refresh-1"), storage.read())
    }

    @Test
    fun loGuardadoNoContieneLosTokensEnClaro() = runTest {
        val dataStore = newDataStore()
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())

        storage.save(AuthTokens("access-1", "refresh-1"))

        val stored = dataStore.storedValue()!!
        assertFalse(stored.contains("access-1"))
        assertFalse(stored.contains("refresh-1"))
        // Lo guardado es el JSON cifrado y codificado en Base64.
        assertEquals(
            """{"accessToken":"access-1","refreshToken":"refresh-1"}""",
            Base64.decode(stored).reversedArray().decodeToString(),
        )
    }

    @Test
    fun borrarEliminaLoGuardado() = runTest {
        val dataStore = newDataStore()
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())
        storage.save(AuthTokens("access-1", "refresh-1"))

        storage.clear()

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }

    @Test
    fun siElDescifradoFallaBorraLoGuardadoYDevuelveNull() = runTest {
        val dataStore = newDataStore()
        DataStoreTokenStorage(dataStore, ReversingCipher()).save(AuthTokens("access-1", "refresh-1"))
        val storage = DataStoreTokenStorage(dataStore, FailingCipher())

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }

    @Test
    fun siLoDescifradoNoEsElJsonEsperadoBorraLoGuardadoYDevuelveNull() = runTest {
        val dataStore = newDataStore()
        val notJson = Base64.encode("esto no es json".encodeToByteArray().reversedArray())
        dataStore.edit { it[DataStoreTokenStorage.TOKENS_KEY] = notJson }
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }

    @Test
    fun siLoGuardadoNoEsBase64BorraLoGuardadoYDevuelveNull() = runTest {
        val dataStore = newDataStore()
        dataStore.edit { it[DataStoreTokenStorage.TOKENS_KEY] = "¡¡no es base64!!" }
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }
}
