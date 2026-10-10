package com.rubusai.app

import android.app.Application
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.di.startKoinAndroid

class RubusApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Un ENVIRONMENT desconocido o un DEV_HOST vacío en dev lanzan aquí y la app
        // no arranca; es intencional.
        startKoinAndroid(
            context = this,
            environment = Environment.valueOf(BuildConfig.ENVIRONMENT),
            devHost = BuildConfig.DEV_HOST,
        )
    }
}
