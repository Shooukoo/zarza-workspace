package com.rubusai.app.core.di

import android.content.Context
import com.rubusai.app.core.config.Environment
import org.koin.android.ext.koin.androidContext

/**
 * Arranque de Koin en Android. Se llama una vez por proceso, desde `Application.onCreate`;
 * una segunda llamada lanza `KoinApplicationAlreadyStartedException`.
 * Lanza `IllegalArgumentException` si [devHost] está en blanco en [Environment.DEV].
 * De [context] solo se conserva su `applicationContext`.
 */
fun startKoinAndroid(context: Context, environment: Environment, devHost: String) {
    initKoin(environment, devHost, androidPlatformModule) {
        androidContext(context.applicationContext)
    }
}
