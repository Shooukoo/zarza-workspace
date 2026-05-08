import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class ScaffoldWithBottomNav extends StatelessWidget {
  const ScaffoldWithBottomNav({
    super.key,
    required this.child,
    required this.user,
  });

  final Widget child;
  final UserEntity? user;

  bool get _canSeeSolicitudes =>
      user?.role == UserRole.monitor || user?.role == UserRole.agronomo;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = _selectedIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => _onTap(context, index),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          if (_canSeeSolicitudes)
            const NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment_rounded),
              label: 'Solicitudes',
            ),
          const NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history_rounded),
            label: 'Historial',
          ),
        ],
      ),
    );
  }

  int _selectedIndex(String location) {
    if (_canSeeSolicitudes) {
      if (location.startsWith('/solicitudes')) return 1;
      if (location.startsWith('/history')) return 2;
      return 0;
    } else {
      if (location.startsWith('/history')) return 1;
      return 0;
    }
  }

  void _onTap(BuildContext context, int index) {
    if (_canSeeSolicitudes) {
      switch (index) {
        case 0:
          context.go('/home');
        case 1:
          context.go('/solicitudes');
        case 2:
          context.go('/history');
      }
    } else {
      switch (index) {
        case 0:
          context.go('/home');
        case 1:
          context.go('/history');
      }
    }
  }
}
