package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.rubusai.app.core.model.User
import java.security.GeneralSecurityException
import kotlin.coroutines.cancellation.CancellationException
import kotlin.io.encoding.Base64
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

/**
 * Guarda el usuario en la misma instancia de DataStore que [DataStoreTokenStorage] (solo se
 * admite una por archivo), en otra clave: el JSON de [User] cifrado con [cipher] y en Base64.
 * Cifrado porque el correo y el nombre son datos personales.
 *
 * [read] tiene el mismo efecto secundario que el de los tokens: lo ilegible (clave perdida,
 * dato corrupto) se borra y devuelve `null`; un fallo pasajero del cifrado se propaga sin borrar.
 */
internal class DataStoreUserStorage(
    private val dataStore: DataStore<Preferences>,
    private val cipher: TokenCipher,
) : UserStorage {

    override suspend fun read(): User? {
        val stored = dataStore.data.first()[USER_KEY] ?: return null
        val user = try {
            Json.decodeFromString<User>(cipher.decrypt(Base64.decode(stored)).decodeToString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Igual que con los tokens: solo lo permanente se descarta; cualquier otro fallo
            // se propaga para no perder la sesión por un Keystore ocupado. SerializationException
            // es una IllegalArgumentException, así que un JSON ilegible también se descarta.
            if (e !is GeneralSecurityException && e !is IllegalArgumentException) throw e
            null
        }
        // Solo se borra si sigue guardado lo que no se pudo leer: otro `save` puede haber
        // dejado un valor válido mientras tanto.
        if (user == null) dataStore.edit { if (it[USER_KEY] == stored) it.remove(USER_KEY) }
        return user
    }

    override suspend fun save(user: User) {
        val encrypted = cipher.encrypt(Json.encodeToString(user).encodeToByteArray())
        dataStore.edit { it[USER_KEY] = Base64.encode(encrypted) }
    }

    override suspend fun clear() {
        dataStore.edit { it.remove(USER_KEY) }
    }

    internal companion object {
        val USER_KEY = stringPreferencesKey("user")
    }
}
