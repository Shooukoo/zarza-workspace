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
