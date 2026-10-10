package com.rubusai.app.core.model

data class User(
    val id: String,
    val email: String,
    val role: UserRole,
    val firstName: String? = null,
    val lastName: String? = null,
) {
    /** El nombre si existe y no está en blanco; si no, la parte del correo anterior a `@`. */
    val displayName: String
        get() = firstName?.takeIf { it.isNotBlank() } ?: email.substringBefore('@')
}
