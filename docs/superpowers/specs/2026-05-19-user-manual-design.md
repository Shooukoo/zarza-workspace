# Manual de Usuario Dinámico + Tooltips Contextuales

**Date:** 2026-05-19  
**Feature:** In-app user help system  
**Status:** Design Approved

---

## Overview

Implementar un sistema de ayuda integrado en la app que proporcione:
1. **Manual completo** — accesible desde el drawer, organizado en secciones
2. **Tooltips contextuales** — explicaciones inline en pantallas clave
3. **Filtrado por rol** — solo contenido relevante a cada usuario

**Objetivo:** Ayudar usuarios (Productor, Agrólogo, Monitor, Admin) a comprender y usar la app sin necesidad de documentación externa.

---

## User Flows

### Flow 1: Acceder al Manual Completo

```
Usuario abre drawer → Presiona "📖 Manual de Usuario" → Abre pantalla Help
→ Ve índice de secciones → Selecciona sección → Lee contenido + imágenes
→ Expande/colapsa items → Vuelve a home (botón back o close)
```

### Flow 2: Consultar Concepto Específico

```
Usuario en home ve "?" junto a "Salud del cultivo" → Presiona → 
Aparece tooltip "La salud es el promedio de frutas sanas..." → Cierra tap afuera
```

---

## Architecture

### Two-Layer Help System

#### Layer 1: Manual Screen (Drawer Entry)

**Ubicación:** Nueva pantalla `help_screen.dart`

**Acceso:**
- Drawer → Nueva opción "📖 Manual de Usuario" 
- Ubicación: Después de "Capturas pendientes", antes del divider

**UI:**
- AppBar con título "Manual de Usuario" + botón close
- Body: ListView con secciones expandibles (ExpansionTile o Card)
- Cada sección contiene items con:
  - Título (bold)
  - Texto descriptivo
  - Imagen opcional (centered, max-width 300px)

**Filtrado:** Solo muestra secciones aplicables al rol del usuario

#### Layer 2: Contextual Tooltips

**Ubicación:** Iconos "?" integrados en pantallas existentes

**Componente:** `help_tooltip.dart` (reutilizable)

```dart
HelpTooltip(
  icon: Icons.help_outline_rounded,
  content: "Explicación corta de este elemento",
  maxWidth: 280,
)
```

**Comportamiento:**
- Icono pequeño (16px) junto al elemento que explica
- Al presionar, aparece PopupMenuButton o custom overlay con texto
- Se cierra al presionar afuera o botón close

---

## Content Structure

### Help Sections (Role-Filtered)

#### 1. Primeros Pasos
- **Visible para:** Todos los roles
- **Contenido:**
  - Navegación básica de la app
  - Qué significa cada pantalla (Home, Historial, etc.)
  - Roles y permisos (qué puede hacer cada uno)
- **Imágenes:** Opcional (screenshots de navegación)

#### 2. Captura de Análisis
- **Visible para:** Productor, Agrólogo (si puede capturar)
- **Contenido:**
  - Paso 1: Acceder a "Capturar Análisis"
  - Paso 2: Alineación correcta de la fruta
  - Paso 3: Presionar botón captura
  - Paso 4: Esperar procesamiento (cuánto tarda)
  - Qué hacer si falla la captura
- **Imágenes:** 2-3 screenshots del flujo de captura

#### 3. Interpretar Resultados
- **Visible para:** Todos
- **Contenido:**
  - Qué significan los números (salud, detectados, sanos)
  - Escala de colores (verde=bueno, rojo=alerta)
  - Etapas fenológicas (qué son Stage 1-7)
  - Interpretación de detecciones de enfermedades
  - Cómo leer el gráfico de distribución
- **Imágenes:** Screenshot de pantalla de resultados con anotaciones

#### 4. Conceptos Clave (Glosario)
- **Visible para:** Todos
- **Contenido:** Bullet points con definiciones
  - Salud del cultivo
  - Detección de frutas
  - Frutas sanas vs enfermas
  - Etapas fenológicas
  - Confianza de detección
  - Merma (pérdida esperada)
- **Imágenes:** Ninguna (solo texto)

#### 5. Solución de Problemas
- **Visible para:** Todos
- **Contenido:**
  - "¿Qué significa 'Error en captura'?" → Reintentar
  - "¿Por qué tarda tanto el análisis?" → Explicación
  - "¿Puedo ver análisis anteriores?" → Historial
  - "¿Qué hago si no tengo internet?" → Cola offline
  - "¿Cómo borro un análisis?" → Explicación (si es posible)
- **Imágenes:** Ninguna (solo Q&A)

#### 6. Gestión de Campos/Solicitudes
- **Visible para:** Productor, Agrólogo, Admin
- **Contenido:**
  - Cómo agregar un campo
  - Cómo crear una solicitud de muestreo
  - Cómo ver solicitudes asignadas
  - Cómo cambiar campos activos
- **Imágenes:** Opcional (screenshots de flujos)

---

## Contextual Tooltips Placement

| Pantalla | Elemento | Tooltip Content |
|----------|----------|-----------------|
| Home | "SALUD DEL CULTIVO" title | "La salud es el porcentaje promedio de frutas sanas. 100% = todas sanas, 0% = todas enfermas." |
| Home | "7 detectados · 7 sanos" | "Detectados = frutas analizadas. Sanos = sin enfermedades." |
| Home | Ring progress % | "Escala de 0-100%. Más alto = cultivo más saludable." |
| Results | Etapa fenológica badge | "Etapa de desarrollo de la fruta. Stage 1-7 según cronología." |
| Results | Status badge | "COMPLETADO = análisis finalizado. PROCESANDO = en cola. ERROR = reintentar." |
| Results | Disease cards | "Enfermedad detectada con X% confianza. Más alto = más seguro." |

---

## Implementation Structure

### File Organization

```
zarza_ai/lib/presentation/
├── help/
│   ├── help_screen.dart          (Main manual screen)
│   ├── help_content.dart         (All content + definitions)
│   └── help_section_tile.dart    (Expandable section widget)
├── widgets/
│   └── help_tooltip.dart         (Reusable tooltip component)
└── [existing screens]            (Add HelpTooltip icons)
```

### Content Model

```dart
// help_content.dart structure

class HelpSection {
  final String id;
  final String title;
  final String description;
  final List<HelpItem> items;
  final List<UserRole> visibleForRoles;
}

class HelpItem {
  final String title;
  final String content;
  final String? imagePath;  // null if no image
}

// Instance: final allHelpSections = [
//   HelpSection(
//     id: 'getting-started',
//     title: 'Primeros pasos',
//     description: 'Aprende lo básico...',
//     items: [
//       HelpItem(title: 'Navegación', content: '...', imagePath: null),
//       HelpItem(title: 'Roles', content: '...', imagePath: null),
//     ],
//     visibleForRoles: UserRole.values, // All
//   ),
//   // ... more sections
// ]
```

---

## Implementation Phases

### Phase 1: Content + Manual Screen (MVP)
1. Define `HelpSection` and `HelpItem` models in `help_content.dart`
2. Write all 6 sections with minimal content (text only, no images)
3. Build `help_screen.dart` with expandable sections
4. Add "📖 Manual de Usuario" option to drawer
5. Test filtering by role

### Phase 2: Contextual Tooltips
1. Create `help_tooltip.dart` component
2. Add help icons to home_screen (3-4 key elements)
3. Add help icons to results_screen (2-3 elements)
4. Test tooltip appearance and dismiss behavior

### Phase 3: Images + Polish
1. Add screenshots/diagrams to relevant sections
2. Refine typography and spacing
3. Test on multiple screen sizes
4. E2E testing (all roles can access content)

### Phase 4: Backend Migration (Future)
1. Extract content to API endpoint
2. Add caching for offline access
3. Add versioning for content updates

---

## Technical Details

### Role-Based Filtering

Content is filtered at build time:

```dart
final filteredSections = allHelpSections
    .where((s) => s.visibleForRoles.contains(currentUserRole))
    .toList();
```

No database queries — pure in-memory filtering.

### Tooltip Implementation

Reusable component:

```dart
HelpTooltip(
  icon: Icons.help_outline_rounded,
  content: "Tooltip text here",
  maxWidth: 280,
)
```

Uses PopupMenuButton or custom showDialog for display.

### Images

Images stored in `assets/help_images/`:
- `capture_step1.png`
- `results_example.png`
- etc.

Paths defined in `help_content.dart` as constants.

---

## Testing Strategy

### Unit Tests
- Content model serialization
- Role filtering logic
- Tooltip text truncation

### Widget Tests
- HelpScreen renders all sections
- Expandable sections toggle correctly
- Tooltips appear/disappear on gesture
- Content respects role visibility

### Manual Testing
- Test each role (Productor, Agrólogo, Monitor, Admin)
- Verify only relevant sections visible
- Check images load correctly
- Tooltip positioning on various screen sizes

---

## Constraints & Assumptions

- **Hardcoded content initially:** No backend calls in Phase 1
- **Offline available:** Content is bundled with app, no network required
- **English/Spanish:** Currently Spanish; multilingual support is Phase 4
- **Image assets:** Placeholders okay for MVP; real screenshots in Phase 3
- **Storage:** No persistence needed (stateless content)

---

## Success Criteria

✅ All 6 help sections accessible from drawer  
✅ Content filtered correctly by user role  
✅ Tooltips appear on key elements without blocking interaction  
✅ Images load and display properly (Phase 3)  
✅ No performance impact (content loads instantly)  
✅ E2E testing: all user flows work without errors  

---

## Future Enhancements (Post-MVP)

1. **Backend content delivery** — Pull sections from API
2. **Multilingual support** — Add English, Portuguese, etc.
3. **Video tutorials** — Embed walkthrough videos
4. **Search/filter** — "Find answer to..." input
5. **Feedback loop** — "Was this helpful?" buttons
6. **Analytics** — Track which sections are most viewed
