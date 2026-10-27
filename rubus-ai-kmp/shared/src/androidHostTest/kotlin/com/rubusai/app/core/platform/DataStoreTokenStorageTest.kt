package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.rubusai.app.core.network.AuthTokens
import java.io.File
import java.nio.file.Files
import java.security.UnrecoverableKeyException
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.coroutines.cancellation.CancellationException
import kotlin.io.encoding.Base64
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withTimeout

class DataStoreTokenStorageTest {

    /** Invierte los bytes: reversible y distinto del texto original. */
    private class ReversingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain.reversedArray()
        override fun decrypt(data: ByteArray): ByteArray = data.reversedArray()
    }

    private class FailingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw UnrecoverableKeyException("clave perdida")
    }

    /** Un fallo que no dice que la clave se perdiera (p. ej. un Keystore ocupado). */
    private class TransientFailureCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw java.security.ProviderException("keystore ocupado")
    }

    private class CancellingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw CancellationException("cancelado")
    }

    /**
     * Cifra igual que [ReversingCipher], pero al descifrar avisa de que ha entrado, espera
     * a que lo suelten y entonces falla. Permite colar un `save` en mitad de un `read`.
     */
    private class BlockingFailingCipher : TokenCipher {
        val entered = CountDownLatch(1)
        val release = CountDownLatch(1)

        override fun encrypt(plain: ByteArray): ByteArray = plain.reversedArray()

        override fun decrypt(data: ByteArray): ByteArray {
            entered.countDown()
            release.await(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            throw UnrecoverableKeyException("clave perdida")
        }
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
    fun guardarDosVecesSustituyeElParAnterior() = runTest {
        val storage = DataStoreTokenStorage(newDataStore(), ReversingCipher())

        storage.save(AuthTokens("access-1", "refresh-1"))
        storage.save(AuthTokens("access-2", "refresh-2"))

        assertEquals(AuthTokens("access-2", "refresh-2"), storage.read())
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

    @Test
    fun unFalloPasajeroDelCifradoNoBorraLaSesion() = runTest {
        val dataStore = newDataStore()
        DataStoreTokenStorage(dataStore, ReversingCipher()).save(AuthTokens("access-1", "refresh-1"))
        val storage = DataStoreTokenStorage(dataStore, TransientFailureCipher())

        assertFailsWith<java.security.ProviderException> { storage.read() }

        assertNotNull(dataStore.storedValue())
        assertEquals(AuthTokens("access-1", "refresh-1"), DataStoreTokenStorage(dataStore, ReversingCipher()).read())
    }

    @Test
    fun unaCancelacionDuranteLaLecturaNoBorraLoGuardado() = runTest {
        val dataStore = newDataStore()
        DataStoreTokenStorage(dataStore, ReversingCipher()).save(AuthTokens("access-1", "refresh-1"))
        val storage = DataStoreTokenStorage(dataStore, CancellingCipher())

        assertFailsWith<CancellationException> { storage.read() }

        assertNotNull(dataStore.storedValue())
    }

    // Necesita concurrencia real (un `save` mientras `read` está bloqueado descifrando),
    // así que no usa `runTest` ni su tiempo virtual.
    @Test
    fun siSeGuardaOtroParMientrasFallaLaLecturaNoSeBorra() = runBlocking<Unit> {
        val job = SupervisorJob()
        val blockingCipher = BlockingFailingCipher()
        try {
            // Una sola instancia de DataStore por archivo: la comparten los dos almacenamientos.
            val dataStore = PreferenceDataStoreFactory.create(scope = CoroutineScope(Dispatchers.IO + job)) {
                File(directory, "session.preferences_pb")
            }
            val working = DataStoreTokenStorage(dataStore, ReversingCipher())
            val blocked = DataStoreTokenStorage(dataStore, blockingCipher)
            working.save(AuthTokens("access-1", "refresh-1"))

            val reading = async(Dispatchers.IO) { blocked.read() }
            assertTrue(
                blockingCipher.entered.await(TIMEOUT_SECONDS, TimeUnit.SECONDS),
                "la lectura no llegó a descifrar",
            )
            working.save(AuthTokens("access-new", "refresh-new"))
            blockingCipher.release.countDown()

            assertNull(withTimeout(TIMEOUT_SECONDS * 1000) { reading.await() })
            assertEquals(AuthTokens("access-new", "refresh-new"), working.read())
        } finally {
            blockingCipher.release.countDown()
            job.cancelAndJoin()
        }
    }

    private companion object {
        /** Tope de las esperas de la prueba concurrente, para que un fallo no cuelgue el build. */
        const val TIMEOUT_SECONDS = 10L
    }
}
