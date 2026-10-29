package com.rubusai.app.core.platform

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlin.coroutines.cancellation.CancellationException
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

/** Ubicación con Play Services. Sin permiso, sin señal a tiempo o con el servicio caído devuelve `null`. */
internal class FusedLocationProvider(private val context: Context) : LocationProvider {

    private val client by lazy { LocationServices.getFusedLocationProviderClient(context) }

    override suspend fun current(): Coordinates? {
        if (!hasLocationPermission(context)) return null
        return try {
            withTimeoutOrNull(LOCATION_TIMEOUT_MS) { currentLocation() }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // SecurityException si el permiso se retiró a mitad, o servicios de Google ausentes.
            null
        }
    }

    @SuppressLint("MissingPermission") // Comprobado en `current()`.
    private suspend fun currentLocation(): Coordinates? = suspendCancellableCoroutine { continuation ->
        val cancellation = CancellationTokenSource()
        continuation.invokeOnCancellation { cancellation.cancel() }
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellation.token)
            .addOnSuccessListener { location ->
                continuation.resume(location?.let { Coordinates(it.latitude, it.longitude) })
            }
            .addOnFailureListener { continuation.resume(null) }
            .addOnCanceledListener { continuation.resume(null) }
    }
}

/** Con el permiso aproximado (Android 12+) Play Services devuelve una posición menos precisa; sirve igual. */
internal fun hasLocationPermission(context: Context): Boolean =
    listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION).any {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }
