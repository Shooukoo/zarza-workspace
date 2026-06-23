import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/presentation/help/help_content.dart';
import 'package:zarza_ai/domain/enums/user_role.dart';

void main() {
  group('HelpSection', () {
    test('filterByRole returns only sections visible to role', () {
      const productor = UserRole.productor;

      // Filter for Productor
      final productorSections = HelpSection.filterByRole(allHelpSections, productor);

      // All sections should be visible to Productor
      expect(productorSections.isNotEmpty, true);

      // Check Captura is visible (only to productor, agronomo)
      final captureSection = productorSections.firstWhere(
        (s) => s.id == 'capture',
        orElse: () => throw Exception('Capture section not found'),
      );
      expect(captureSection.title, 'Captura de Análisis');
    });

    test('allHelpSections has exactly 6 sections', () {
      expect(allHelpSections.length, 6);
    });

    test('all sections have at least one item', () {
      for (final section in allHelpSections) {
        expect(section.items.isNotEmpty, true,
            reason: 'Section ${section.id} has no items');
      }
    });

    test('section IDs are unique', () {
      final ids = allHelpSections.map((s) => s.id).toList();
      expect(ids.length, ids.toSet().length);
    });
  });

  group('HelpItem', () {
    test('HelpItem with imagePath compiles', () {
      const item = HelpItem(
        title: 'Test',
        content: 'Test content',
        imagePath: 'assets/test.png',
      );
      expect(item.imagePath, 'assets/test.png');
    });

    test('HelpItem without imagePath is null', () {
      const item = HelpItem(
        title: 'Test',
        content: 'Test content',
      );
      expect(item.imagePath, null);
    });
  });
}
