package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlinx.serialization.Serializable

@Serializable
internal data class LoginRequest(val email: String, val password: String)

@Serializable
internal data class UserDto(
    val id: String,
    val email: String,
    val role: String,
    val firstName: String? = null,
    val lastName: String? = null,
)

@Serializable
internal data class LoginResponse(val token: String, val refreshToken: String, val user: UserDto)

/** `null` si el rol que envía el backend no se conoce: no se degrada a otro rol. */
internal fun UserDto.toUserOrNull(): User? {
    val userRole = try {
        UserRole.fromApi(role)
    } catch (e: IllegalArgumentException) {
        return null
    }
    return User(id = id, email = email, role = userRole, firstName = firstName, lastName = lastName)
}
