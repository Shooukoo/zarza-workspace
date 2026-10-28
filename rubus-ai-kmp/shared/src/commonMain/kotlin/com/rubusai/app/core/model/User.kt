package com.rubusai.app.core.model

import kotlinx.serialization.Serializable

// Serializable para guardarlo cifrado en el dispositivo (UserStorage).
@Serializable
data class User(
    val id: String,
    val email: String,
    val role: UserRole,
    val firstName: String? = null,
    val lastName: String? = null,
) {
    /** El nombre sin espacios si queda algo; si no, la parte del correo anterior a `@`. */
    val displayName: String
        get() = firstName?.trim()?.takeIf { it.isNotEmpty() } ?: email.substringBefore('@')
}
