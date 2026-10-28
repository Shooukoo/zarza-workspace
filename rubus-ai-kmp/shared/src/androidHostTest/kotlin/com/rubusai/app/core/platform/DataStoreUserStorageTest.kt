package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.network.AuthTokens
import java.io.File
import java.nio.file.Files
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import kotlin.coroutines.cancellation.CancellationException
import kotlin.io.encoding.Base64
import java.security.ProviderException
import java.security.UnrecoverableKeyException
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
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withTimeout

class DataStoreUserStorageTest {

    /** Invierte los bytes: reversible y distinto del texto original. */
    private class ReversingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain.reversedArray()
        override fun decrypt(data: ByteArray): ByteArray = data.reversedArray()
    }

    private class FailingCipher(private val failure: Exception) : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw failure
    }

    private class CancellingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw CancellationException("cancelado")
    }

    /** Cifra como [ReversingCipher]; al descifrar avisa, espera a que lo suelten y falla. */
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

    private val ana = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")
    private val directories = mutableListOf<File>()
    private val scopes = mutableListOf<CoroutineScope>()

    private fun dataStore(directory: File = newDirectory()): DataStore<Preferences> {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO).also(scopes::add)
        return PreferenceDataStoreFactory.create(scope = scope) { File(directory, "session.preferences_pb") }
    }

    private fun newDirectory(): File =
        Files.createTempDirectory("user-storage").toFile().also(directories::add)

    @AfterTest
    fun cleanup() {
        scopes.forEach { it.cancel() }
        directories.forEach { it.deleteRecursively() }
    }

    @Test
    fun sinNadaGuardadoLeeNull() = runBlocking {
        assertNull(DataStoreUserStorage(dataStore(), ReversingCipher()).read())
    }

    @Test
    fun loGuardadoSeLeeIgual() = runBlocking {
        val storage = DataStoreUserStorage(dataStore(), ReversingCipher())

        storage.save(ana)

        assertEquals(ana, storage.read())
    }

    @Test
    fun clearBorraElUsuario() = runBlocking {
        val storage = DataStoreUserStorage(dataStore(), ReversingCipher())
        storage.save(ana)

        storage.clear()

        assertNull(storage.read())
    }

    @Test
    fun elValorGuardadoNoContieneElCorreoEnClaro() = runBlocking {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        val raw = store.data.first()[DataStoreUserStorage.USER_KEY]

        assertNotNull(raw)
        assertFalse("ana@zarza.example" in raw)
    }

    @Test
    fun unaClavePerdidaDevuelveNullYBorraLaEntrada() = runBlocking {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        val result = DataStoreUserStorage(store, FailingCipher(UnrecoverableKeyException("clave perdida"))).read()

        assertNull(result)
        assertNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    @Test
    fun unFalloPasajeroSePropagaYNoBorraLaEntrada() = runBlocking<Unit> {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        assertFailsWith<ProviderException> {
            DataStoreUserStorage(store, FailingCipher(ProviderException("keystore ocupado"))).read()
        }

        assertNotNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    @Test
    fun comparteElArchivoConLosTokensSinPisarlos() = runBlocking {
        val store = dataStore()
        val cipher = ReversingCipher()
        val tokens = DataStoreTokenStorage(store, cipher)
        val users = DataStoreUserStorage(store, cipher)
        tokens.save(AuthTokens("access", "refresh"))
        users.save(ana)

        tokens.clear()

        assertNull(tokens.read())
        assertEquals(ana, users.read())
    }

    @Test
    fun guardarDosVecesSustituyeAlAnterior() = runBlocking {
        val storage = DataStoreUserStorage(dataStore(), ReversingCipher())
        val otro = User("u2", "luis@zarza.example", UserRole.PRODUCTOR, "Luis", null)
        storage.save(ana)

        storage.save(otro)

        assertEquals(otro, storage.read())
    }

    @Test
    fun siLoDescifradoNoEsUnUsuarioBorraLaEntradaYDevuelveNull() = runBlocking {
        val store = dataStore()
        val notJson = Base64.encode("esto no es json".encodeToByteArray().reversedArray())
        store.edit { it[DataStoreUserStorage.USER_KEY] = notJson }

        assertNull(DataStoreUserStorage(store, ReversingCipher()).read())
        assertNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    @Test
    fun siLoGuardadoNoEsBase64BorraLaEntradaYDevuelveNull() = runBlocking {
        val store = dataStore()
        store.edit { it[DataStoreUserStorage.USER_KEY] = "¡¡no es base64!!" }

        assertNull(DataStoreUserStorage(store, ReversingCipher()).read())
        assertNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    @Test
    fun unaCancelacionDuranteLaLecturaNoBorraLaEntrada() = runBlocking<Unit> {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        assertFailsWith<CancellationException> { DataStoreUserStorage(store, CancellingCipher()).read() }

        assertNotNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    // Necesita concurrencia real (un `save` mientras `read` está bloqueado descifrando).
    @Test
    fun siSeGuardaOtroUsuarioMientrasFallaLaLecturaNoSeBorra() = runBlocking<Unit> {
        val blockingCipher = BlockingFailingCipher()
        val store = dataStore()
        val working = DataStoreUserStorage(store, ReversingCipher())
        val blocked = DataStoreUserStorage(store, blockingCipher)
        val nuevo = User("u2", "luis@zarza.example", UserRole.PRODUCTOR, "Luis", null)
        working.save(ana)
        try {
            val reading = async(Dispatchers.IO) { blocked.read() }
            assertTrue(blockingCipher.entered.await(TIMEOUT_SECONDS, TimeUnit.SECONDS), "la lectura no llegó a descifrar")
            working.save(nuevo)
            blockingCipher.release.countDown()

            assertNull(withTimeout(TIMEOUT_SECONDS * 1000) { reading.await() })
            assertEquals(nuevo, working.read())
        } finally {
            blockingCipher.release.countDown()
        }
    }

    private companion object {
        /** Tope de las esperas de la prueba concurrente, para que un fallo no cuelgue el build. */
        const val TIMEOUT_SECONDS = 10L
    }
}
