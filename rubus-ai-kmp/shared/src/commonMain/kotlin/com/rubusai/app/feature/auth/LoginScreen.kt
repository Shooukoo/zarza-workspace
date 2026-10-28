package com.rubusai.app.feature.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.designsystem.component.RubusTextField
import com.rubusai.app.dev.DevActions
import com.rubusai.app.dev.DevButtons
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.app_name
import com.rubusai.app.resources.login_email_label
import com.rubusai.app.resources.login_password_label
import com.rubusai.app.resources.login_session_expired
import com.rubusai.app.resources.login_submit
import com.rubusai.app.resources.login_submitting
import com.rubusai.app.resources.login_title
import com.rubusai.app.resources.logo_rubus
import com.rubusai.app.resources.password_hide
import com.rubusai.app.resources.password_show
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

/** Conecta [LoginScreen] con su `ViewModel`. [sessionExpired] lo decide el estado de sesión que observa la navegación. */
@Composable
internal fun LoginRoute(sessionExpired: Boolean, devActions: DevActions?) {
    val viewModel = koinViewModel<LoginViewModel>()
    val state by viewModel.state.collectAsStateWithLifecycle()
    LoginScreen(
        state = state,
        sessionExpired = sessionExpired,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::onSubmit,
        devActions = devActions,
    )
}

@Composable
internal fun LoginScreen(
    state: LoginUiState,
    sessionExpired: Boolean,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
    devActions: DevActions? = null,
) {
    // Desplazable y alineado arriba: con el teclado abierto el formulario no cabe en pantallas pequeñas.
    RubusScreen(
        modifier = modifier,
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(32.dp))
        Image(
            painter = painterResource(Res.drawable.logo_rubus),
            contentDescription = stringResource(Res.string.app_name),
            modifier = Modifier.size(96.dp),
        )
        Text(text = stringResource(Res.string.login_title), style = MaterialTheme.typography.headlineLarge)

        if (sessionExpired) {
            Text(
                text = stringResource(Res.string.login_session_expired),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        RubusTextField(
            value = state.email,
            onValueChange = onEmailChange,
            label = stringResource(Res.string.login_email_label),
            enabled = !state.submitting,
            errorText = state.emailError?.let { stringResource(it.messageRes()) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
        RubusTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = stringResource(Res.string.login_password_label),
            enabled = !state.submitting,
            errorText = state.passwordError?.let { stringResource(it.messageRes()) },
            isPassword = true,
            showPasswordLabel = stringResource(Res.string.password_show),
            hidePasswordLabel = stringResource(Res.string.password_hide),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            modifier = Modifier.fillMaxWidth(),
        )

        state.formError?.let { failure ->
            Text(
                text = stringResource(failure.messageRes()),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                // Se anuncia al aparecer, igual que los errores de campo.
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }

        RubusButton(
            text = stringResource(if (state.submitting) Res.string.login_submitting else Res.string.login_submit),
            onClick = onSubmit,
            enabled = !state.submitting,
            modifier = Modifier.fillMaxWidth(),
        )

        devActions?.let { DevButtons(it) }
    }
}
