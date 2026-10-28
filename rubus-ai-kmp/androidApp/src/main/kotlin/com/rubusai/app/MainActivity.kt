package com.rubusai.app

import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {

    private val requestLocalNetwork =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            // Sin acción: si se deniega, "Probar conexión" y el login fallan a la vista.
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        // Solo al primer arranque: al rotar savedInstanceState != null y no se vuelve a pedir.
        if (savedInstanceState == null) requestLocalNetworkIfNeeded()

        setContent {
            App()
        }
    }

    // Solo en dev: Android 17 (SDK 37) bloquea en silencio las IPs privadas (10.0.2.2, la LAN)
    // si la app no tiene este permiso. staging y prod usan hosts públicos y no lo declaran.
    private fun requestLocalNetworkIfNeeded() {
        if (BuildConfig.FLAVOR != "dev" || Build.VERSION.SDK_INT < LOCAL_NETWORK_SDK) return
        if (checkSelfPermission(LOCAL_NETWORK) != PackageManager.PERMISSION_GRANTED) {
            requestLocalNetwork.launch(LOCAL_NETWORK)
        }
    }

    private companion object {
        const val LOCAL_NETWORK = "android.permission.ACCESS_LOCAL_NETWORK"
        const val LOCAL_NETWORK_SDK = 37
    }
}
