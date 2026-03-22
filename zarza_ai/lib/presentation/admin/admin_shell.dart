import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../core/utils/platform_utils.dart';
import 'admin_sidebar.dart';

/// Shell del panel de administración.
/// En web/desktop: muestra el sidebar lateral + contenido.
/// En móvil: muestra solo el contenido sin sidebar (navegación simplificada).
class AdminShell extends StatelessWidget {
  const AdminShell({super.key, required this.child});
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!PlatformUtils.useAdminLayout) {
      // En móvil: pantalla simple sin sidebar
      return child;
    }

    final location = GoRouterState.of(context).matchedLocation;

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: Row(
        children: [
          AdminSidebar(currentLocation: location),
          // Separador vertical
          const VerticalDivider(
            width: 1,
            thickness: 1,
            color: Color(0xFF1E1E1E),
          ),
          // Contenido principal
          Expanded(child: child),
        ],
      ),
    );
  }
}
