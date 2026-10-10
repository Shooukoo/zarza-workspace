package com.rubusai.app.core.platform

/** Acceso a la ubicación GPS del dispositivo. */
interface LocationProvider

expect fun createLocationProvider(): LocationProvider
