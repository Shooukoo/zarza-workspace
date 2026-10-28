package com.rubusai.app.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.core.data.auth.LoginResult
import com.rubusai.app.core.data.auth.SessionManager
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Error de un campo detectado antes de enviar. La pantalla lo convierte en texto. */
internal enum class LoginFieldError { EmailRequired, EmailInvalid, PasswordRequired }

internal data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val emailError: LoginFieldError? = null,
    val passwordError: LoginFieldError? = null,
    val submitting: Boolean = false,
    val formError: LoginFailure? = null,
)

// Forma `x@y`: lo que el backend valida de verdad es el correo; esto solo evita enviar un error evidente.
private val EmailShape = Regex("""[^@\s]+@[^@\s]+""")

internal class LoginViewModel(private val sessionManager: SessionManager) : ViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onEmailChange(value: String) =
        _state.update { it.copy(email = value, emailError = null, formError = null) }

    fun onPasswordChange(value: String) =
        _state.update { it.copy(password = value, passwordError = null, formError = null) }

    fun onSubmit() {
        val current = _state.value
        if (current.submitting) return

        val email = current.email.trim()
        val emailError = when {
            email.isEmpty() -> LoginFieldError.EmailRequired
            !EmailShape.matches(email) -> LoginFieldError.EmailInvalid
            else -> null
        }
        val passwordError = if (current.password.isEmpty()) LoginFieldError.PasswordRequired else null
        if (emailError != null || passwordError != null) {
            _state.update { it.copy(emailError = emailError, passwordError = passwordError, formError = null) }
            return
        }

        _state.update { it.copy(submitting = true, formError = null, emailError = null, passwordError = null) }
        viewModelScope.launch {
            val failure = try {
                (sessionManager.login(email, current.password) as? LoginResult.Failure)?.reason
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // El guardado de la sesión falló: no hay causa del backend que mostrar.
                LoginFailure.Unexpected
            }
            // Con un login correcto el estado de sesión cambia y la navegación sale de esta pantalla.
            _state.update { it.copy(submitting = false, formError = failure) }
        }
    }
}
