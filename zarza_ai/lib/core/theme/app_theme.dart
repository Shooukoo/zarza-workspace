import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class AppTheme {
  AppTheme._();

  // ── Design tokens — RubusAI brand ────────────────────────────────────────────
  static const Color obsidian   = Color(0xFF0D0221); // Deep Obsidian (main bg)
  static const Color obsidian2  = Color(0xFF160630); // Sidebar / nav bg
  static const Color obsidian3  = Color(0xFF1F0A40); // Card nested bg
  static const Color frost      = Color(0xFFF5F5FA); // Frost White (primary text)
  static const Color frostDim   = Color(0xFFC8C8D4); // Secondary text
  static const Color dataGray   = Color(0xFF8A8AA0); // Hint / label / icon
  static const Color grayLine   = Color(0xFF2A1547); // Borders / dividers
  static const Color rubus      = Color(0xFF7B00D4); // Royal Rubus (primary CTA)
  static const Color rubusLight = Color(0xFFA030F0); // Lighter accent
  static const Color emerald    = Color(0xFF10B981); // Health / success only
  static const Color warn       = Color(0xFFF59E0B); // Warning
  static const Color danger     = Color(0xFFEF4444); // Error

  // ── Fenological stage colors (keep botanical meanings) ───────────────────────
  static const Map<String, Color> stageColors = {
    'boton':     Color(0xFFFF9800),
    'flor':      Color(0xFFE91E63),
    'verde':     Color(0xFF4CAF50),
    'naranja':   Color(0xFFFF5722),
    'marron':    Color(0xFF795548),
    'maduro':    emerald,
    'zarzamora': rubus,
  };

  // ── Glassmorphism surface helper ─────────────────────────────────────────────
  static BoxDecoration glassSurface({
    double opacity = 0.04,
    double radius = 16,
    bool glow = false,
    Color? glowColor,
  }) =>
      BoxDecoration(
        color: Colors.white.withValues(alpha: opacity),
        borderRadius: BorderRadius.circular(radius),
        border: Border.all(color: Colors.white.withValues(alpha: 0.07)),
        boxShadow: glow
            ? [
                BoxShadow(
                  color: (glowColor ?? rubus).withValues(alpha: 0.14),
                  blurRadius: 32,
                  spreadRadius: 0,
                )
              ]
            : null,
      );

  static ThemeData get darkTheme {
    final base = ThemeData.dark(useMaterial3: true);

    return base.copyWith(
      colorScheme: const ColorScheme.dark(
        primary: rubus,
        primaryContainer: obsidian3,
        secondary: emerald,
        surface: obsidian2,
        error: danger,
        onPrimary: Colors.white,
        onSecondary: Colors.white,
        onSurface: frost,
        onError: Colors.white,
        outline: grayLine,
      ),
      scaffoldBackgroundColor: obsidian,
      textTheme: GoogleFonts.lexendTextTheme(base.textTheme).copyWith(
        displayLarge: GoogleFonts.lexend(
          fontSize: 32,
          fontWeight: FontWeight.w700,
          color: frost,
        ),
        displayMedium: GoogleFonts.lexend(
          fontSize: 24,
          fontWeight: FontWeight.w700,
          color: frost,
        ),
        titleLarge: GoogleFonts.lexend(
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: frost,
        ),
        titleMedium: GoogleFonts.lexend(
          fontSize: 16,
          fontWeight: FontWeight.w500,
          color: frost,
        ),
        bodyLarge: GoogleFonts.lexend(fontSize: 16, color: frost),
        bodyMedium: GoogleFonts.lexend(fontSize: 14, color: frostDim),
        labelSmall: GoogleFonts.lexend(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          letterSpacing: 0.5,
          color: dataGray,
        ),
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: obsidian2,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        surfaceTintColor: Colors.transparent,
        iconTheme: const IconThemeData(color: frost),
        titleTextStyle: GoogleFonts.lexend(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: frost,
        ),
      ),
      cardTheme: CardThemeData(
        color: Colors.white.withValues(alpha: 0.04),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: Colors.white.withValues(alpha: 0.07)),
        ),
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: rubus,
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          textStyle:
              GoogleFonts.lexend(fontWeight: FontWeight.w600, fontSize: 15),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: frostDim,
          side: BorderSide(color: rubus.withValues(alpha: 0.4)),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
          ),
          textStyle:
              GoogleFonts.lexend(fontWeight: FontWeight.w500, fontSize: 14),
        ),
      ),
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: rubus,
        foregroundColor: Colors.white,
        elevation: 4,
        shape: CircleBorder(),
      ),
      chipTheme: ChipThemeData(
        backgroundColor: obsidian3,
        labelStyle: GoogleFonts.lexend(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: frost,
        ),
        side: BorderSide(color: rubus.withValues(alpha: 0.3)),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      ),
      dividerTheme: const DividerThemeData(color: grayLine, thickness: 1),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: rubusLight,
        contentTextStyle: GoogleFonts.lexend(color: Colors.white),
        behavior: SnackBarBehavior.floating,
        shape:
            RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(
        color: emerald,
        linearTrackColor: obsidian3,
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: obsidian2,
        surfaceTintColor: Colors.transparent,
        shadowColor: Colors.transparent,
        elevation: 0,
        height: 68,
        indicatorColor: rubus.withValues(alpha: 0.18),
        iconTheme: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return const IconThemeData(color: rubusLight, size: 24);
          }
          return const IconThemeData(color: dataGray, size: 22);
        }),
        labelTextStyle: WidgetStateProperty.resolveWith((states) {
          if (states.contains(WidgetState.selected)) {
            return GoogleFonts.lexend(
              fontSize: 10,
              fontWeight: FontWeight.w600,
              color: rubusLight,
            );
          }
          return GoogleFonts.lexend(fontSize: 10, color: dataGray);
        }),
      ),
      hoverColor: Colors.white.withValues(alpha: 0.03),
      splashColor: Colors.white.withValues(alpha: 0.04),
      highlightColor: Colors.transparent,
      drawerTheme: const DrawerThemeData(
        backgroundColor: obsidian2,
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: obsidian3,
        prefixIconColor: dataGray,
        hintStyle: GoogleFonts.lexend(color: dataGray, fontSize: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: grayLine),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: grayLine),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: rubus, width: 1.5),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }

  static Color stageColor(String label) =>
      stageColors[label.toLowerCase()] ?? rubus;
}
