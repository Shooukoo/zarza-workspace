package com.rubusai.app.core.platform

/** Cifrado simétrico de lo que se guarda en disco. Separado del almacenamiento para poder probarlo sin Keystore. */
internal interface TokenCipher {
    fun encrypt(plain: ByteArray): ByteArray

    /** Lanza si [data] no se cifró con la clave actual o está corrupto. */
    fun decrypt(data: ByteArray): ByteArray
}
