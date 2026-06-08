import 'dart:math' as math;
import 'package:flutter/material.dart';

import '../../core/theme/app_theme.dart';

/// Circular progress ring with an optional glow.
///
/// [value] is 0–100. The ring color defaults to [AppTheme.emerald].
class RingProgress extends StatelessWidget {
  const RingProgress({
    super.key,
    required this.value,
    this.color,
    this.size = 80,
    this.strokeWidth = 6,
    this.child,
    this.glow = true,
  });

  final double value;
  final Color? color;
  final double size;
  final double strokeWidth;
  final Widget? child;
  final bool glow;

  @override
  Widget build(BuildContext context) {
    final ringColor = color ?? AppTheme.emerald;
    return Container(
      decoration: BoxDecoration(
        boxShadow: [
          BoxShadow(
            color: ringColor.withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: SizedBox(
        width: size,
        height: size,
        child: Stack(
          alignment: Alignment.center,
          children: [
            CustomPaint(
              size: Size(size, size),
              painter: _RingPainter(
                value: (value / 100).clamp(0.0, 1.0),
                color: ringColor,
                strokeWidth: strokeWidth,
                trackColor: AppTheme.grayLine,
                glow: glow,
              ),
            ),
            ?child,
          ],
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  const _RingPainter({
    required this.value,
    required this.color,
    required this.strokeWidth,
    required this.trackColor,
    required this.glow,
  });

  final double value;
  final Color color;
  final double strokeWidth;
  final Color trackColor;
  final bool glow;

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;
    final rect = Rect.fromCircle(center: center, radius: radius);

    // Track
    canvas.drawArc(
      rect,
      0,
      2 * math.pi,
      false,
      Paint()
        ..color = trackColor
        ..style = PaintingStyle.stroke
        ..strokeWidth = strokeWidth
        ..strokeCap = StrokeCap.round,
    );

    if (value <= 0) return;

    // Arc
    final arcPaint = Paint()
      ..color = color
      ..style = PaintingStyle.stroke
      ..strokeWidth = strokeWidth
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      rect,
      -math.pi / 2,
      2 * math.pi * value,
      false,
      arcPaint,
    );
  }

  @override
  bool shouldRepaint(_RingPainter old) =>
      old.value != value || old.color != color || old.glow != glow;
}
