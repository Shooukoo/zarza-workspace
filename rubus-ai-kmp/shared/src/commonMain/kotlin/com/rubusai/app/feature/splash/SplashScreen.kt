package com.rubusai.app.feature.splash

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.app_name
import com.rubusai.app.resources.logo_rubus
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

/** Vista del estado `Loading`: solo el logo. No decide nada, la navegación sale de aquí cuando hay sesión. */
@Composable
internal fun SplashScreen(modifier: Modifier = Modifier) {
    RubusScreen(modifier = modifier) {
        Image(
            painter = painterResource(Res.drawable.logo_rubus),
            contentDescription = stringResource(Res.string.app_name),
            modifier = Modifier.size(128.dp),
        )
    }
}
