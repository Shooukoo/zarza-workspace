# User Manual + Contextual Help Implementation Plan

**Spec relacionado:** [[2026-05-19-user-manual-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an in-app help system with 6 content sections, role-based filtering, a manual screen accessible from drawer, and contextual tooltips on key UI elements.

**Architecture:** 
- Content models (HelpSection, HelpItem) store all help text + images
- HelpScreen displays sections in expandable tiles, filters by user role
- HelpTooltip reusable component shows inline explanations
- Content is hardcoded (Dart constants) and stateless — no database or network

**Tech Stack:** Flutter 3+, Dart, BLoC (GetIt for DI), Material Design

---

## File Structure

### New Files to Create

```
zarza_ai/lib/presentation/
├── help/
│   ├── help_content.dart           (Content models + all 6 sections)
│   ├── help_screen.dart            (Main manual screen with sections)
│   ├── help_section_tile.dart      (Expandable section widget)
│   └── help_bloc.dart              (BLoC for role-based filtering, optional)
├── widgets/
│   └── help_tooltip.dart           (Reusable tooltip component)
└── test/
    └── presentation/help/
        ├── help_content_test.dart
        ├── help_screen_test.dart
        └── help_tooltip_test.dart

assets/
└── help_images/                    (Placeholder for future images)
```

### Files to Modify

```
zarza_ai/lib/presentation/
├── home/home_screen.dart           (Add 3-4 help icons)
├── results/results_screen.dart     (Add 2-3 help icons)
└── shell/scaffold_with_bottom_nav.dart  (or wherever drawer is — add menu option)
```

---

## Phase 1: Content Models + Data

### Task 1: Create HelpItem and HelpSection Models

**Files:**
- Create: `zarza_ai/lib/presentation/help/help_content.dart`

- [ ] **Step 1: Create models**

Create `zarza_ai/lib/presentation/help/help_content.dart`:

```dart
import '../../domain/entities/user.dart'; // For UserRole enum

/// Single help item (title + content + optional image)
class HelpItem {
  final String title;
  final String content;
  final String? imagePath; // null if no image

  const HelpItem({
    required this.title,
    required this.content,
    this.imagePath,
  });
}

/// Help section containing multiple items, with role filtering
class HelpSection {
  final String id;
  final String title;
  final String description;
  final List<HelpItem> items;
  final List<UserRole> visibleForRoles;

  const HelpSection({
    required this.id,
    required this.title,
    required this.description,
    required this.items,
    required this.visibleForRoles,
  });

  /// Filter sections by user role
  static List<HelpSection> filterByRole(
    List<HelpSection> sections,
    UserRole userRole,
  ) {
    return sections
        .where((section) => section.visibleForRoles.contains(userRole))
        .toList();
  }
}
```

- [ ] **Step 2: Verify the models compile**

```bash
cd zarza_ai
flutter analyze lib/presentation/help/help_content.dart
```

Expected: No errors or warnings.

- [ ] **Step 3: Commit**

```bash
git add lib/presentation/help/help_content.dart
git commit -m "feat(help): add HelpItem and HelpSection models"
```

---

### Task 2: Create All 6 Help Sections Content

**Files:**
- Modify: `zarza_ai/lib/presentation/help/help_content.dart`

- [ ] **Step 1: Add section 1 — Primeros Pasos**

Append to `help_content.dart` (before or after the models, in the same file):

```dart
// ──────────────────────────────────────────────────────────────────
// Help Sections Data
// ──────────────────────────────────────────────────────────────────

final allHelpSections = <HelpSection>[
  // 1. Primeros Pasos
  HelpSection(
    id: 'getting-started',
    title: 'Primeros Pasos',
    description: 'Aprende lo básico de la app y cómo navegar.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: 'Navegación Básica',
        content: 'La app tiene 4 pantallas principales:\n\n'
            '• Home: Ver resumen de cultivo y análisis recientes\n'
            '• Historial: Ver todos los análisis anteriores\n'
            '• Capturas Pendientes: Administrar imágenes en cola\n'
            '• Resultados: Detalles de un análisis específico\n\n'
            'Usa el menú inferior para cambiar entre pantallas.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Entender Roles y Permisos',
        content: 'Existen 4 roles en la app:\n\n'
            '• Productor: Captura imágenes y ve sus análisis\n'
            '• Agrólogo: Interpreta resultados y asesora\n'
            '• Monitor: Revisa análisis de otros productores\n'
            '• Admin: Gestiona usuarios y configuración\n\n'
            'Tu rol determina qué puedes hacer.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Acceder al Manual',
        content: 'Abre el menú de navegación (ícono ☰) y presiona '
            '"📖 Manual de Usuario" para ver todas las guías disponibles.',
        imagePath: null,
      ),
    ],
  ),
```

- [ ] **Step 2: Add section 2 — Captura de Análisis**

Continue appending to `allHelpSections`:

```dart
  // 2. Captura de Análisis
  HelpSection(
    id: 'capture',
    title: 'Captura de Análisis',
    description: 'Cómo tomar fotos y enviar para análisis.',
    visibleForRoles: [UserRole.productor, UserRole.agronomo],
    items: [
      HelpItem(
        title: 'Acceder a Captura',
        content: 'En la pantalla Home, presiona el botón grande '
            '"📷 Capturar Análisis" para abrir la cámara.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Alinear la Fruta Correctamente',
        content: 'Posiciona la fruta dentro del círculo de alineación. '
            'La fruta debe estar:\n\n'
            '• Bien iluminada (sin sombras)\n'
            '• Visible completamente\n'
            '• Centrada en el visor\n'
            '• A distancia clara (unos 15cm)\n\n'
            'Espera a que el círculo se ponga verde para proceder.',
        imagePath: 'assets/help_images/capture_alignment.png',
      ),
      HelpItem(
        title: 'Presionar Captura',
        content: 'Una vez alineada, presiona el botón circular azul '
            'en la parte inferior para capturar la imagen.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Esperar Procesamiento',
        content: 'La imagen se envía al servidor para análisis con IA. '
            'Esto puede tomar 10-30 segundos según tu conexión. '
            'Verás una barra de progreso.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Qué Hacer si Falla?',
        content: 'Si ves un mensaje de error:\n\n'
            '1. Verifica tu conexión a internet\n'
            '2. Presiona "Reintentar"\n'
            '3. Si persiste, ve a "Capturas Pendientes" para reintentar después',
        imagePath: null,
      ),
    ],
  ),
```

- [ ] **Step 3: Add section 3 — Interpretar Resultados**

Continue appending:

```dart
  // 3. Interpretar Resultados
  HelpSection(
    id: 'results',
    title: 'Interpretar Resultados',
    description: 'Entiende qué significan los números y gráficos.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: 'Salud del Cultivo (%)',
        content: 'Es el porcentaje de frutas sanas detectadas.\n\n'
            '• 100% = Todas las frutas analizadas están sanas\n'
            '• 0% = Todas tienen alguna enfermedad\n'
            '• Verde (≥70%) = Estado óptimo\n'
            '• Rojo (<70%) = Requiere atención',
        imagePath: null,
      ),
      HelpItem(
        title: 'Detectados vs Sanos',
        content: '"Detectados" = Cantidad total de frutas analizadas\n'
            '"Sanos" = Cuántas de esas no tienen enfermedades\n\n'
            'Ejemplo: "7 detectados · 5 sanos" = 7 frutas, 5 sin enfermedad',
        imagePath: null,
      ),
      HelpItem(
        title: 'Etapas Fenológicas (Stage 1-7)',
        content: 'Muestran el estado de desarrollo de cada fruta:\n\n'
            '• Stage 1-2: Inicio de desarrollo\n'
            '• Stage 3-4: Desarrollo intermedio\n'
            '• Stage 5-6: Maduración\n'
            '• Stage 7: Cosecha próxima\n\n'
            'Útil para planificar cuándo cosechar.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Detección de Enfermedades',
        content: 'Cada enfermedad muestra un % de confianza.\n\n'
            '• >90%: Muy probable que tenga esa enfermedad\n'
            '• 70-90%: Probable\n'
            '• <70%: Posible pero revisar visualmente\n\n'
            'La IA mejora con cada análisis.',
        imagePath: null,
      ),
    ],
  ),
```

- [ ] **Step 4: Add section 4 — Conceptos Clave**

Continue appending:

```dart
  // 4. Conceptos Clave (Glosario)
  HelpSection(
    id: 'glossary',
    title: 'Conceptos Clave',
    description: 'Definiciones de términos importantes.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: 'Salud del Cultivo',
        content: 'Métrica que indica qué porcentaje de frutas están '
            'sanas (sin enfermedades detectadas). Se calcula dividiendo '
            'frutas sanas entre frutas totales analizadas.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Detección de Frutas',
        content: 'El sistema usa visión computacional (IA) para identificar '
            'frutas en la imagen y extraer sus características.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Fruta Sana vs Enferma',
        content: 'Sana: Sin ninguna enfermedad o daño detectado.\n'
            'Enferma: Presenta uno o más problemas fitosanitarios '
            '(plagas, hongos, deficiencias).',
        imagePath: null,
      ),
      HelpItem(
        title: 'Etapas Fenológicas',
        content: 'Fases de desarrollo de una fruta desde floración hasta '
            'cosecha. Se usan para determinar el mejor momento de recolección.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Confianza de Detección',
        content: 'Porcentaje (0-100%) que indica qué tan seguro está '
            'el sistema de que la fruta tiene esa enfermedad. Mayor % = mayor certeza.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Merma',
        content: 'Pérdida esperada de fruta por daños o enfermedades. '
            'Útil para planificar y pronosticar rendimiento.',
        imagePath: null,
      ),
    ],
  ),
```

- [ ] **Step 5: Add section 5 — Solución de Problemas**

Continue appending:

```dart
  // 5. Solución de Problemas (FAQ)
  HelpSection(
    id: 'troubleshooting',
    title: 'Solución de Problemas',
    description: 'Respuestas a preguntas frecuentes.',
    visibleForRoles: UserRole.values, // All roles
    items: [
      HelpItem(
        title: '¿Qué significa "Error en captura"?',
        content: 'La imagen no se pudo procesar. Posibles causas:\n\n'
            '• Sin conexión a internet\n'
            '• Imagen muy borrosa\n'
            '• Fruta no visible\n\n'
            'Solución: Intenta de nuevo con mejor iluminación.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Por qué tarda tanto el análisis?',
        content: 'El análisis con IA toma 10-30 segundos. Depende de:\n\n'
            '• Velocidad de tu conexión\n'
            '• Carga actual del servidor\n'
            '• Complejidad de la imagen\n\n'
            'Esto es normal, espera sin cerrar la app.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Puedo ver análisis anteriores?',
        content: 'Sí, ve a la pantalla "Historial" para ver todos '
            'los análisis pasados. Presiona cualquiera para ver detalles.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Qué hago si no tengo internet?',
        content: 'Las capturas en modo offline se guardan en "Capturas Pendientes". '
            'Cuando recuperes conexión, se enviarán automáticamente.',
        imagePath: null,
      ),
      HelpItem(
        title: '¿Cómo borro un análisis?',
        content: 'En la pantalla de resultados, hay un botón ⋮ (tres puntos). '
            'Presiona y selecciona "Eliminar". Esto no se puede deshacer.',
        imagePath: null,
      ),
    ],
  ),
```

- [ ] **Step 6: Add section 6 — Gestión de Campos/Solicitudes**

Complete appending and close the list:

```dart
  // 6. Gestión de Campos/Solicitudes
  HelpSection(
    id: 'fields-requests',
    title: 'Gestión de Campos y Solicitudes',
    description: 'Administra campos y solicitudes de muestreo.',
    visibleForRoles: [
      UserRole.productor,
      UserRole.agronomo,
      UserRole.admin,
    ],
    items: [
      HelpItem(
        title: 'Agregar un Nuevo Campo',
        content: 'En el menú, selecciona "Campos" → "Agregar". '
            'Completa nombre, ubicación (GPS) y cultivo. '
            'Presiona guardar.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Crear una Solicitud de Muestreo',
        content: 'Una solicitud es una tarea de muestreo en un campo específico. '
            'Selecciona el campo, define el área a muestrear y presiona "Crear". '
            'Se asignará a un agrólogo o monitor.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Ver Solicitudes Asignadas',
        content: 'Ve a "Solicitudes Pendientes" para ver todas tus tareas. '
            'Cada una muestra campo, prioridad y fecha límite.',
        imagePath: null,
      ),
      HelpItem(
        title: 'Cambiar el Campo Activo',
        content: 'En Home, presiona el selector de campo (parte superior) '
            'para cambiar a otro campo y ver sus análisis.',
        imagePath: null,
      ),
    ],
  ),
];
```

- [ ] **Step 7: Verify no compile errors**

```bash
cd zarza_ai
flutter analyze lib/presentation/help/help_content.dart
```

Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add lib/presentation/help/help_content.dart
git commit -m "feat(help): add all 6 help sections with content"
```

---

## Phase 2: Manual Screen + Drawer Integration

### Task 3: Create HelpSectionTile Widget

**Files:**
- Create: `zarza_ai/lib/presentation/help/help_section_tile.dart`

- [ ] **Step 1: Create the expandable section widget**

```dart
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';
import 'help_content.dart';

class HelpSectionTile extends StatefulWidget {
  final HelpSection section;

  const HelpSectionTile({
    Key? key,
    required this.section,
  }) : super(key: key);

  @override
  State<HelpSectionTile> createState() => _HelpSectionTileState();
}

class _HelpSectionTileState extends State<HelpSectionTile> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Card(
        elevation: 0,
        color: Colors.white.withValues(alpha: 0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(
            color: Colors.white.withValues(alpha: 0.08),
          ),
        ),
        child: ExpansionTile(
          title: Text(
            widget.section.title,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.frost,
              fontFamily: 'Lexend',
            ),
          ),
          subtitle: Text(
            widget.section.description,
            style: const TextStyle(
              fontSize: 12,
              color: AppTheme.dataGray,
              fontFamily: 'Lexend',
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          onExpansionChanged: (expanded) {
            setState(() => _isExpanded = expanded);
          },
          children: [
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.section.items.length,
              itemBuilder: (context, i) {
                final item = widget.section.items[i];
                return Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.title,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.frost,
                          fontFamily: 'Lexend',
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        item.content,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.6,
                          color: AppTheme.frostDim,
                          fontFamily: 'Lexend',
                        ),
                      ),
                      if (item.imagePath != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Image.asset(
                            item.imagePath!,
                            width: 300,
                            fit: BoxFit.contain,
                          ),
                        ),
                      if (i < widget.section.items.length - 1)
                        Padding(
                          padding: const EdgeInsets.only(top: 12),
                          child: Divider(
                            color: Colors.white.withValues(alpha: 0.06),
                          ),
                        ),
                    ],
                  ),
                );
              },
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Verify compiles**

```bash
cd zarza_ai
flutter analyze lib/presentation/help/help_section_tile.dart
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/presentation/help/help_section_tile.dart
git commit -m "feat(help): add HelpSectionTile expandable widget"
```

---

### Task 4: Create HelpScreen

**Files:**
- Create: `zarza_ai/lib/presentation/help/help_screen.dart`

- [ ] **Step 1: Create the main help screen**

```dart
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/auth/auth_cubit.dart';
import '../../core/auth/auth_state.dart';
import '../../core/theme/app_theme.dart';
import '../../domain/entities/user.dart';
import 'help_content.dart';
import 'help_section_tile.dart';

class HelpScreen extends StatelessWidget {
  const HelpScreen({Key? key}) : super(key: key);

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
```

- [ ] **Step 2: Verify compiles**

```bash
cd zarza_ai
flutter analyze lib/presentation/help/help_screen.dart
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/presentation/help/help_screen.dart
git commit -m "feat(help): add HelpScreen with role-based filtering"
```

---

### Task 5: Add Manual Option to Drawer

**Files:**
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart` (look for the drawer definition)

- [ ] **Step 1: Find the drawer in home_screen.dart**

Open [home_screen.dart](zarza_ai/lib/presentation/home/home_screen.dart). 
Look for the `_AppDrawer` class (around line 902).

- [ ] **Step 2: Add import for HelpScreen**

At the top of `home_screen.dart`, add:

```dart
import '../help/help_screen.dart';
```

- [ ] **Step 3: Add menu option after "Capturas pendientes"**

Find the line with "Capturas pendientes" ListTile (around line 994). After its closing `)`, add:

```dart
          ListTile(
            leading: const Icon(Icons.help_outline_rounded,
                color: AppTheme.frostDim),
            title: const Text('📖 Manual de Usuario',
                style: TextStyle(
                    color: AppTheme.frost, fontFamily: 'Lexend')),
            onTap: () {
              Navigator.of(context).pop();
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (context) => const HelpScreen(),
                ),
              );
            },
          ),
```

(Make sure it's before the `const Divider()` that comes after "Capturas pendientes".)

- [ ] **Step 4: Verify structure**

The drawer ListTile order should now be:
1. Historial
2. Capturas pendientes
3. **📖 Manual de Usuario** (new)
4. Divider
5. Cerrar sesión

- [ ] **Step 5: Test manually**

```bash
cd zarza_ai
flutter run
```

- Open drawer → Verify "📖 Manual de Usuario" appears
- Tap it → Verify HelpScreen opens
- Tap sections → Verify they expand/collapse
- Close and back → Verify you return to home

- [ ] **Step 6: Commit**

```bash
git add lib/presentation/home/home_screen.dart
git commit -m "feat(home): add Manual de Usuario option to drawer"
```

---

## Phase 3: Contextual Tooltips

### Task 6: Create HelpTooltip Widget

**Files:**
- Create: `zarza_ai/lib/presentation/widgets/help_tooltip.dart`

- [ ] **Step 1: Create the reusable tooltip component**

```dart
import 'package:flutter/material.dart';
import '../../core/theme/app_theme.dart';

class HelpTooltip extends StatelessWidget {
  /// The help icon to display
  final IconData icon;

  /// The tooltip text
  final String content;

  /// Max width of the tooltip popup
  final double maxWidth;

  /// Optional callback when tooltip is tapped
  final VoidCallback? onTap;

  const HelpTooltip({
    Key? key,
    this.icon = Icons.help_outline_rounded,
    required this.content,
    this.maxWidth = 280,
    this.onTap,
  }) : super(key: key);

  void _showTooltip(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        contentPadding: const EdgeInsets.all(20),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        backgroundColor: const Color(0xFF1A0535),
        title: null,
        content: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: maxWidth),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                content,
                style: const TextStyle(
                  fontSize: 13,
                  height: 1.6,
                  color: AppTheme.frostDim,
                  fontFamily: 'Lexend',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cerrar'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {
        onTap?.call();
        _showTooltip(context);
      },
      child: Icon(
        icon,
        size: 16,
        color: AppTheme.rubusLight,
      ),
    );
  }
}
```

- [ ] **Step 2: Verify compiles**

```bash
cd zarza_ai
flutter analyze lib/presentation/widgets/help_tooltip.dart
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add lib/presentation/widgets/help_tooltip.dart
git commit -m "feat(widgets): add HelpTooltip component"
```

---

### Task 7: Add Tooltips to Home Screen

**Files:**
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart`

- [ ] **Step 1: Add import for HelpTooltip**

At the top of `home_screen.dart`, add:

```dart
import '../widgets/help_tooltip.dart';
```

- [ ] **Step 2: Add tooltip next to "SALUD DEL CULTIVO"**

Find the line with `const Text('SALUD DEL CULTIVO',` (around line 279).

Replace that line's Row with a Row that includes the tooltip:

```dart
                        Row(
                          children: [
                            const Text(
                              'SALUD DEL CULTIVO',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                letterSpacing: 0.06,
                                color: AppTheme.rubusLight,
                                fontFamily: 'Lexend',
                              ),
                            ),
                            const SizedBox(width: 6),
                            HelpTooltip(
                              content: 'La salud es el porcentaje promedio '
                                  'de frutas sanas. 100% = todas sanas, 0% = todas enfermas.',
                              maxWidth: 260,
                            ),
                          ],
                        ),
```

- [ ] **Step 3: Add tooltip next to "7 detectados"**

Find the line with `'${analysis.totalDetected} detectados · ${analysis.healthyCount} sanos'` (around line 859).

Wrap that Text in a Row with tooltip:

```dart
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              '${analysis.totalDetected} detectados · ${analysis.healthyCount} sanos',
                              style: Theme.of(context).textTheme.titleMedium,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const SizedBox(width: 6),
                          HelpTooltip(
                            content: 'Detectados = frutas analizadas. Sanos = sin enfermedades.',
                            maxWidth: 260,
                          ),
                        ],
                      ),
```

- [ ] **Step 4: Test manually**

```bash
cd zarza_ai
flutter run
```

- Navigate to home (if not already there)
- Look for small help icons "?" next to "SALUD DEL CULTIVO" and "detectados"
- Tap each → Verify tooltip dialog appears with text
- Close → Verify returns to normal view

- [ ] **Step 5: Commit**

```bash
git add lib/presentation/home/home_screen.dart
git commit -m "feat(home): add help tooltips to hero card and analysis tile"
```

---

### Task 8: Add Tooltips to Results Screen

**Files:**
- Modify: `zarza_ai/lib/presentation/results/results_screen.dart` (or wherever results are displayed)

- [ ] **Step 1: Find results screen file**

Locate your results screen file. Based on the project, it's likely:
- `zarza_ai/lib/presentation/results/results_screen.dart`

- [ ] **Step 2: Add import**

```dart
import '../widgets/help_tooltip.dart';
```

- [ ] **Step 3: Add tooltip near phenological stage**

Find where phenological stage is displayed in results. Look for Stage badge or similar.
Add tooltip next to it:

```dart
                          Row(
                            children: [
                              Text('Stage ${stage.index}'),
                              const SizedBox(width: 6),
                              HelpTooltip(
                                content: 'Etapa de desarrollo de la fruta. '
                                    'Stage 1-7 según cronología de maduración.',
                                maxWidth: 260,
                              ),
                            ],
                          ),
```

- [ ] **Step 4: Add tooltip near status badge**

Find where status (COMPLETADO/ERROR/etc) is shown. Add tooltip:

```dart
                          Row(
                            children: [
                              StatusBadge(status: analysis.status),
                              const SizedBox(width: 6),
                              HelpTooltip(
                                content: 'COMPLETADO = análisis finalizado. '
                                    'PROCESANDO = en cola. ERROR = reintentar.',
                                maxWidth: 260,
                              ),
                            ],
                          ),
```

- [ ] **Step 5: Test manually**

```bash
cd zarza_ai
flutter run
```

- Navigate to a results screen
- Look for "?" help icons
- Tap each → Verify tooltips appear
- Close and verify no layout breaks

- [ ] **Step 6: Commit**

```bash
git add lib/presentation/results/results_screen.dart
git commit -m "feat(results): add help tooltips for stage and status"
```

---

## Phase 4: Testing & Polish

### Task 9: Write Unit Tests for Content Models

**Files:**
- Create: `zarza_ai/test/presentation/help/help_content_test.dart`

- [ ] **Step 1: Create test file**

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/presentation/help/help_content.dart';
import 'package:zarza_ai/domain/entities/user.dart';

void main() {
  group('HelpSection', () {
    test('filterByRole returns only sections visible to role', () {
      const productor = UserRole.productor;
      const agronomo = UserRole.agronomo;
      const admin = UserRole.admin;

      // Filter for Productor
      final productorSections = HelpSection.filterByRole(allHelpSections, productor);
      
      // All sections should be visible to Productor
      expect(productorSections.isNotEmpty, true);
      
      // Check Captura is visible (only to productor, agronomo)
      final captureSection = productorSections.firstWhere(
        (s) => s.id == 'capture',
        orElse: () => throw Exception('Capture section not found'),
      );
      expect(captureSection.title, 'Captura de Análisis');
    });

    test('allHelpSections has exactly 6 sections', () {
      expect(allHelpSections.length, 6);
    });

    test('all sections have at least one item', () {
      for (final section in allHelpSections) {
        expect(section.items.isNotEmpty, true,
            reason: 'Section ${section.id} has no items');
      }
    });

    test('section IDs are unique', () {
      final ids = allHelpSections.map((s) => s.id).toList();
      expect(ids.length, ids.toSet().length);
    });
  });

  group('HelpItem', () {
    test('HelpItem with imagePath compiles', () {
      const item = HelpItem(
        title: 'Test',
        content: 'Test content',
        imagePath: 'assets/test.png',
      );
      expect(item.imagePath, 'assets/test.png');
    });

    test('HelpItem without imagePath is null', () {
      const item = HelpItem(
        title: 'Test',
        content: 'Test content',
      );
      expect(item.imagePath, null);
    });
  });
}
```

- [ ] **Step 2: Run tests**

```bash
cd zarza_ai
flutter test test/presentation/help/help_content_test.dart
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add test/presentation/help/help_content_test.dart
git commit -m "test(help): add unit tests for HelpSection and HelpItem models"
```

---

### Task 10: Write Widget Tests for HelpScreen

**Files:**
- Create: `zarza_ai/test/presentation/help/help_screen_test.dart`

- [ ] **Step 1: Create widget test**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get_it/get_it.dart';
import 'package:zarza_ai/core/auth/auth_cubit.dart';
import 'package:zarza_ai/core/auth/auth_state.dart';
import 'package:zarza_ai/domain/entities/user.dart';
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
        AuthAuthenticated(
          user: User(
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
        MaterialApp(
          home: const HelpScreen(),
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
        MaterialApp(
          home: const HelpScreen(),
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
        MaterialApp(
          home: const HelpScreen(),
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
```

- [ ] **Step 2: Add mocktail dependency (if not present)**

Check `pubspec.yaml` for `mocktail` under `dev_dependencies`. If not present, add:

```yaml
dev_dependencies:
  mocktail: ^1.0.0
```

- [ ] **Step 3: Run tests**

```bash
cd zarza_ai
flutter test test/presentation/help/help_screen_test.dart
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add test/presentation/help/help_screen_test.dart
git commit -m "test(help): add widget tests for HelpScreen"
```

---

### Task 11: Write Widget Tests for HelpTooltip

**Files:**
- Create: `zarza_ai/test/presentation/widgets/help_tooltip_test.dart`

- [ ] **Step 1: Create tooltip test**

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/presentation/widgets/help_tooltip.dart';

void main() {
  group('HelpTooltip', () {
    testWidgets('renders icon', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test tooltip',
                icon: Icons.help_outline_rounded,
              ),
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.help_outline_rounded), findsOneWidget);
    });

    testWidgets('shows dialog on tap', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test tooltip content',
              ),
            ),
          ),
        ),
      );

      // Initially no dialog
      expect(find.text('Test tooltip content'), findsNothing);

      // Tap the icon
      await tester.tap(find.byType(HelpTooltip));
      await tester.pumpAndSettle();

      // Dialog should appear with content
      expect(find.text('Test tooltip content'), findsWidgets);
      expect(find.text('Cerrar'), findsOneWidget);
    });

    testWidgets('closes dialog when tapping Cerrar button',
        (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test tooltip',
              ),
            ),
          ),
        ),
      );

      // Open dialog
      await tester.tap(find.byType(HelpTooltip));
      await tester.pumpAndSettle();

      expect(find.text('Cerrar'), findsOneWidget);

      // Tap close button
      await tester.tap(find.text('Cerrar'));
      await tester.pumpAndSettle();

      // Dialog should be gone
      expect(find.byType(AlertDialog), findsNothing);
    });

    testWidgets('calls onTap callback', (WidgetTester tester) async {
      var callCount = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Center(
              child: HelpTooltip(
                content: 'Test',
                onTap: () => callCount++,
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.byType(HelpTooltip));
      await tester.pumpAndSettle();

      expect(callCount, 1);
    });
  });
}
```

- [ ] **Step 2: Run tests**

```bash
cd zarza_ai
flutter test test/presentation/widgets/help_tooltip_test.dart
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add test/presentation/widgets/help_tooltip_test.dart
git commit -m "test(widgets): add widget tests for HelpTooltip"
```

---

### Task 12: Manual E2E Testing & Polish

**Files:**
- Test: All new features (no code changes, just verification)

- [ ] **Step 1: Launch app in debug**

```bash
cd zarza_ai
flutter run
```

- [ ] **Step 2: Test drawer menu**

- Tap hamburger menu (drawer)
- Verify "📖 Manual de Usuario" appears between "Capturas pendientes" and "Cerrar sesión"
- Tap it → HelpScreen opens
- Verify all 6 section titles visible

- [ ] **Step 3: Test help screen sections**

- In HelpScreen, tap "Primeros Pasos" → Expands showing 3 items
- Tap again → Collapses
- Tap "Captura de Análisis" → Expands, shows steps + image placeholder
- Verify all 6 sections expand/collapse without errors

- [ ] **Step 4: Test home screen tooltips**

- Close help screen (press back)
- In home screen, look for "?" icon next to "SALUD DEL CULTIVO"
- Tap it → Tooltip dialog appears with explanation
- Tap "Cerrar" → Dialog closes
- Repeat for "detectados" tooltip

- [ ] **Step 5: Test results screen tooltips**

- Navigate to a results screen (from recent analyses in home)
- Look for "?" next to Stage badge (if visible)
- Tap → Tooltip appears
- Verify tooltip text about Stage 1-7
- Close and verify page still works

- [ ] **Step 6: Test with different role (if possible)**

- If you have test accounts with different roles, log in as Agronomo or Monitor
- Open help screen → Verify only applicable sections show
- Example: Agronomo should see "Captura" section; Monitor might not

- [ ] **Step 7: Test on multiple screen sizes**

```bash
cd zarza_ai
flutter run -d "iPhone 13"      # or another emulator
flutter run -d "Pixel 6"        # different aspect ratio
```

- Verify tooltips display correctly on different screen widths
- Verify help section tiles don't overflow
- Verify images (if added) scale appropriately

- [ ] **Step 8: Check for console errors**

During manual testing, watch the console (`flutter run` output) for any errors, warnings, or exceptions. Fix any that appear.

- [ ] **Step 9: Commit final polish (if any fixes made)**

```bash
git add -A
git commit -m "feat(help): final polish and E2E testing"
```

---

## Summary

**Tasks completed:**

✅ Task 1: Created HelpItem and HelpSection models  
✅ Task 2: Created all 6 help sections with content  
✅ Task 3: Created HelpSectionTile expandable widget  
✅ Task 4: Created HelpScreen with role filtering  
✅ Task 5: Added manual menu to drawer  
✅ Task 6: Created HelpTooltip component  
✅ Task 7: Added tooltips to home screen  
✅ Task 8: Added tooltips to results screen  
✅ Task 9: Wrote unit tests for models  
✅ Task 10: Wrote widget tests for HelpScreen  
✅ Task 11: Wrote widget tests for HelpTooltip  
✅ Task 12: Manual E2E testing & polish  

---

## Success Criteria

After completing all tasks:

✅ All 6 help sections accessible from drawer  
✅ Content filtered correctly by user role  
✅ Tooltips appear on key elements (home + results)  
✅ Expanding/collapsing sections works smoothly  
✅ No console errors or warnings  
✅ All tests pass (`flutter test`)  
✅ Manual testing on multiple screen sizes successful  
✅ Images load when present (Phase 3 enhancement)  

---

## Next Steps (Future)

1. **Add real images** — Replace placeholder paths with actual screenshots
2. **Backend integration** — Move content to API endpoint
3. **Multilingual support** — Add English, Portuguese translations
4. **Analytics** — Track which sections users visit most
5. **Video tutorials** — Embed demo videos in key sections
