# Flavors de entorno (dev/staging/prod) en zarza_ai — Diseño

**Fecha:** 2026-07-09
**Servicio:** `zarza_ai` (Flutter)
**Estado:** Aprobado

## Problema

Las URLs del backend y del WebSocket en `AppConstants` dependen de pasar manualmente
`--dart-define=SERVER_HOST=...` e `IS_DEV` al compilar. No hay separación real de
entornos: es posible compilar por error una build de desarrollo apuntando a
producción (o viceversa), y no existe una build de staging confiable.

## Decisiones tomadas

- **Enfoque:** flavors nativos de Android + resolución en Dart vía la constante
  `appFlavor` (Flutter ≥ 3.16, `package:flutter/services.dart`). Un solo flag
  (`--flavor`) determina entorno, applicationId y URLs; no hay segundo flag que
  pueda quedar desincronizado. Se descartó `--dart-define-from-file` por
  reintroducir el error humano de dos flags que deben coincidir.
- **applicationId con sufijo por flavor:** las tres variantes coexisten
  instaladas en el mismo dispositivo.
- **Entornos reales:** hoy solo existe dev. Staging y prod usan URLs placeholder
  claramente marcadas, a rellenar cuando esos backends se desplieguen.
- **iOS:** el proyecto no tiene carpeta `ios/` (plataformas actuales: android,
  web, windows). Los schemes iOS quedan fuera de alcance; se documenta que al
  agregar iOS habrá que crear los schemes espejo de estos flavors.

## Diseño

### 1. Flavors Android (`zarza_ai/android/app/build.gradle.kts`)

Dimensión única `env` con tres product flavors:

| Flavor | applicationId | app_name |
|--------|--------------|----------|
| `dev` | `com.example.rubus_ai.dev` | RubusAI Dev |
| `staging` | `com.example.rubus_ai.stg` | RubusAI Stg |
| `prod` | `com.example.rubus_ai` (sin sufijo) | RubusAI |

Cada flavor define `resValue("string", "app_name", ...)` y el
`AndroidManifest.xml` cambia `android:label="RubusAI"` por
`android:label="@string/app_name"`, para distinguir las apps instaladas.

### 2. Config Dart

Nueva clase en `lib/core/config/env_config.dart`:

- `enum Environment { dev, staging, prod }` resuelto desde `appFlavor`.
  `appFlavor == null` → `dev` (cubre `flutter test`, web y Windows, que no
  soportan `--flavor`).
- `EnvConfig` expone `baseUrl` y `wsUrl` por entorno:
  - **dev:** comportamiento actual — `http://<host>:3001` / `ws://<host>:3001/ws`,
    con host desde `--dart-define=SERVER_HOST` o default por plataforma
    (Android → `10.0.2.2`, resto → `127.0.0.1`). El override `SERVER_HOST`
    **solo** tiene efecto en dev.
  - **staging:** `https://staging.api.zarza.example` / `wss://.../ws` (placeholder).
  - **prod:** `https://api.zarza.example` / `wss://.../ws` (placeholder).

`AppConstants.baseUrl` y `AppConstants.wsUrl` conservan su firma y delegan en
`EnvConfig`; ningún call site cambia. El define `IS_DEV` desaparece.

### 3. Firebase (prerrequisito manual)

`google-services.json` hoy solo registra `com.example.rubus_ai`. Las builds de
`dev` y `staging` **fallarán** hasta registrar `com.example.rubus_ai.dev` y
`com.example.rubus_ai.stg` como apps Android adicionales en el mismo proyecto
Firebase y reemplazar `google-services.json` por el que incluye los tres
clients. Paso de consola Firebase a cargo del usuario; queda documentado en el
README. La build `prod` no se ve afectada.

### 4. Documentación

- `zarza_ai/README.md`: comandos por flavor (`flutter run --flavor dev`,
  `flutter build apk --flavor prod`), override LAN con `SERVER_HOST`, paso de
  Firebase, y nota sobre iOS pendiente.
- `.vscode/launch.json` (nuevo): tres configuraciones de lanzamiento, una por
  flavor.

### 5. Verificación

- `flutter test` pasa sin cambios (`appFlavor` null → dev).
- `flutter build apk --flavor prod --debug` como smoke build.
- `dev`/`staging` compilan tras completar el paso de Firebase.

## Fuera de alcance

- Schemes/configurations de iOS (no existe el proyecto iOS).
- Despliegue de backends de staging/producción y sus URLs reales.
- Firma de release por flavor (el `signingConfig` sigue siendo el de debug,
  como hasta ahora).
