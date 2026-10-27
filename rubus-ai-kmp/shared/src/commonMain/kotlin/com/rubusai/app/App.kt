package com.rubusai.app

import androidx.compose.runtime.Composable
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.navigation.RubusNavHost
import org.koin.compose.koinInject

@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()

    RubusTheme {
        RubusNavHost(environment = envConfig.environment)
    }
}
