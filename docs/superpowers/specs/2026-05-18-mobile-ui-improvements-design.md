# Mobile UI Improvements — RubusAI Flutter

**Plan relacionado:** [[2026-05-18-mobile-ui-improvements]]

**Date**: 2026-05-18  
**Status**: Design approved  
**Scope**: Three focused UI/UX improvements to the Home screen

---

## Overview

Three complementary improvements to the RubusAI home screen to improve visual clarity, information density, and error handling:

1. **Dates in Recent Analyses** — Show both relative time + exact datetime
2. **Ring Progress Clarity** — Replace blur effect with sharp rendering + refined glow
3. **Connection Error Handling** — Simplify error messages + add retry button

---

## 1. Dates in Recent Analyses

### Current State
- `_AnalysisListTile` shows only relative time: `"hace 2h"`, `"hace 1d"`
- Exact date is calculated but not displayed

### Target State
Two-line date display in each list item:
```
hace 2h              ← relative time (primary, normal size)
18 de mayo · 14:30   ← exact date + time (secondary, smaller, gray)
```

### Implementation Details

**File**: `zarza_ai/lib/presentation/home/home_screen.dart`  
**Component**: `_AnalysisListTile` (line 772)

Changes:
- Keep existing `date` calculation (line 778–780)
- Create `relativeTime` string from `analysis.createdAt` using `_relativeTime()` helper
- Update the `Text` widget at line 830–832 to show both:
  ```dart
  Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(relativeTime, style: Theme.of(context).textTheme.labelMedium),
      SizedBox(height: 2),
      Text(date, style: Theme.of(context).textTheme.labelSmall?.copyWith(color: AppTheme.dataGray)),
    ],
  )
  ```
- Date format: `"DD de MMMM · HH:mm"` (e.g., `"18 de mayo · 14:30"`)
- Use `intl` package for Spanish month names if needed, or hardcode enum

---

## 2. Ring Progress Clarity

### Current State
- `RingProgress` uses `MaskFilter.blur(BlurStyle.normal, strokeWidth * 0.5)` on the arc paint (line 97–98 in `ring_progress.dart`)
- Creates soft glow effect but appears blurry/lacks definition

### Target State
- Sharp, crisp ring rendering
- Refined glow: subtle shadow/lighting effect (not blur)
- Anti-aliased edges

### Implementation Details

**File**: `zarza_ai/lib/presentation/widgets/ring_progress.dart`  
**Component**: `_RingPainter` (line 53)

Changes:
- **Remove blur**: Delete lines 96–99 (the `maskFilter` assignment)
- **Add shadow**: Add `BoxShadow` to the `SizedBox` in `RingProgress.build()` (line 30–50):
  ```dart
  Container(
    decoration: BoxDecoration(
      boxShadow: [
        BoxShadow(
          color: ringColor.withValues(alpha: 0.25),
          blurRadius: 12,
          offset: Offset(0, 2),
        ),
      ],
    ),
    child: SizedBox(
      width: size,
      height: size,
      child: Stack(...),
    ),
  )
  ```
- **Anti-alias**: Already enabled by default in Flutter's `CustomPaint` with `isAntiAlias: true` (add explicitly if needed)

### Result
- Ring appears sharp and defined
- Subtle shadow creates depth/glow without blur
- Better visibility at all sizes (44px in list, 80px in hero card)

---

## 3. Connection Error Handling

### Current State
- `HistoryError` state displays full error message (e.g., `"DioException [connection error]: The connection errored: SocketException: Connection refused..."`)
- Shown in two places:
  - `_HeroErrorBody` (hero card, line 491–551)
  - `_RecentAnalysesList` (list, line 714–732)

### Target State
- Simple, user-friendly error message
- Visible retry button in both locations
- Large, clear error icon

### Implementation Details

**File**: `zarza_ai/lib/presentation/home/home_screen.dart`

**In `_HeroErrorBody` (line 491–551):**
- Replace the full `state.message` with fixed text:
  ```dart
  const Text(
    'Sin conexión',
    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700, color: AppTheme.frost),
  ),
  const Text(
    'Verifica tu internet y vuelve a intentarlo.',
    style: TextStyle(fontSize: 12, color: AppTheme.dataGray, height: 1.5),
  ),
  ```
- Increase error icon size to 48px (currently implicit via Container)
- Add retry button below text:
  ```dart
  SizedBox(height: 12),
  ElevatedButton.icon(
    icon: const Icon(Icons.refresh_rounded, size: 16),
    label: const Text('Reintentar'),
    onPressed: () => context.read<HistoryBloc>().add(GetAnalysesEvent()),
    style: ElevatedButton.styleFrom(
      backgroundColor: AppTheme.rubus,
      foregroundColor: Colors.white,
    ),
  ),
  ```

**In `_RecentAnalysesList` (line 714–732):**
- Replace `Center(child: Padding(...))` with similar layout:
  ```dart
  Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(Icons.cloud_off_rounded, size: 48, color: AppTheme.warn),
        SizedBox(height: 12),
        Text('Sin conexión', style: Theme.of(context).textTheme.titleMedium),
        SizedBox(height: 4),
        const Text('Verifica tu internet.', style: TextStyle(color: AppTheme.dataGray)),
        SizedBox(height: 16),
        ElevatedButton.icon(
          icon: const Icon(Icons.refresh_rounded, size: 16),
          label: const Text('Reintentar'),
          onPressed: () => context.read<HistoryBloc>().add(GetAnalysesEvent()),
          style: ElevatedButton.styleFrom(backgroundColor: AppTheme.rubus),
        ),
      ],
    ),
  )
  ```

**BLoC Event**: Ensure `HistoryBloc` can handle a "retry" event. If not, add `GetAnalysesEvent()` or similar to trigger a fresh load.

---

## Data Flow & State

No changes to data models or BLoC logic. All improvements are **presentation-layer only**:
- Dates are already in `FruitAnalysis` entities
- Error messages come from `HistoryError.message` but we ignore them
- Retry uses existing BLoC events

---

## Testing

Manual testing on home screen:
1. **Dates**: Verify both relative + exact datetime appear in each list item
2. **Rings**: Verify circles are sharp, not blurry, in both hero card (80px) and list items (44px)
3. **Errors**: 
   - Simulate offline mode (toggle device airplane mode or kill backend)
   - Verify "Sin conexión" message (not full exception) in hero card
   - Verify "Reintentar" button appears and works
   - Verify same in list when hero card is skipped

---

## Notes

- **Localization**: Date formatting ("de mayo") is hardcoded Spanish. Consider `intl` package if future i18n is needed.
- **Retry state**: After clicking "Reintentar", should show loading spinner. Ensure `HistoryLoading` state is rendered while retrying.
- **Performance**: `RingProgress` shadow effect is minimal (single boxShadow). No performance impact expected.
