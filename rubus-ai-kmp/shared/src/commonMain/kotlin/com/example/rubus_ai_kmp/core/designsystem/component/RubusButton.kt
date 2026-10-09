package com.example.rubus_ai_kmp.core.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.isSpecified
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.example.rubus_ai_kmp.core.designsystem.theme.RubusDimens
import com.example.rubus_ai_kmp.core.designsystem.theme.RubusTheme

enum class RubusButtonVariant { Primary, Secondary, Danger, Outline }

/**
 * Botón con relieve: la cara descansa sobre un canto más oscuro y se hunde al pulsar.
 * El texto se muestra en mayúsculas.
 */
@Composable
fun RubusButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    variant: RubusButtonVariant = RubusButtonVariant.Primary,
) {
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val sunk = pressed && enabled
    val colors = buttonColors(variant, enabled)
    val depth = colors.depth

    Box(
        modifier = modifier
            .defaultMinSize(minWidth = 64.dp, minHeight = RubusDimens.ButtonHeight)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                enabled = enabled,
                role = Role.Button,
                onClick = onClick,
            )
            .drawBehind {
                val depthPx = depth.toPx()
                val radiusPx = RubusDimens.ButtonRadius.toPx()
                val faceTop = if (sunk) depthPx else 0f
                val faceSize = Size(size.width, size.height - depthPx)
                if (!sunk) {
                    drawRoundRect(colors.edge, cornerRadius = CornerRadius(radiusPx))
                }
                drawRoundRect(
                    color = colors.face,
                    topLeft = Offset(0f, faceTop),
                    size = faceSize,
                    cornerRadius = CornerRadius(radiusPx),
                )
                if (colors.border.isSpecified) {
                    val stroke = RubusDimens.BorderWidth.toPx()
                    drawRoundRect(
                        color = colors.border,
                        topLeft = Offset(stroke / 2, faceTop + stroke / 2),
                        size = Size(faceSize.width - stroke, faceSize.height - stroke),
                        cornerRadius = CornerRadius(radiusPx - stroke / 2),
                        style = Stroke(stroke),
                    )
                }
            }
            .padding(top = if (sunk) depth else 0.dp, bottom = if (sunk) 0.dp else depth)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = text.uppercase(),
            color = colors.content,
            style = MaterialTheme.typography.labelLarge,
            maxLines = 1,
        )
    }
}

private class ButtonColors(
    val face: Color,
    val edge: Color,
    val content: Color,
    val border: Color = Color.Unspecified,
    val depth: Dp = RubusDimens.ButtonDepth,
)

@Composable
private fun buttonColors(variant: RubusButtonVariant, enabled: Boolean): ButtonColors {
    val scheme = MaterialTheme.colorScheme
    val extra = RubusTheme.colors
    if (!enabled) {
        return ButtonColors(
            face = extra.disabledContainer,
            edge = extra.disabledContainer,
            content = extra.onDisabledContainer,
        )
    }
    return when (variant) {
        RubusButtonVariant.Primary -> ButtonColors(scheme.primary, extra.primaryDepth, scheme.onPrimary)
        RubusButtonVariant.Secondary -> ButtonColors(scheme.secondary, extra.secondaryDepth, scheme.onSecondary)
        RubusButtonVariant.Danger -> ButtonColors(scheme.error, extra.errorDepth, scheme.onError)
        RubusButtonVariant.Outline -> ButtonColors(
            face = scheme.surface,
            edge = scheme.outline,
            content = scheme.onSurfaceVariant,
            border = scheme.outline,
            depth = RubusDimens.OutlineDepth,
        )
    }
}
