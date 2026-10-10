package com.rubusai.app.core.platform

/** Almacenamiento seguro de los tokens de sesión. */
interface SecureTokenStorage

expect fun createSecureTokenStorage(): SecureTokenStorage
