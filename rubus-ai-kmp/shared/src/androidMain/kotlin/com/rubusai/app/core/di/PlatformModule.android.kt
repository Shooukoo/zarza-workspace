package com.rubusai.app.core.di

import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.rubusai.app.core.platform.AndroidImageCompressor
import com.rubusai.app.core.platform.DataStoreTokenStorage
import com.rubusai.app.core.platform.DataStoreUserStorage
import com.rubusai.app.core.platform.FusedLocationProvider
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.KeystoreTokenCipher
import com.rubusai.app.core.platform.LocationProvider
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.TokenCipher
import com.rubusai.app.core.platform.UserStorage
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.logging.ANDROID
import io.ktor.client.plugins.logging.Logger
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module
import java.util.concurrent.TimeUnit

/**
 * Implementaciones de `core/platform` y piezas de red propias de Android.
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun androidPlatformModule(): Module = module {
    // El ping del plugin WebSockets no aplica al motor OkHttp: el keepalive se configura aquí (inocuo para REST).
    single<HttpClientEngine> { OkHttp.create { config { pingInterval(20, TimeUnit.SECONDS) } } }
    single<Logger> { Logger.ANDROID }
    single<TokenCipher> { KeystoreTokenCipher() }
    // DataStore solo admite una instancia por archivo y proceso: la comparten los tokens y el
    // usuario, y por eso vive en su propio `single`. Si Koin se parase y se volviera a arrancar
    // en el mismo proceso (tests), la segunda instancia fallaría al usarse.
    single<DataStore<Preferences>> {
        val context = androidContext()
        PreferenceDataStoreFactory.create(
            // Un archivo corrupto se sustituye por uno vacío: se pierde la sesión, no la app.
            corruptionHandler = ReplaceFileCorruptionHandler { emptyPreferences() },
        ) {
            context.preferencesDataStoreFile(DataStoreTokenStorage.DATASTORE_NAME)
        }
    }
    single<SecureTokenStorage> { DataStoreTokenStorage(dataStore = get(), cipher = get()) }
    single<UserStorage> { DataStoreUserStorage(dataStore = get(), cipher = get()) }
    single<ImageCompressor> { AndroidImageCompressor() }
    single<LocationProvider> { FusedLocationProvider(androidContext()) }
}
