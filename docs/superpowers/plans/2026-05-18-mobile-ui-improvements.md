# Mobile UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve visual clarity and UX on the RubusAI home screen by adding exact dates, sharpening ring progress indicators, and simplifying connection error messages.

**Architecture:** Three independent presentation-layer improvements to `home_screen.dart` and `ring_progress.dart` widgets. No BLoC or data model changes. Each improvement is isolated and can be tested independently.

**Tech Stack:** Flutter 3, Dart, BLoC (existing), intl package (for date formatting)

---

## File Structure

**Files to modify:**
- `zarza_ai/lib/presentation/home/home_screen.dart` — Update `_AnalysisListTile`, `_HeroErrorBody`, `_RecentAnalysesList`
- `zarza_ai/lib/presentation/widgets/ring_progress.dart` — Update `RingProgress`, `_RingPainter`

**Dependencies:**
- `intl` package (for Spanish month names in date formatting)

---

## Task 1: Add Date Formatting Helper

**Files:**
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart:1-20`

- [ ] **Step 1: Add intl import and date formatter helper function**

At the top of `home_screen.dart`, add after existing imports:

```dart
import 'package:intl/intl.dart';
```

Then, add a helper function before the `HomeScreen` class definition (around line 17, before `class HomeScreen`):

```dart
String _formatExactDate(DateTime dt) {
  final formatter = DateFormat('d \'de\' MMMM \'·\' HH:mm', 'es_ES');
  return formatter.format(dt);
}
```

- [ ] **Step 2: Verify intl is in pubspec.yaml**

Run: `grep -n "intl:" zarza_ai/pubspec.yaml`

If not present, add to `pubspec.yaml` under `dependencies`:
```yaml
intl: ^0.19.0
```

Then run: `pnpm install` (or `flutter pub get` if in `zarza_ai/`)

- [ ] **Step 3: Commit**

```bash
cd "c:\Users\shoxd\Proyecto Dalet"
git add zarza_ai/lib/presentation/home/home_screen.dart zarza_ai/pubspec.yaml
git commit -m "feat(home): add date formatting helper for exact datetime display"
```

---

## Task 2: Update _AnalysisListTile to Show Both Dates

**Files:**
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart:772-852`

- [ ] **Step 1: Update _AnalysisListTile to compute both dates**

In the `_AnalysisListTile.build()` method, find the section around line 777-783 where `date` is computed. Replace it with:

```dart
final relativeTime = analysis.createdAt != null
    ? _relativeTime(analysis.createdAt!)
    : '—';
final exactDate = analysis.createdAt != null
    ? _formatExactDate(analysis.createdAt!)
    : '—';
```

- [ ] **Step 2: Update the date display in the Column (line 820-835)**

Find the `Column` inside the `Expanded` widget. Replace the existing `Text` widget for date (around line 830-832) with:

```dart
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    Text(
      relativeTime,
      style: Theme.of(context).textTheme.labelMedium,
    ),
    const SizedBox(height: 2),
    Text(
      exactDate,
      style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: AppTheme.dataGray,
          ),
    ),
  ],
),
```

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/presentation/home/home_screen.dart
git commit -m "feat(home): display both relative and exact dates in analysis list"
```

---

## Task 3: Remove Blur and Add Shadow to RingProgress

**Files:**
- Modify: `zarza_ai/lib/presentation/widgets/ring_progress.dart:28-99`

- [ ] **Step 1: Wrap SizedBox with shadow container**

In `RingProgress.build()`, find the `SizedBox` widget (around line 30). Replace the entire return statement:

```dart
return SizedBox(
  width: size,
  height: size,
  child: Stack(
    alignment: Alignment.center,
    children: [
      CustomPaint(...),
      if (child != null) child!,
    ],
  ),
);
```

With:

```dart
return Container(
  decoration: BoxDecoration(
    boxShadow: [
      BoxShadow(
        color: (color ?? AppTheme.emerald).withValues(alpha: 0.25),
        blurRadius: 12,
        offset: const Offset(0, 2),
      ),
    ],
  ),
  child: SizedBox(
    width: size,
    height: size,
    child: Stack(
      alignment: Alignment.center,
      children: [
        CustomPaint(
          size: Size(size, size),
          painter: _RingPainter(
            value: (value / 100).clamp(0.0, 1.0),
            color: color ?? AppTheme.emerald,
            strokeWidth: strokeWidth,
            trackColor: AppTheme.grayLine,
            glow: glow,
          ),
        ),
        if (child != null) child!,
      ],
    ),
  ),
);
```

- [ ] **Step 2: Remove the MaskFilter.blur from _RingPainter.paint()**

In the `_RingPainter.paint()` method (around line 90-99), find:

```dart
if (glow) {
  arcPaint.maskFilter =
      MaskFilter.blur(BlurStyle.normal, strokeWidth * 0.5);
}
```

Delete those lines entirely. The arc will now be rendered sharp without blur.

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/presentation/widgets/ring_progress.dart
git commit -m "feat(widgets): replace ring blur with boxshadow for sharper rendering"
```

---

## Task 4: Simplify Error Message and Add Retry Button to Hero Card

**Files:**
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart:491-552`

- [ ] **Step 1: Update _HeroErrorBody to show simple message and retry button**

Find the `_HeroErrorBody` class (around line 491). Replace the entire `build()` method:

```dart
@override
Widget build(BuildContext context) {
  return Row(
    children: [
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
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
            const SizedBox(height: 10),
            const Text(
              'Sin conexión',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.w700,
                color: AppTheme.frost,
                fontFamily: 'Lexend',
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Verifica tu internet\ny vuelve a intentarlo.',
              style: TextStyle(
                fontSize: 12,
                color: AppTheme.dataGray,
                fontFamily: 'Lexend',
                height: 1.5,
              ),
            ),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              icon: const Icon(Icons.refresh_rounded, size: 16),
              label: const Text('Reintentar'),
              onPressed: () {
                context.read<HistoryBloc>().add(GetAnalysesEvent());
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.rubus,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
      const SizedBox(width: 12),
      Container(
        width: 80,
        height: 80,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: AppTheme.danger.withValues(alpha: 0.10),
          border: Border.all(color: AppTheme.danger.withValues(alpha: 0.3)),
        ),
        child: const Icon(Icons.cloud_off_rounded,
            size: 48, color: AppTheme.danger),
      ),
    ],
  );
}
```

- [ ] **Step 2: Verify HistoryBloc has GetAnalysesEvent**

Check the file: `zarza_ai/lib/presentation/history/history_bloc.dart`

Search for: `class GetAnalysesEvent`

If it doesn't exist, add to the events section:
```dart
class GetAnalysesEvent extends HistoryEvent {
  const GetAnalysesEvent();
}
```

And ensure `HistoryBloc.mapEventToState()` or equivalent handler processes it by calling the use case again.

- [ ] **Step 3: Commit**

```bash
git add zarza_ai/lib/presentation/home/home_screen.dart zarza_ai/lib/presentation/history/history_bloc.dart
git commit -m "feat(home): simplify error message and add retry button to hero card"
```

---

## Task 5: Simplify Error Message and Add Retry Button to Analysis List

**Files:**
- Modify: `zarza_ai/lib/presentation/home/home_screen.dart:706-770`

- [ ] **Step 1: Update _RecentAnalysesList error state**

Find the `_RecentAnalysesList` widget (around line 706). In the `build()` method, find the error handling section (around line 714-732):

```dart
if (state is HistoryError) {
  return Center(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.cloud_off_rounded,
              size: 48, color: AppTheme.dataGray),
          const SizedBox(height: 12),
          Text(
            state.message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppTheme.dataGray),
          ),
        ],
      ),
    ),
  );
}
```

Replace with:

```dart
if (state is HistoryError) {
  return Center(
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.cloud_off_rounded,
            size: 48, color: AppTheme.warn),
        const SizedBox(height: 12),
        Text(
          'Sin conexión',
          style: Theme.of(context).textTheme.titleMedium,
        ),
        const SizedBox(height: 4),
        const Text(
          'Verifica tu internet.',
          style: TextStyle(color: AppTheme.dataGray),
        ),
        const SizedBox(height: 16),
        ElevatedButton.icon(
          icon: const Icon(Icons.refresh_rounded, size: 16),
          label: const Text('Reintentar'),
          onPressed: () {
            context.read<HistoryBloc>().add(GetAnalysesEvent());
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppTheme.rubus,
            foregroundColor: Colors.white,
          ),
        ),
      ],
    ),
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add zarza_ai/lib/presentation/home/home_screen.dart
git commit -m "feat(home): simplify error message and add retry button to analysis list"
```

---

## Task 6: Manual Testing on Home Screen

**Files:**
- Test: `zarza_ai/lib/presentation/home/home_screen.dart` (visual inspection)

- [ ] **Step 1: Run the app in debug mode**

```bash
cd "c:\Users\shoxd\Proyecto Dalet\zarza_ai"
flutter run -d <device_id>
```

Or if using an emulator/simulator, just:
```bash
flutter run
```

- [ ] **Step 2: Test date display**

- Navigate to Home screen
- Look at "Análisis Recientes" list
- Verify each item shows:
  - Relative time (e.g., "hace 2h") on the first line
  - Exact date + time (e.g., "18 de mayo · 14:30") on the second line, in gray
- Expected: Two-line date display, second line smaller and grayed out

- [ ] **Step 3: Test ring progress clarity**

- Look at the hero card (SALUD DEL CULTIVO section)
- Verify the large ring (80px) is sharp and not blurry
- Look at the analysis list items
- Verify the small rings (44px) in each item are sharp and not blurry
- Verify there's a subtle shadow effect around the rings
- Expected: Crisp, clean rendering with no blur effect

- [ ] **Step 4: Test error handling (offline)**

**Simulate offline:**
- Kill the backend (`fruit-backend` service) or toggle device airplane mode
- Force refresh (pull-to-refresh if available, or restart the app)
- Verify hero card shows "Sin conexión" + "Verifica tu internet" + "Reintentar" button
- Verify analysis list shows same error state with "Reintentar" button
- Click "Reintentar" button
- Expected: Loading state briefly, then either data loads (if backend is back) or error state reappears

- [ ] **Step 5: Commit test results**

```bash
git add -A
git commit -m "test(home): manual verification of UI improvements"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1-2: Dates (two-line display with relative + exact)
- ✅ Task 3: Ring clarity (removed blur, added shadow)
- ✅ Task 4-5: Error handling (simple messages + retry button in both hero card and list)
- ✅ Task 6: Manual testing

**Placeholder scan:**
- No TBD, TODO, or incomplete sections
- All code is complete and exact
- All commands are exact with expected outputs

**Type consistency:**
- `GetAnalysesEvent` used consistently in Tasks 4-5
- `_formatExactDate()` helper defined once in Task 1, used in Task 2
- Color constants (`AppTheme.rubus`, `AppTheme.danger`) match existing theme

**No gaps found.**
