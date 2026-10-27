package com.rubusai.app.core.platform

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AES-256-GCM con una clave que vive en el Android Keystore y nunca sale de él.
 * Cada cifrado usa un IV aleatorio, que se antepone al resultado: `IV (12 bytes) + cifrado`.
 *
 * La clave no entra en las copias de seguridad ni sobrevive a una reinstalación: lo
 * cifrado antes deja de poder leerse.
 */
internal class KeystoreTokenCipher(private val alias: String = DEFAULT_ALIAS) : TokenCipher {

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    override fun encrypt(plain: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return cipher.iv + cipher.doFinal(plain)
    }

    override fun decrypt(data: ByteArray): ByteArray {
        require(data.size > IV_SIZE_BYTES) { "Dato cifrado demasiado corto" }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_SIZE_BITS, data, 0, IV_SIZE_BYTES))
        return cipher.doFinal(data, IV_SIZE_BYTES, data.size - IV_SIZE_BYTES)
    }

    // Sincronizado para que dos hilos no generen la clave a la vez en el primer uso.
    @Synchronized
    private fun key(): SecretKey =
        (keyStore.getKey(alias, null) as? SecretKey) ?: generateKey()

    private fun generateKey(): SecretKey {
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_SIZE_BITS)
            .build()
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            .apply { init(spec) }
            .generateKey()
    }

    private companion object {
        const val DEFAULT_ALIAS = "rubus_session_key"
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val KEY_SIZE_BITS = 256
        const val IV_SIZE_BYTES = 12
        const val TAG_SIZE_BITS = 128
    }
}
