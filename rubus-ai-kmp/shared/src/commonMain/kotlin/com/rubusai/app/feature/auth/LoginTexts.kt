package com.rubusai.app.feature.auth

import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.login_error_email_invalid
import com.rubusai.app.resources.login_error_email_required
import com.rubusai.app.resources.login_error_password_required
import com.rubusai.app.resources.login_failure_invalid_credentials
import com.rubusai.app.resources.login_failure_invalid_input
import com.rubusai.app.resources.login_failure_network
import com.rubusai.app.resources.login_failure_rate_limited
import com.rubusai.app.resources.login_failure_unexpected
import com.rubusai.app.resources.login_failure_unsupported_role
import org.jetbrains.compose.resources.StringResource

internal fun LoginFailure.messageRes(): StringResource = when (this) {
    LoginFailure.InvalidCredentials -> Res.string.login_failure_invalid_credentials
    LoginFailure.RateLimited -> Res.string.login_failure_rate_limited
    LoginFailure.Network -> Res.string.login_failure_network
    LoginFailure.InvalidInput -> Res.string.login_failure_invalid_input
    LoginFailure.UnsupportedRole -> Res.string.login_failure_unsupported_role
    LoginFailure.Unexpected -> Res.string.login_failure_unexpected
}

internal fun LoginFieldError.messageRes(): StringResource = when (this) {
    LoginFieldError.EmailRequired -> Res.string.login_error_email_required
    LoginFieldError.EmailInvalid -> Res.string.login_error_email_invalid
    LoginFieldError.PasswordRequired -> Res.string.login_error_password_required
}
