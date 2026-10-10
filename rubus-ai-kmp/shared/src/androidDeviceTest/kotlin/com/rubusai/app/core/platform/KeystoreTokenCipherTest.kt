package com.rubusai.app.core.platform

import java.security.KeyStore
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

class KeystoreTokenCipherTest {

    private val alias = "rubus_session_key_test"
    private val cipher = KeystoreTokenCipher(alias)
    private val plain = """{"accessToken":"access-1","refreshToken":"refresh-1"}""".encodeToByteArray()

    @AfterTest
    fun tearDown() {
        KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.deleteEntry(alias)
    }

    @Test
    fun loCifradoSeDescifraAlValorOriginal() {
        assertContentEquals(plain, cipher.decrypt(cipher.encrypt(plain)))
    }

    @Test
    fun dosCifradosDelMismoValorDifieren() {
        assertFalse(cipher.encrypt(plain).contentEquals(cipher.encrypt(plain)))
    }

    @Test
    fun otraInstanciaConElMismoAliasDescifra() {
        val encrypted = cipher.encrypt(plain)

        assertContentEquals(plain, KeystoreTokenCipher(alias).decrypt(encrypted))
    }

    @Test
    fun unDatoManipuladoNoSeDescifra() {
        val encrypted = cipher.encrypt(plain)
        encrypted[encrypted.lastIndex] = (encrypted.last().toInt() xor 0x01).toByte()

        assertFailsWith<Exception> { cipher.decrypt(encrypted) }
    }

    @Test
    fun unDatoDemasiadoCortoNoSeDescifra() {
        assertFailsWith<IllegalArgumentException> { cipher.decrypt(ByteArray(4)) }
    }
}
