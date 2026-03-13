import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // Color palette
  static const Color _primary = Color(0xFF2E7D32);      // Deep green
  static const Color _primaryLight = Color(0xFF4CAF50); // Mid green
  static const Color _accent = Color(0xFF69F0AE);        // Neon mint
  static const Color _background = Color(0xFF0A0A0A);    // Near black
  static const Color _surface = Color(0xFF121212);       // Dark surface
  static const Color _surfaceVariant = Color(0xFF1E1E1E);
  static const Color _error = Color(0xFFCF6679);
  static const Color _onSurface = Color(0xFFE8F5E9);
  static const Color _hint = Color(0xFF757575);

  // Stage color map (for badges)
  static const Map<String, Color> stageColors = {
    'boton': Color(0xFFFF9800),
    'flor': Color(0xFFE91E63),
    'verde': Color(0xFF4CAF50),
    'naranja': Color(0xFFFF5722),
    'marron': Color(0xFF795548),
    'maduro': Color(0xFF1B5E20),
    'zarzamora': Color(0xFF6A1B9A),
  };

  static ThemeData get darkTheme {
    final base = ThemeData.dark();
    return base.copyWith(
      useMaterial3: true,
      colorScheme: const ColorScheme.dark(
        primary: _primary,
        primaryContainer: _primaryLight,
        secondary: _accent,
        surface: _surface,
        error: _error,
        onPrimary: Colors.white,
        onSecondary: Color(0xFF003320),
        onSurface: _onSurface,
        onError: Colors.white,
      ),
      scaffoldBackgroundColor: _background,
      textTheme: GoogleFonts.interTextTheme(base.textTheme).copyWith(
        displayLarge: GoogleFonts.inter(
          fontSize: 32,
          fontWeight: FontWeight.w700,
          color: _onSurface,
        ),
        displayMedium: GoogleFonts.inter(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: _onSurface,
        ),
        titleLarge: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: _onSurface,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: _onSurface,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 16,
          color: _onSurface,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 14,
          color: _onSurface.withOpacity(0.8),
        ),
        labelSmall: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
          color: _hint,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: _surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: const IconThemeData(color: _onSurface),
        titleTextStyle: GoogleFonts.inter(
          fontSize: 20,
          fontWeight: FontWeight.w700,
          color: _onSurface,
        ),
      ),
      cardTheme: CardThemeData(
        color: _surfaceVariant,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: _primary.withOpacity(0.18),
            width: 1,
          ),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: _primary,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle: GoogleFonts.inter(
            fontWeight: FontWeight.w600,
            fontSize: 15,
          ),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: _primary,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: CircleBorder(),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: _surfaceVariant,
        labelStyle: GoogleFonts.inter(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: _onSurface,
        ),
        side: BorderSide(color: _primary.withOpacity(0.3)),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),
      dividerTheme: DividerThemeData(
        color: Colors.white.withOpacity(0.06),
        thickness: 1,
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: _primaryLight,
        contentTextStyle: GoogleFonts.inter(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: _accent,
        linearTrackColor: Color(0xFF1E1E1E),
      ),
    );
  }

  static Color stageColor(String label) =>
      stageColors[label.toLowerCase()] ?? _primary;
}
