import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class HelpTooltip extends StatelessWidget {
  /// The help icon to display
  final IconData icon;

  /// The tooltip text
  final String content;

  /// Max width of the tooltip popup
  final double maxWidth;

  /// Optional callback when tooltip is tapped
  final VoidCallback? onTap;

  const HelpTooltip({
    super.key,
    this.icon = Icons.help_outline_rounded,
    required this.content,
    this.maxWidth = 280,
    this.onTap,
  });

  void _showTooltip(BuildContext context) {
    showDialog<void>(
      context: context,
      builder: (context) => AlertDialog(
        contentPadding: const EdgeInsets.all(20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        backgroundColor: const Color(0xFF1A0535),
        title: null,
        content: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                content,
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.6,
                  color: AppTheme.frostDim,
                  fontFamily: 'Lexend',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        onTap?.call();
        _showTooltip(context);
      },
      child: Icon(
        icon,
        size: 16,
        color: AppTheme.rubusLight,
      ),
    );
  }
}
