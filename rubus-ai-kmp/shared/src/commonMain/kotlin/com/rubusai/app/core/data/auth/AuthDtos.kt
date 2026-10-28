package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlinx.serialization.Serializable

@Serializable
internal data class LoginRequest(val email: String, val password: String) {
    // Evita que la contraseña o los tokens acaben en un log o en el mensaje de una excepción.
    override fun toString(): String = "LoginRequest(***)"
}

@Serializable
internal data class UserDto(
    val id: String,
    val email: String,
    val role: String,
    val firstName: String? = null,
    val lastName: String? = null,
)

@Serializable
internal data class LoginResponse(val token: String, val refreshToken: String, val user: UserDto) {
    // Evita que la contraseña o los tokens acaben en un log o en el mensaje de una excepción.
    override fun toString(): String = "LoginResponse(***)"
}

@Serializable
internal data class LogoutRequest(val refreshToken: String) {
    // Evita que el refresh token acabe en un log o en el mensaje de una excepción.
    override fun toString(): String = "LogoutRequest(***)"
}

/** `null` si el rol que envía el backend no se conoce: no se degrada a otro rol. */
internal fun UserDto.toUserOrNull(): User? {
    val userRole = try {
        UserRole.fromApi(role)
    } catch (e: IllegalArgumentException) {
        return null
    }
    return User(id = id, email = email, role = userRole, firstName = firstName, lastName = lastName)
}
