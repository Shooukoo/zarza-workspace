package com.example.rubus_ai_kmp.core.platform

/** Almacenamiento seguro de los tokens de sesión. */
interface SecureTokenStorage

expect fun createSecureTokenStorage(): SecureTokenStorage
