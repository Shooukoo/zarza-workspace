package com.example.rubus_ai_kmp.core.platform

/** Acceso a la ubicación GPS del dispositivo. */
interface LocationProvider

expect fun createLocationProvider(): LocationProvider
