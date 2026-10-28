package com.rubusai.app.feature.home

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.model.User
import com.rubusai.app.dev.DevActions
import com.rubusai.app.dev.DevButtons
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.home_logging_out
import com.rubusai.app.resources.home_logout
import com.rubusai.app.resources.home_title
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun HomeRoute(devActions: DevActions?) {
    val viewModel = koinViewModel<HomeViewModel>()
    val sessionState by viewModel.sessionState.collectAsStateWithLifecycle()
    val loggingOut by viewModel.loggingOut.collectAsStateWithLifecycle()
    HomeScreen(
        user = (sessionState as? SessionState.Authenticated)?.user,
        loggingOut = loggingOut,
        onLogout = viewModel::onLogout,
        devActions = devActions,
    )
}

@Composable
internal fun HomeScreen(
    user: User?,
    loggingOut: Boolean,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    devActions: DevActions? = null,
) {
    RubusScreen(modifier = modifier) {
        Text(text = stringResource(Res.string.home_title), style = MaterialTheme.typography.headlineLarge)
        user?.let {
            Text(text = it.displayName, style = MaterialTheme.typography.titleLarge)
            Text(text = it.email, style = MaterialTheme.typography.bodyLarge)
            Text(text = it.role.displayName, style = MaterialTheme.typography.bodyLarge)
        }
        RubusButton(
            text = stringResource(if (loggingOut) Res.string.home_logging_out else Res.string.home_logout),
            onClick = onLogout,
            enabled = !loggingOut,
            variant = RubusButtonVariant.Danger,
        )
        devActions?.let { DevButtons(it) }
    }
}
