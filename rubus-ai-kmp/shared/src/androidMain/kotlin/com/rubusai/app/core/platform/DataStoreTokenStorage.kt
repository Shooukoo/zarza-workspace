package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.rubusai.app.core.network.AuthTokens
import kotlin.io.encoding.Base64
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

/**
 * Guarda los dos tokens en una sola entrada de DataStore: el JSON de [AuthTokens],
 * cifrado con [cipher] y codificado en Base64. Al ser una entrada, se escriben y se
 * borran de forma atómica.
 */
internal class DataStoreTokenStorage(
    private val dataStore: DataStore<Preferences>,
    private val cipher: TokenCipher,
) : SecureTokenStorage {

    override suspend fun read(): AuthTokens? {
        val stored = dataStore.data.first()[TOKENS_KEY] ?: return null
        val tokens = try {
            Json.decodeFromString<AuthTokens>(cipher.decrypt(Base64.decode(stored)).decodeToString())
        } catch (e: Exception) {
            // Clave del Keystore perdida, dato corrupto o formato antiguo: no hay forma
            // de recuperarlo, así que se descarta y el usuario vuelve a iniciar sesión.
            null
        }
        if (tokens == null) clear()
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
