import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/presentation/widgets/help_tooltip.dart';

void main() {
  group('HelpTooltip', () {
    testWidgets('renders icon', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test tooltip',
                icon: Icons.help_outline_rounded,
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.help_outline_rounded), findsOneWidget);
    });

    testWidgets('shows dialog on tap', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test tooltip content',
              ),
            ),
          ),
        ),
      );

      // Initially no dialog
      expect(find.text('Test tooltip content'), findsNothing);

      // Tap the icon
      await tester.tap(find.byType(HelpTooltip));
      await tester.pumpAndSettle();

      // Dialog should appear with content
      expect(find.text('Test tooltip content'), findsWidgets);
      expect(find.text('Cerrar'), findsOneWidget);
    });

    testWidgets('closes dialog when tapping Cerrar button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test tooltip',
              ),
            ),
          ),
        ),
      );

      // Open dialog
      await tester.tap(find.byType(HelpTooltip));
      await tester.pumpAndSettle();

      expect(find.text('Cerrar'), findsOneWidget);

      // Tap close button
      await tester.tap(find.text('Cerrar'));
      await tester.pumpAndSettle();

      // Dialog should be gone
      expect(find.byType(AlertDialog), findsNothing);
    });

    testWidgets('calls onTap callback', (WidgetTester tester) async {
      var callCount = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test',
                onTap: () => callCount++,
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.byType(HelpTooltip));
      await tester.pumpAndSettle();

      expect(callCount, 1);
    });
  });
}
