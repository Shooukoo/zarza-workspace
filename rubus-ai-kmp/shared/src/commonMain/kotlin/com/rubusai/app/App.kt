package com.rubusai.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.navigation.RubusNavHost
import org.koin.compose.koinInject

@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()
    val sessionManager = koinInject<SessionManager>()
    val sessionState by sessionManager.state.collectAsStateWithLifecycle()

    // Idempotente: una rotación vuelve a componer `App` y no debe releer la sesión.
    LaunchedEffect(sessionManager) { sessionManager.start() }

    RubusTheme {
        RubusNavHost(environment = envConfig.environment, sessionState = sessionState)
    }
}
