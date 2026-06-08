import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'help_content.dart';

class HelpSectionTile extends StatefulWidget {
  final HelpSection section;

  const HelpSectionTile({
    super.key,
    required this.section,
  });

  @override
  State<HelpSectionTile> createState() => _HelpSectionTileState();
}

class _HelpSectionTileState extends State<HelpSectionTile> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Card(
        elevation: 0,
        color: Colors.white.withValues(alpha: 0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: ExpansionTile(
          title: Text(
            widget.section.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.frost,
              fontFamily: 'Lexend',
            ),
          ),
          subtitle: Text(
            widget.section.description,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.dataGray,
              fontFamily: 'Lexend',
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          onExpansionChanged: (expanded) {
            setState(() => _isExpanded = expanded);
          },
          children: [
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.section.items.length,
              itemBuilder: (context, i) {
                final item = widget.section.items[i];
                return Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.frost,
                          fontFamily: 'Lexend',
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.content,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.6,
                          color: AppTheme.frostDim,
                          fontFamily: 'Lexend',
                        ),
                      ),
                      if (item.imagePath != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Image.asset(
                            item.imagePath!,
                            width: 300,
                            fit: BoxFit.contain,
                          ),
                        ),
                      if (i < widget.section.items.length - 1)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Divider(
                            color: Colors.white.withValues(alpha: 0.06),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
