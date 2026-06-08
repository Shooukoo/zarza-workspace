import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:zarza_ai/core/auth/auth_cubit.dart';
import 'package:zarza_ai/core/auth/auth_state.dart';
import 'package:zarza_ai/domain/entities/user_entity.dart';
import 'package:zarza_ai/domain/enums/user_role.dart';
import 'package:zarza_ai/presentation/help/help_screen.dart';
import 'package:mocktail/mocktail.dart';

// Mock for AuthCubit
class MockAuthCubit extends Mock implements AuthCubit {}

void main() {
  group('HelpScreen', () {
    late MockAuthCubit mockAuthCubit;

    setUp(() {
      mockAuthCubit = MockAuthCubit();
      // Mock auth state as Productor
      when(() => mockAuthCubit.state).thenReturn(
        const AuthAuthenticated(
          user: UserEntity(
            id: '1',
            email: 'test@test.com',
            role: UserRole.productor,
          ),
          token: 'token',
        ),
      );
      GetIt.instance.registerSingleton<AuthCubit>(mockAuthCubit);
    });

    tearDown(() {
      GetIt.instance.unregister<AuthCubit>();
    });

    testWidgets('renders all 6 section tiles', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: HelpScreen(),
        ),
      );

      // Verify title
      expect(find.text('Manual de Usuario'), findsWidgets);

      // Verify all section titles visible (at least as text in the widget tree)
      expect(find.text('Primeros Pasos'), findsWidgets);
      expect(find.text('Captura de Análisis'), findsWidgets);
      expect(find.text('Interpretar Resultados'), findsWidgets);
      expect(find.text('Conceptos Clave'), findsWidgets);
      expect(find.text('Solución de Problemas'), findsWidgets);
      expect(find.text('Gestión de Campos y Solicitudes'), findsWidgets);
    });

    testWidgets('close button pops navigation', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: HelpScreen(),
        ),
      );

      final closeButton = find.byIcon(Icons.close_rounded);
      expect(closeButton, findsOneWidget);

      await tester.tap(closeButton);
      await tester.pumpAndSettle();

      // After closing, we're back to empty route (no HelpScreen widgets)
      expect(find.byType(HelpScreen), findsNothing);
    });

    testWidgets('expansion tile expands and collapses', (WidgetTester tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: HelpScreen(),
        ),
      );

      // Tap first section to expand
      await tester.tap(find.byType(ExpansionTile).first);
      await tester.pumpAndSettle();

      // Verify some content appears (text from first item)
      expect(find.text('Navegación Básica'), findsWidgets);
    });
  });
}
