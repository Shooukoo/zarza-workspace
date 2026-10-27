package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.rubusai.app.core.network.AuthTokens
import java.security.GeneralSecurityException
import kotlin.coroutines.cancellation.CancellationException
import kotlin.io.encoding.Base64
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

/**
 * Guarda los dos tokens en una sola entrada de DataStore: el JSON de [AuthTokens],
 * cifrado con [cipher] y codificado en Base64. Al ser una entrada, se escriben y se
 * borran de forma atómica.
 *
 * [read] tiene un efecto secundario: si lo guardado no se puede leer (clave perdida, dato
 * corrupto), lo borra. Un fallo pasajero del cifrado no se borra: se propaga.
 */
internal class DataStoreTokenStorage(
    private val dataStore: DataStore<Preferences>,
    private val cipher: TokenCipher,
) : SecureTokenStorage {

    override suspend fun read(): AuthTokens? {
        val stored = dataStore.data.first()[TOKENS_KEY] ?: return null
        val tokens = try {
            Json.decodeFromString<AuthTokens>(cipher.decrypt(Base64.decode(stored)).decodeToString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Clave del Keystore perdida, dato corrupto o formato antiguo: se descarta y el
            // usuario vuelve a iniciar sesión. Cualquier otro fallo (un Keystore ocupado, por
            // ejemplo) puede pasar, y borrar la sesión por eso la perdería sin motivo: se propaga.
            // No registrar `e` ni su mensaje: el de un JSON mal formado incluye el texto
            // descifrado, es decir, los tokens.
            if (e !is GeneralSecurityException && e !is IllegalArgumentException) throw e
            null
        }
        // Solo se borra si sigue guardado lo que no se pudo leer: otro `save` puede haber
        // dejado un par válido mientras tanto.
        if (tokens == null) dataStore.edit { if (it[TOKENS_KEY] == stored) it.remove(TOKENS_KEY) }
        return tokens
    }

    override suspend fun save(tokens: AuthTokens) {
        val encrypted = cipher.encrypt(Json.encodeToString(tokens).encodeToByteArray())
        val encoded = Base64.encode(encrypted)
        dataStore.edit { it[TOKENS_KEY] = encoded }
    }

    override suspend fun clear() {
        dataStore.edit { it.remove(TOKENS_KEY) }
    }

    internal companion object {
        /** Nombre del DataStore Preferences donde vive la sesión. */
        const val DATASTORE_NAME = "session"
        val TOKENS_KEY = stringPreferencesKey("tokens")
    }
}
