import '../../domain/enums/user_role.dart'; // For UserRole enum

/// Single help item (title + content + optional image)
class HelpItem {
  final String title;
  final String content;
  final String? imagePath; // null if no image

  const HelpItem({
    required this.title,
    required this.content,
    this.imagePath,
  });
}

/// Help section containing multiple items, with role filtering
class HelpSection {
  final String id;
  final String title;
  final String description;
  final List<HelpItem> items;
  final List<UserRole> visibleForRoles;

  const HelpSection({
    required this.id,
    required this.title,
    required this.description,
    required this.items,
    required this.visibleForRoles,
  });

  /// Filter sections by user role
  static List<HelpSection> filterByRole(
    List<HelpSection> sections,
    UserRole userRole,
  ) {
    return sections
        .where((section) => section.visibleForRoles.contains(userRole))
        .toList();
  }
}
