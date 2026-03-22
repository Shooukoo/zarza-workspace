import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/auth/auth_cubit.dart';
import '../../../core/auth/auth_state.dart';

/// Sidebar de navegación para el panel de administración (web/desktop).
class AdminSidebar extends StatelessWidget {
  const AdminSidebar({super.key, required this.currentLocation});
  final String currentLocation;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 240,
      color: const Color(0xFF111111),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Header ──────────────────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(20, 28, 20, 24),
            decoration: const BoxDecoration(
              border: Border(
                bottom: BorderSide(color: Color(0xFF1E1E1E)),
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4CAF50), Color(0xFF1B5E20)],
                    ),
                  ),
                  child: const Icon(Icons.eco_rounded,
                      color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Zarza AI',
                      style: GoogleFonts.outfit(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                        fontSize: 15,
                      ),
                    ),
                    Text(
                      'Panel Admin',
                      style: GoogleFonts.outfit(
                        color: const Color(0xFF66BB6A),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // ── Nav items ────────────────────────────────────────────────────
          const SizedBox(height: 12),
          _NavItem(
            icon: Icons.dashboard_rounded,
            label: 'Dashboard',
            route: '/admin',
            isActive: currentLocation == '/admin',
          ),
          _NavItem(
            icon: Icons.group_rounded,
            label: 'Usuarios',
            route: '/admin/users',
            isActive: currentLocation == '/admin/users',
          ),
          _NavItem(
            icon: Icons.analytics_rounded,
            label: 'Análisis',
            route: '/admin/analyses',
            isActive: currentLocation == '/admin/analyses',
          ),
          const Spacer(),

          // ── User info + logout ───────────────────────────────────────────
          BlocBuilder<AuthCubit, AuthState>(
            builder: (ctx, state) {
              final user = state is AuthAuthenticated ? state.user : null;
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: Color(0xFF1E1E1E))),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (user != null) ...[
                      Text(
                        user.email,
                        style: GoogleFonts.outfit(
                          color: Colors.white70,
                          fontSize: 12,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        user.role.displayName,
                        style: GoogleFonts.outfit(
                          color: const Color(0xFF66BB6A),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                    ],
                    InkWell(
                      onTap: () => ctx.read<AuthCubit>().logout(),
                      borderRadius: BorderRadius.circular(8),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                            vertical: 8, horizontal: 4),
                        child: Row(
                          children: [
                            const Icon(Icons.logout_rounded,
                                color: Colors.white38, size: 16),
                            const SizedBox(width: 8),
                            Text(
                              'Cerrar sesión',
                              style: GoogleFonts.outfit(
                                color: Colors.white38,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  const _NavItem({
    required this.icon,
    required this.label,
    required this.route,
    required this.isActive,
  });

  final IconData icon;
  final String label;
  final String route;
  final bool isActive;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
      child: InkWell(
        onTap: () => context.go(route),
        borderRadius: BorderRadius.circular(10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(10),
            color: isActive
                ? const Color(0xFF1A2A1A)
                : Colors.transparent,
          ),
          child: Row(
            children: [
              Icon(
                icon,
                size: 18,
                color: isActive
                    ? const Color(0xFF66BB6A)
                    : Colors.white38,
              ),
              const SizedBox(width: 12),
              Text(
                label,
                style: GoogleFonts.outfit(
                  color: isActive ? Colors.white : Colors.white54,
                  fontWeight:
                      isActive ? FontWeight.w600 : FontWeight.w400,
                  fontSize: 14,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
