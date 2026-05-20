import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../domain/enums/user_role.dart';
import 'help_content.dart';
import 'help_section_tile.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Get current user role
    final authState = GetIt.I<AuthCubit>().state;
    final userRole = authState is AuthAuthenticated
        ? authState.user.role
        : UserRole.monitor; // Fallback

    // Filter sections by role
    final filteredSections = HelpSection.filterByRole(
      allHelpSections,
      userRole,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Manual de Usuario',
          style: TextStyle(
            fontFamily: 'Lexend',
            fontWeight: FontWeight.w700,
            fontSize: 18,
          ),
        ),
        centerTitle: false,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
          tooltip: 'Cerrar manual',
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.only(top: 8, bottom: 24),
        itemCount: filteredSections.length,
        itemBuilder: (context, i) => HelpSectionTile(
          section: filteredSections[i],
        ),
      ),
    );
  }
}
