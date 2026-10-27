package com.rubusai.app.core.di

import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.rubusai.app.core.platform.DataStoreTokenStorage
import com.rubusai.app.core.platform.KeystoreTokenCipher
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.TokenCipher
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.logging.ANDROID
import io.ktor.client.plugins.logging.Logger
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Implementaciones de `core/platform` y piezas de red propias de Android.
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun androidPlatformModule(): Module = module {
    single<HttpClientEngine> { OkHttp.create() }
    single<Logger> { Logger.ANDROID }
    single<TokenCipher> { KeystoreTokenCipher() }
    single<SecureTokenStorage> {
        val context = androidContext()
        DataStoreTokenStorage(
            // DataStore solo admite una instancia por archivo y proceso: por eso vive dentro
            // de este `single`. Si Koin se parase y se volviera a arrancar en el mismo
            // proceso (tests), la segunda instancia fallaría al usarse.
            dataStore = PreferenceDataStoreFactory.create(
                // Un archivo corrupto se sustituye por uno vacío: se pierde la sesión, no la app.
                corruptionHandler = ReplaceFileCorruptionHandler { emptyPreferences() },
            ) {
                context.preferencesDataStoreFile(DataStoreTokenStorage.DATASTORE_NAME)
            },
            cipher = get(),
        )
    }
}
