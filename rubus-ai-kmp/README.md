This is a Kotlin Multiplatform project targeting Android, iOS.

* [/iosApp](./iosApp/iosApp) contains an iOS application. Even if you’re sharing your UI with Compose Multiplatform,
  you need this entry point for your iOS app. This is also where you should add SwiftUI code for your project.

* [/shared](./shared/src) is for code that will be shared across your Compose Multiplatform applications.
  It contains several subfolders:
  - [commonMain](./shared/src/commonMain/kotlin) is for code that’s common for all targets.
  - Other folders are for Kotlin code that will be compiled for only the platform indicated in the folder name.
    For example, if you want to use Apple’s CoreCrypto for the iOS part of your Kotlin app,
    the [iosMain](./shared/src/iosMain/kotlin) folder would be the right place for such calls.
    Similarly, if you want to edit the Desktop (JVM) specific part, the [jvmMain](./shared/src/jvmMain/kotlin)
    folder is the appropriate location.

### Estructura de paquetes

Dentro de `shared/src/commonMain/kotlin/com/rubusai/app/` (paquete base `com.rubusai.app`). Las carpetas se crean cuando llega su primer archivo.

```
core/
  model/          entidades puras, sin dependencias
  data/           repositorios por dominio de datos: auth, analyses, ingestion,
                  campos, solicitudes, notifications, admin
  domain/         casos de uso que combinan repositorios o tienen lógica propia
  network/        cliente HTTP, DTOs, WebSocket
  database/       base de datos local
  datastore/      preferencias clave-valor
  sync/           cola offline y sincronización
  designsystem/   theme/ y component/
  ui/             composables compartidos que conocen el modelo
  navigation/  platform/  config/  di/  common/
feature/
  splash, auth, home, capture, results, history, queue, solicitudes,
  notifications, profile, admin, help
                  solo UI: pantalla, ViewModel, estado y navegación
```

Reglas de dependencia: `feature` depende de `core` y nunca de otra `feature`; `core/model` no depende de nada.

### Running the apps

Use the run configurations provided by the run widget in your IDE's toolbar. You can also use these commands and options:

- Android app: `./gradlew :androidApp:assembleDevDebug` (o `installDevDebug` para instalarla). La app tiene tres flavors:

  | Flavor | `applicationId` | Nombre visible | Backend |
  |--------|-----------------|----------------|---------|
  | `dev` | `com.rubusai.app.dev` | Rubus AI (dev) | `http://<host>:3001`, HTTP sin cifrar permitido |
  | `staging` | `com.rubusai.app.stg` | Rubus AI (stg) | `https://staging.api.zarza.example` (marcador) |
  | `prod` | `com.rubusai.app` | Rubus AI | `https://api.zarza.example` (marcador) |

  - `assembleDebug` e `installDebug` sin flavor siguen existiendo, pero construyen o instalan los tres a la vez. Las tres apps pueden convivir instaladas.
  - Los APK quedan en `androidApp/build/outputs/apk/<flavor>/<buildType>/`.
  - En Android Studio el flavor activo se elige en *Build Variants* (por defecto `devDebug`).
  - En `dev` el host del backend es `10.0.2.2` (el equipo visto desde el emulador). Para un teléfono físico, añadir
    `rubus.devHost=<IP del equipo en la LAN>` a `local.properties`. Debe ser solo un host o una IPv4, sin esquema, puerto ni
    comillas; cualquier otra cosa detiene el build con un mensaje. El backend tiene que escuchar en `0.0.0.0:3001`.
  - El arranque está en `RubusApplication`: lee el flavor de `BuildConfig` y llama a `startKoinAndroid`. Un entorno
    desconocido o un host vacío en `dev` hacen fallar el arranque a propósito.
- iOS app: open the [/iosApp](./iosApp) directory in Xcode and run it from there. Todavía sin compilar en este proyecto; ver la sección «Sin verificar» de [docs/dependencias-pendientes.md](./docs/dependencias-pendientes.md).

### Running tests

Use the run button in your IDE's editor gutter, or run tests using Gradle tasks:

- Android tests: `./gradlew :shared:testAndroidHostTest`
- iOS tests: `./gradlew :shared:iosSimulatorArm64Test`

---

Learn more about [Kotlin Multiplatform](https://www.jetbrains.com/help/kotlin-multiplatform-dev/get-started.html)…