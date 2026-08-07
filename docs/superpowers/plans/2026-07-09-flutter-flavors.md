# Flavors dev/staging/prod en zarza_ai — Implementation Plan

**Spec relacionado:** [[2026-07-09-flutter-flavors-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Flavors nativos de Android (dev/staging/prod) que determinan applicationId, nombre de app y URLs de backend con un solo flag `--flavor`, eliminando los defines manuales `IS_DEV`/host de producción.

**Architecture:** Los product flavors de Gradle fijan el applicationId y llenan la constante `appFlavor` de Flutter. Una nueva clase `EnvConfig` (Dart) resuelve el entorno desde `appFlavor` y expone `baseUrl`/`wsUrl`; `AppConstants` delega en ella sin cambiar su firma, así ningún call site se toca. `appFlavor == null` (tests, web, windows) cae a dev.

**Tech Stack:** Flutter (Dart SDK ^3.11.1), Gradle Kotlin DSL, `appFlavor` de `package:flutter/services.dart` (disponible desde Flutter 3.16).

**Spec:** `docs/superpowers/specs/2026-07-09-flutter-flavors-design.md`

## Global Constraints

- Todos los comandos `flutter` se ejecutan desde `zarza_ai/` (el proyecto Flutter es un subdirectorio del workspace).
- Nombres de flavor exactos: `dev`, `staging`, `prod` (los usa Gradle Y el switch de Dart — deben coincidir literalmente).
- applicationIds: `com.example.rubus_ai.dev`, `com.example.rubus_ai.stg`, `com.example.rubus_ai` (prod sin sufijo).
- Nombres de app: `RubusAI Dev`, `RubusAI Stg`, `RubusAI`.
- URLs placeholder verbatim: staging `https://staging.api.zarza.example`, prod `https://api.zarza.example` (WebSocket: mismo dominio con `wss://` y path `/ws`).
- El override `--dart-define=SERVER_HOST=<ip>` solo tiene efecto en dev.
- Las builds `dev`/`staging` fallarán con "No matching client found" hasta que el usuario registre los nuevos applicationIds en Firebase — es esperado, NO es un bug del plan. `prod` compila siempre.
- No tocar el `signingConfig` (sigue siendo debug, fuera de alcance).
- Windows: git puede avisar de conversión LF→CRLF al commitear — es inofensivo, ignorar.

---

### Task 1: `EnvConfig` — resolución de entorno y URLs (TDD)

**Files:**
- Create: `zarza_ai/lib/core/config/env_config.dart`
- Test: `zarza_ai/test/core/config/env_config_test.dart`

**Interfaces:**
- Consumes: `appFlavor` (const `String?` de `package:flutter/services.dart`).
- Produces: `enum Environment { dev, staging, prod }`; clase `EnvConfig` con:
  - `static Environment environmentFromFlavor(String? flavor)`
  - `static final Environment current`
  - `static String baseUrlFor(Environment env)` / `static String wsUrlFor(Environment env)`
  - `static String get baseUrl` / `static String get wsUrl` (equivalen a `*For(current)`)

  Task 2 depende de `EnvConfig.baseUrl` y `EnvConfig.wsUrl` con exactamente esos nombres.

- [ ] **Step 1: Escribir el test que falla**

Crear `zarza_ai/test/core/config/env_config_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/core/config/env_config.dart';

void main() {
  group('EnvConfig.environmentFromFlavor', () {
    test('null resuelve a dev (flutter test, web, windows)', () {
      expect(EnvConfig.environmentFromFlavor(null), Environment.dev);
    });

    test('cada flavor resuelve a su entorno', () {
      expect(EnvConfig.environmentFromFlavor('dev'), Environment.dev);
      expect(EnvConfig.environmentFromFlavor('staging'), Environment.staging);
      expect(EnvConfig.environmentFromFlavor('prod'), Environment.prod);
    });

    test('flavor desconocido resuelve a dev', () {
      expect(EnvConfig.environmentFromFlavor('qa'), Environment.dev);
    });
  });

  group('URLs por entorno', () {
    test('dev usa http://127.0.0.1:3001 en host de tests', () {
      // En tests Platform.isAndroid es false y no hay SERVER_HOST definido.
      expect(EnvConfig.baseUrlFor(Environment.dev), 'http://127.0.0.1:3001');
      expect(EnvConfig.wsUrlFor(Environment.dev), 'ws://127.0.0.1:3001/ws');
    });

    test('staging usa https/wss con dominio de staging', () {
      expect(
        EnvConfig.baseUrlFor(Environment.staging),
        'https://staging.api.zarza.example',
      );
      expect(
        EnvConfig.wsUrlFor(Environment.staging),
        'wss://staging.api.zarza.example/ws',
      );
    });

    test('prod usa https/wss con dominio de prod', () {
      expect(EnvConfig.baseUrlFor(Environment.prod), 'https://api.zarza.example');
      expect(EnvConfig.wsUrlFor(Environment.prod), 'wss://api.zarza.example/ws');
    });

    test('current es dev bajo flutter test y baseUrl/wsUrl delegan en él', () {
      expect(EnvConfig.current, Environment.dev);
      expect(EnvConfig.baseUrl, EnvConfig.baseUrlFor(Environment.dev));
      expect(EnvConfig.wsUrl, EnvConfig.wsUrlFor(Environment.dev));
    });
  });
}
```

- [ ] **Step 2: Verificar que falla**

Run (desde `zarza_ai/`): `flutter test test/core/config/env_config_test.dart`
Expected: FAIL — error de compilación "Error when reading '.../lib/core/config/env_config.dart': No such file or directory" (o "Target of URI doesn't exist").

- [ ] **Step 3: Implementación mínima**

Crear `zarza_ai/lib/core/config/env_config.dart`:

```dart
import 'dart:io';

import 'package:flutter/services.dart' show appFlavor;

/// Entornos de la app, uno por flavor nativo de Android.
enum Environment { dev, staging, prod }

/// Configuración por entorno resuelta desde el flavor activo (`--flavor`).
///
/// `appFlavor` es null en `flutter test`, web y Windows (plataformas sin
/// soporte de flavors) → caen a [Environment.dev].
class EnvConfig {
  EnvConfig._();

  /// Solo dev: `--dart-define=SERVER_HOST=<ip>` para probar contra un
  /// backend en la LAN desde un dispositivo físico.
  static const String _devHostOverride = String.fromEnvironment('SERVER_HOST');

  static final Environment current = environmentFromFlavor(appFlavor);

  static Environment environmentFromFlavor(String? flavor) {
    switch (flavor) {
      case 'staging':
        return Environment.staging;
      case 'prod':
        return Environment.prod;
      default:
        return Environment.dev;
    }
  }

  static String get baseUrl => baseUrlFor(current);
  static String get wsUrl => wsUrlFor(current);

  static String baseUrlFor(Environment env) {
    switch (env) {
      case Environment.dev:
        return 'http://$_devHost:3001';
      case Environment.staging:
        // Placeholder: reemplazar cuando exista el backend de staging.
        return 'https://staging.api.zarza.example';
      case Environment.prod:
        // Placeholder: reemplazar cuando exista el backend de producción.
        return 'https://api.zarza.example';
    }
  }

  static String wsUrlFor(Environment env) {
    switch (env) {
      case Environment.dev:
        return 'ws://$_devHost:3001/ws';
      case Environment.staging:
        return 'wss://staging.api.zarza.example/ws';
      case Environment.prod:
        return 'wss://api.zarza.example/ws';
    }
  }

  static String get _devHost {
    if (_devHostOverride.isNotEmpty) return _devHostOverride;
    if (Platform.isAndroid) return '10.0.2.2';
    return '127.0.0.1';
  }
}
```

- [ ] **Step 4: Verificar que pasa**

Run (desde `zarza_ai/`): `flutter test test/core/config/env_config_test.dart`
Expected: PASS — "All tests passed!" (7 tests).

- [ ] **Step 5: Commit**

```bash
git add zarza_ai/lib/core/config/env_config.dart zarza_ai/test/core/config/env_config_test.dart
git commit -m "feat(zarza_ai): EnvConfig resuelve entorno y URLs desde appFlavor"
```

---

### Task 2: `AppConstants` delega en `EnvConfig` (elimina `IS_DEV`)

**Files:**
- Modify: `zarza_ai/lib/core/constants/app_constants.dart`
- Test: `zarza_ai/test/core/constants/app_constants_test.dart` (create)

**Interfaces:**
- Consumes: `EnvConfig.baseUrl`, `EnvConfig.wsUrl` (Task 1).
- Produces: `AppConstants.baseUrl` / `AppConstants.wsUrl` (getters `String`, misma firma que hoy — ningún call site cambia); el resto de constantes de `AppConstants` (endpoints, timeouts) quedan intactas.

- [ ] **Step 1: Escribir el test que falla**

Crear `zarza_ai/test/core/constants/app_constants_test.dart`:

```dart
import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/core/config/env_config.dart';
import 'package:zarza_ai/core/constants/app_constants.dart';

void main() {
  test('AppConstants delega baseUrl/wsUrl en EnvConfig', () {
    expect(AppConstants.baseUrl, EnvConfig.baseUrl);
    expect(AppConstants.wsUrl, EnvConfig.wsUrl);
  });

  test('bajo flutter test apunta al backend local de dev', () {
    expect(AppConstants.baseUrl, 'http://127.0.0.1:3001');
    expect(AppConstants.wsUrl, 'ws://127.0.0.1:3001/ws');
  });
}
```

- [ ] **Step 2: Verificar estado inicial**

Run (desde `zarza_ai/`): `flutter test test/core/constants/app_constants_test.dart`
Expected: PASS (la implementación actual ya produce esas URLs bajo test — este test protege la refactorización; el cambio real se verifica en el Step 4 con la suite completa y con `flutter analyze`).

- [ ] **Step 3: Refactorizar `AppConstants`**

Reemplazar el contenido completo de `zarza_ai/lib/core/constants/app_constants.dart` por:

```dart
import '../config/env_config.dart';

/// Central configuration for RubusAI.
///
/// Las URLs dependen del flavor activo (`flutter run --flavor dev|staging|prod`);
/// ver [EnvConfig]. En dev se puede sobreescribir el host con
/// `--dart-define=SERVER_HOST=<ip>` (ej. dispositivo físico en LAN).
class AppConstants {
  AppConstants._();

  static String get baseUrl => EnvConfig.baseUrl;
  static String get wsUrl => EnvConfig.wsUrl;

  // Endpoints
  static const String uploadEndpoint = '/api/v1/ingestion/upload';
  static const String fruitsEndpoint = '/api/v1/fruits';
  static const String solicitudesEndpoint = '/api/v1/solicitudes';

  // Auth endpoints
  static const String loginEndpoint = '/api/v1/auth/login';
  static const String registerEndpoint = '/api/v1/auth/register';
  static const String refreshEndpoint = '/api/v1/auth/refresh';

  // Admin endpoints
  static const String adminUsersEndpoint = '/api/v1/admin/users';
  static const String adminStatsEndpoint = '/api/v1/admin/stats';

  // Upload timeout (analysis can take up to 60 s server-side)
  static const int uploadTimeoutSeconds = 90;
  static const int defaultPageSize = 20;
}
```

(Esto elimina `IS_DEV`, `SERVER_HOST` y la lógica de host de este archivo — ahora viven en `EnvConfig`.)

- [ ] **Step 4: Verificar suite completa y análisis**

Run (desde `zarza_ai/`): `flutter test`
Expected: PASS — todos los tests del proyecto pasan (los tests que fallan por FCM/solicitudes están en `fruit-backend`, no aquí).

Run (desde `zarza_ai/`): `flutter analyze`
Expected: sin errores nuevos (ideal "No issues found!"; si hay avisos preexistentes ajenos a este cambio, ignorarlos). Confirma que ningún call site usaba los símbolos eliminados.

Verificación extra de que nadie más usa los defines viejos:
Run (desde la raíz del workspace): `grep -rn "IS_DEV" zarza_ai/lib zarza_ai/test`
Expected: sin resultados.

- [ ] **Step 5: Commit**

```bash
git add zarza_ai/lib/core/constants/app_constants.dart zarza_ai/test/core/constants/app_constants_test.dart
git commit -m "refactor(zarza_ai): AppConstants delega URLs en EnvConfig y elimina IS_DEV"
```

---

### Task 3: Product flavors en Gradle + label por flavor

**Files:**
- Modify: `zarza_ai/android/app/build.gradle.kts` (bloque `android {}`, tras `buildTypes`)
- Modify: `zarza_ai/android/app/src/main/AndroidManifest.xml:16`

**Interfaces:**
- Consumes: nada de tasks anteriores (Gradle llena `appFlavor` automáticamente al usar `--flavor`; el switch de Dart de Task 1 ya espera los nombres `dev`/`staging`/`prod`).
- Produces: tres variantes instalables con los applicationIds y nombres de la tabla de Global Constraints.

- [ ] **Step 1: Agregar flavors a `build.gradle.kts`**

En `zarza_ai/android/app/build.gradle.kts`, dentro del bloque `android { }`, insertar inmediatamente después del bloque `buildTypes { ... }` (líneas 42-48):

```kotlin
    flavorDimensions += "env"
    productFlavors {
        create("dev") {
            dimension = "env"
            applicationIdSuffix = ".dev"
            resValue("string", "app_name", "RubusAI Dev")
        }
        create("staging") {
            dimension = "env"
            applicationIdSuffix = ".stg"
            resValue("string", "app_name", "RubusAI Stg")
        }
        create("prod") {
            dimension = "env"
            resValue("string", "app_name", "RubusAI")
        }
    }
```

- [ ] **Step 2: Usar el `app_name` por flavor en el manifest**

En `zarza_ai/android/app/src/main/AndroidManifest.xml`, cambiar:

```xml
        android:label="RubusAI"
```

por:

```xml
        android:label="@string/app_name"
```

- [ ] **Step 3: Smoke build del flavor prod**

Run (desde `zarza_ai/`): `flutter build apk --flavor prod --debug`
Expected: termina con `✓ Built build/app/outputs/flutter-apk/app-prod-debug.apk`.

- [ ] **Step 4: Confirmar el fallo esperado de dev (documental, no bloquea)**

Run (desde `zarza_ai/`): `flutter build apk --flavor dev --debug`
Expected: FALLA con `No matching client found for package name 'com.example.rubus_ai.dev'` — este es el prerrequisito de Firebase a cargo del usuario (registrar `com.example.rubus_ai.dev` y `com.example.rubus_ai.stg` en la consola de Firebase y reemplazar `google-services.json`). No intentar arreglarlo en este task; se documenta en Task 4.

- [ ] **Step 5: Commit**

```bash
git add zarza_ai/android/app/build.gradle.kts zarza_ai/android/app/src/main/AndroidManifest.xml
git commit -m "feat(zarza_ai): product flavors dev/staging/prod con applicationId y label propios"
```

---

### Task 4: Documentación y launch configs

**Files:**
- Modify: `zarza_ai/README.md` (reemplazo completo — hoy es el boilerplate de Flutter)
- Create: `.vscode/launch.json` (raíz del workspace; ya está des-ignorado en `.gitignore` línea 24)

**Interfaces:**
- Consumes: los comandos y nombres de flavor de Tasks 1-3.
- Produces: documentación de uso; no expone código.

- [ ] **Step 1: Reescribir `zarza_ai/README.md`**

Reemplazar el contenido completo por:

```markdown
# zarza_ai (RubusAI)

Aplicación Flutter para análisis fenológico de zarzamora con visión artificial.
Parte del workspace Zarza AI (ver `CLAUDE.md` en la raíz del workspace).

## Entornos (flavors)

El entorno se elige con el flag `--flavor` — un solo flag controla el
`applicationId`, el nombre de la app y las URLs de backend/WebSocket
(resueltas en `lib/core/config/env_config.dart` vía `appFlavor`). Las tres
variantes pueden coexistir instaladas en el mismo dispositivo.

| Flavor | applicationId | Nombre | Backend |
|--------|--------------|--------|---------|
| `dev` | `com.example.rubus_ai.dev` | RubusAI Dev | `http://<host>:3001` (local) |
| `staging` | `com.example.rubus_ai.stg` | RubusAI Stg | `https://staging.api.zarza.example` (placeholder) |
| `prod` | `com.example.rubus_ai` | RubusAI | `https://api.zarza.example` (placeholder) |

> Las URLs de staging/prod son placeholders: cuando esos backends se
> desplieguen, actualizar `lib/core/config/env_config.dart`.

## Comandos

```bash
flutter pub get

# Desarrollo (emulador Android → 10.0.2.2, desktop → 127.0.0.1)
flutter run --flavor dev

# Dispositivo físico contra backend en la LAN (override solo válido en dev)
flutter run --flavor dev --dart-define=SERVER_HOST=192.168.100.26

# Staging / producción
flutter run --flavor staging
flutter build apk --flavor prod --release

# Tests (no requieren flavor; sin flavor la app resuelve a dev)
flutter test
```

En VS Code hay una launch config por flavor (`.vscode/launch.json` en la
raíz del workspace).

**Nota:** con flavors definidos, `flutter run` sin `--flavor` falla en
Android — es intencional: obliga a elegir entorno explícitamente. Web y
Windows no soportan `--flavor` y siempre corren como dev.

## Prerrequisito Firebase (dev y staging)

`google-services.json` debe registrar los tres applicationIds. Hasta
entonces, `dev` y `staging` fallan al compilar con
`No matching client found for package name 'com.example.rubus_ai.dev'`.

1. En la consola de Firebase, dentro del proyecto existente, agregar dos
   apps Android: `com.example.rubus_ai.dev` y `com.example.rubus_ai.stg`.
2. Descargar el `google-services.json` actualizado (incluye los tres
   clients) y reemplazar `android/app/google-services.json`.

## iOS

El proyecto no tiene carpeta `ios/`. Al agregar la plataforma, crear
schemes/configurations espejo de estos tres flavors.
```

- [ ] **Step 2: Crear `.vscode/launch.json`**

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "zarza_ai (dev)",
      "request": "launch",
      "type": "dart",
      "cwd": "zarza_ai",
      "program": "lib/main.dart",
      "args": ["--flavor", "dev"]
    },
    {
      "name": "zarza_ai (dev · LAN)",
      "request": "launch",
      "type": "dart",
      "cwd": "zarza_ai",
      "program": "lib/main.dart",
      "args": [
        "--flavor",
        "dev",
        "--dart-define=SERVER_HOST=${input:serverHost}"
      ]
    },
    {
      "name": "zarza_ai (staging)",
      "request": "launch",
      "type": "dart",
      "cwd": "zarza_ai",
      "program": "lib/main.dart",
      "args": ["--flavor", "staging"]
    },
    {
      "name": "zarza_ai (prod)",
      "request": "launch",
      "type": "dart",
      "cwd": "zarza_ai",
      "program": "lib/main.dart",
      "args": ["--flavor", "prod"]
    }
  ],
  "inputs": [
    {
      "id": "serverHost",
      "type": "promptString",
      "description": "IP del backend en la LAN",
      "default": "192.168.100.26"
    }
  ]
}
```

- [ ] **Step 3: Verificar que launch.json queda trackeable**

Run (desde la raíz del workspace): `git check-ignore .vscode/launch.json`
Expected: exit code 1, sin salida (NO está ignorado; la línea 24 del `.gitignore` lo des-ignora explícitamente).

- [ ] **Step 4: Commit**

```bash
git add zarza_ai/README.md .vscode/launch.json
git commit -m "docs(zarza_ai): documentar flavors, prerrequisito Firebase y launch configs"
```
