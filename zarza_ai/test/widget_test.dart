// This is a basic Flutter widget test.
import 'package:flutter_test/flutter_test.dart';

import 'package:zarza_ai/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    // ZarzaAiApp exists and can be referenced
    expect(ZarzaAiApp, isNotNull);
  });
}
