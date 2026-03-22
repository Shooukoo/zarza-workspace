import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../domain/enums/user_role.dart';
import '../auth/auth_widgets.dart';
import 'admin_blocs/admin_bloc.dart';

/// Pantalla exclusiva para administradores: crea un nuevo usuario (MONITOR).
class CreateUserScreen extends StatefulWidget {
  const CreateUserScreen({super.key});

  @override
  State<CreateUserScreen> createState() => _CreateUserScreenState();
}

class _CreateUserScreenState extends State<CreateUserScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();
  bool _obscurePass = true;
  UserRole _selectedRole = UserRole.monitor;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    context.read<AdminBloc>().add(
          AdminCreateUser(
            email: _emailCtrl.text.trim(),
            password: _passwordCtrl.text,
            role: _selectedRole,
          ),
        );
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AdminBloc, AdminState>(
      listener: (ctx, state) {
        if (state is AdminUserCreated) {
          _emailCtrl.clear();
          _passwordCtrl.clear();
          ScaffoldMessenger.of(ctx).showSnackBar(
            const SnackBar(
              content: Text('Usuario creado correctamente'),
              backgroundColor: Color(0xFF2E7D32),
              behavior: SnackBarBehavior.floating,
            ),
          );
          ctx.go('/admin/users'); // Go back to users list
        } else if (state is AdminError) {
          ScaffoldMessenger.of(ctx).showSnackBar(
            SnackBar(
              content: Text(state.message),
              backgroundColor: Colors.red.shade700,
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      },
      builder: (context, state) {
        final isLoading = state is AdminLoading;
        return Scaffold(
        backgroundColor: const Color(0xFF0A0A0A),
        appBar: AppBar(
          backgroundColor: const Color(0xFF111111),
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_ios_new_rounded,
                color: Colors.white70, size: 20),
            onPressed: () => context.go('/admin/users'),
          ),
          title: Text(
            'Crear usuario',
            style: GoogleFonts.outfit(
              color: Colors.white,
              fontWeight: FontWeight.w600,
              fontSize: 18,
            ),
          ),
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 500),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Info banner ─────────────────────────────────────────────
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFF1A2A1A),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: const Color(0xFF2E7D32).withValues(alpha: 0.5),
                    ),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline_rounded,
                          color: Color(0xFF66BB6A), size: 20),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Crea una cuenta para un nuevo colaborador en el sistema. Puedes asignarle cualquier rol.',
                          style: GoogleFonts.outfit(
                            color: Colors.white70,
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 32),
                Text(
                  'Datos del nuevo usuario',
                  style: GoogleFonts.outfit(
                    color: Colors.white54,
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 16),
                Form(
                  key: _formKey,
                  child: Column(
                    children: [
                      AuthTextField(
                        controller: _emailCtrl,
                        label: 'Correo electrónico',
                        icon: Icons.email_outlined,
                        keyboardType: TextInputType.emailAddress,
                        validator: (v) {
                          if (v == null || v.isEmpty) return 'Ingresa un correo';
                          if (!v.contains('@')) return 'Correo inválido';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      AuthTextField(
                        controller: _passwordCtrl,
                        label: 'Contraseña temporal',
                        icon: Icons.lock_outline_rounded,
                        obscureText: _obscurePass,
                        suffixIcon: IconButton(
                          icon: Icon(
                            _obscurePass
                                ? Icons.visibility_off_rounded
                                : Icons.visibility_rounded,
                            color: Colors.white38,
                          ),
                          onPressed: () =>
                              setState(() => _obscurePass = !_obscurePass),
                        ),
                        validator: (v) {
                          if (v == null || v.isEmpty) {
                            return 'Ingresa una contraseña';
                          }
                          if (v.length < 6) return 'Mínimo 6 caracteres';
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      // ── Selector de Rol ────────────────────────────────────
                      DropdownButtonFormField<UserRole>(
                        value: _selectedRole,
                        dropdownColor: const Color(0xFF1A1A1A),
                        decoration: InputDecoration(
                          labelText: 'Rol del usuario',
                          labelStyle: GoogleFonts.outfit(color: Colors.white54),
                          filled: true,
                          fillColor: const Color(0xFF161616),
                          prefixIcon: const Icon(Icons.badge_outlined, color: Colors.white38),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF1E1E1E)),
                          ),
                          enabledBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Color(0xFF1E1E1E)),
                          ),
                        ),
                        style: GoogleFonts.outfit(color: Colors.white70, fontSize: 14),
                        items: UserRole.values
                            .map((r) => DropdownMenuItem(
                                  value: r,
                                  child: Text(r.displayName),
                                ))
                            .toList(),
                        onChanged: (newRole) {
                          if (newRole != null) {
                            setState(() => _selectedRole = newRole);
                          }
                        },
                      ),
                      const SizedBox(height: 32),
                      AuthGradientButton(
                        label: 'Crear usuario',
                        isLoading: isLoading,
                        onPressed: isLoading ? null : _submit,
                      ),
                    ],
                  ),
                ),
              ],
            ),
              ),
            ),
          ),
        ),
      );
    },
  );
  }
}
