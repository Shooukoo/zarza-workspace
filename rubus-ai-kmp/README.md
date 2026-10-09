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

Dentro de `shared/src/commonMain/kotlin/<paquete base>/`. Las carpetas se crean cuando llega su primer archivo.

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

- Android app: `./gradlew :androidApp:assembleDebug`
- iOS app: open the [/iosApp](./iosApp) directory in Xcode and run it from there.

### Running tests

Use the run button in your IDE's editor gutter, or run tests using Gradle tasks:

- Android tests: `./gradlew :shared:testAndroidHostTest`
- iOS tests: `./gradlew :shared:iosSimulatorArm64Test`

---

Learn more about [Kotlin Multiplatform](https://www.jetbrains.com/help/kotlin-multiplatform-dev/get-started.html)…