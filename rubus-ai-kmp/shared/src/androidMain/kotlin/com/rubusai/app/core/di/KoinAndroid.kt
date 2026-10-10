package com.rubusai.app.core.di

import android.content.Context
import com.rubusai.app.core.config.Environment
import org.koin.android.ext.koin.androidContext

/** Arranque de Koin en Android. Se llama una vez, desde `Application.onCreate`. */
fun startKoinAndroid(context: Context, environment: Environment, devHost: String) {
    initKoin(environment, devHost, androidPlatformModule) {
        androidContext(context.applicationContext)
    }
}
