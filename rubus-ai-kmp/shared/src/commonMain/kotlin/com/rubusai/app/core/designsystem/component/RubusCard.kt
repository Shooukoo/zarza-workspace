package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.theme.RubusDimens

/**
 * Tarjeta con borde y un canto inferior, como las variantes con contorno del botón. Con
 * [onClick] es clicable; sin él, solo agrupa contenido.
 */
@Composable
fun RubusCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val depth = RubusDimens.OutlineDepth
    val clicks = if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(RubusDimens.CardRadius))
            .then(clicks)
            .drawBehind {
                val radius = CornerRadius(RubusDimens.CardRadius.toPx())
                val stroke = RubusDimens.BorderWidth.toPx()
                val face = Size(size.width, size.height - depth.toPx())
                drawRoundRect(scheme.outline, cornerRadius = radius)
                drawRoundRect(scheme.surface, size = face, cornerRadius = radius)
                drawRoundRect(
                    color = scheme.outline,
                    topLeft = Offset(stroke / 2, stroke / 2),
                    size = Size(face.width - stroke, face.height - stroke),
                    cornerRadius = CornerRadius(radius.x - stroke / 2),
                    style = Stroke(stroke),
                )
            }
            .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 16.dp + depth),
        content = content,
    )
}
