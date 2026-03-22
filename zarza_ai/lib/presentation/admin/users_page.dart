import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../domain/entities/admin_user_entity.dart';
import '../../../domain/enums/user_role.dart';
import 'admin_blocs/admin_bloc.dart';

class UsersPage extends StatefulWidget {
  const UsersPage({super.key});

  @override
  State<UsersPage> createState() => _UsersPageState();
}

class _UsersPageState extends State<UsersPage> {
  @override
  void initState() {
    super.initState();
    context.read<AdminBloc>().add(const AdminLoadUsers());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Header ──────────────────────────────────────────────────
              Row(
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Usuarios',
                        style: GoogleFonts.outfit(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        'Gestiona los usuarios y sus roles',
                        style: GoogleFonts.outfit(
                            color: Colors.white38, fontSize: 14),
                      ),
                    ],
                  ),
                  const Spacer(),
                  // Botón crear usuario → va a la pantalla de crear usuario
                  _GreenButton(
                    icon: Icons.person_add_rounded,
                    label: 'Crear usuario',
                    onPressed: () => context.go('/admin/create-user'),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // ── Table ────────────────────────────────────────────────────
              Expanded(
                child: BlocBuilder<AdminBloc, AdminState>(
                  builder: (ctx, state) {
                    if (state is AdminLoading) {
                      return const Center(
                        child: CircularProgressIndicator(
                          color: Color(0xFF4CAF50),
                        ),
                      );
                    }
                    if (state is AdminError) {
                      return Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.error_outline_rounded,
                                color: Colors.redAccent, size: 48),
                            const SizedBox(height: 12),
                            Text(state.message,
                                style:
                                    const TextStyle(color: Colors.white54)),
                            const SizedBox(height: 16),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                  backgroundColor:
                                      const Color(0xFF4CAF50)),
                              onPressed: () => ctx
                                  .read<AdminBloc>()
                                  .add(const AdminLoadUsers()),
                              child: const Text('Reintentar'),
                            ),
                          ],
                        ),
                      );
                    }
                    if (state is AdminUsersLoaded) {
                      return _UsersTable(users: state.users);
                    }
                    return const SizedBox.shrink();
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _UsersTable extends StatelessWidget {
  const _UsersTable({required this.users});
  final List<AdminUserEntity> users;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF111111),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF1E1E1E)),
      ),
      child: Column(
        children: [
          // ── Column headers ──────────────────────────────────────────────
          Container(
            padding:
                const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: const BoxDecoration(
              border: Border(
                  bottom: BorderSide(color: Color(0xFF1E1E1E))),
            ),
            child: Row(
              children: [
                Expanded(
                    flex: 4,
                    child: _HeaderCell('Correo electrónico')),
                Expanded(flex: 3, child: _HeaderCell('Rol')),
                Expanded(flex: 3, child: _HeaderCell('Miembro desde')),
                Expanded(flex: 3, child: _HeaderCell('Actividad')),
                const SizedBox(width: 140, child: _HeaderCell('Acción')),
              ],
            ),
          ),
          // ── Rows ─────────────────────────────────────────────────────
          Expanded(
            child: ListView.separated(
              itemCount: users.length,
              separatorBuilder: (context, index) => const Divider(
                color: Color(0xFF1A1A1A),
                height: 1,
              ),
              itemBuilder: (ctx, i) => _UserRow(user: users[i]),
            ),
          ),
        ],
      ),
    );
  }
}

class _HeaderCell extends StatelessWidget {
  const _HeaderCell(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text.toUpperCase(),
      style: GoogleFonts.outfit(
        color: Colors.white24,
        fontSize: 11,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.8,
      ),
    );
  }
}

class _UserRow extends StatelessWidget {
  const _UserRow({required this.user});
  final AdminUserEntity user;

  static const _roleColors = {
    UserRole.admin: Color(0xFF7C4DFF),
    UserRole.productor: Color(0xFF00BCD4),
    UserRole.agronomo: Color(0xFFFF9800),
    UserRole.monitor: Color(0xFF607D8B),
  };

  @override
  Widget build(BuildContext context) {
    final roleColor =
        _roleColors[user.role] ?? const Color(0xFF4CAF50);

    return Padding(
      padding:
          const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          // Email
          Expanded(
            flex: 4,
            child: Row(
              children: [
                CircleAvatar(
                  radius: 16,
                  backgroundColor:
                      roleColor.withValues(alpha: 0.18),
                  child: Text(
                    user.email.substring(0, 1).toUpperCase(),
                    style: TextStyle(
                        color: roleColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 13),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    user.email,
                    style: GoogleFonts.outfit(
                      color: Colors.white70,
                      fontSize: 14,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
          // Rol badge
          Expanded(
            flex: 3,
            child: Align(
              alignment: Alignment.centerLeft,
              child: _RoleBadge(role: user.role, color: roleColor),
            ),
          ),
          // Fecha
          Expanded(
            flex: 3,
            child: Text(
              _formatDate(user.createdAt),
              style: GoogleFonts.outfit(
                  color: Colors.white38, fontSize: 13),
            ),
          ),
          // Actividad (Fotos tomadas)
          Expanded(
            flex: 3,
            child: Row(
              children: [
                const Icon(Icons.analytics_outlined, color: Colors.white38, size: 14),
                const SizedBox(width: 6),
                Text(
                  '${user.totalAnalyses ?? 0} fotos',
                  style: GoogleFonts.outfit(
                      color: Colors.white70, fontSize: 13),
                ),
              ],
            ),
          ),
          // Selector de rol
          SizedBox(
            width: 140,
            child: _RoleDropdown(user: user),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day.toString().padLeft(2, '0')}/'
        '${date.month.toString().padLeft(2, '0')}/'
        '${date.year}';
  }
}

class _RoleBadge extends StatelessWidget {
  const _RoleBadge({required this.role, required this.color});
  final UserRole role;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding:
          const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border:
            Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: FittedBox(
        fit: BoxFit.scaleDown,
        child: Text(
          role.displayName,
          style: TextStyle(
              color: color,
              fontSize: 11,
              fontWeight: FontWeight.w600),
        ),
      ),
    );
  }
}

class _RoleDropdown extends StatelessWidget {
  const _RoleDropdown({required this.user});
  final AdminUserEntity user;

  @override
  Widget build(BuildContext context) {
    return DropdownButtonHideUnderline(
      child: DropdownButton<UserRole>(
        value: user.role,
        dropdownColor: const Color(0xFF1A1A1A),
        iconEnabledColor: Colors.white38,
        style: GoogleFonts.outfit(color: Colors.white70, fontSize: 13),
        items: UserRole.values
            .map((r) => DropdownMenuItem(
                  value: r,
                  child: Text(r.displayName),
                ))
            .toList(),
        onChanged: (newRole) {
          if (newRole == null || newRole == user.role) return;
          context.read<AdminBloc>().add(
                AdminUpdateUserRole(userId: user.id, role: newRole),
              );
        },
      ),
    );
  }
}

class _GreenButton extends StatelessWidget {
  const _GreenButton({
    required this.icon,
    required this.label,
    required this.onPressed,
  });
  final IconData icon;
  final String label;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton.icon(
      icon: Icon(icon, size: 16),
      label: Text(label, style: GoogleFonts.outfit(fontWeight: FontWeight.w600)),
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF2E7D32),
        foregroundColor: Colors.white,
        padding:
            const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10)),
      ),
      onPressed: onPressed,
    );
  }
}
