# Dependencias pendientes

Estado de las dependencias que la estructura de paquetes necesita.

## Ya en el build

Declaradas en `gradle/libs.versions.toml` y conectadas a `shared` desde la Fase 0: Koin, Ktor Client (con WebSockets y Auth), kotlinx.serialization, kotlinx.coroutines, kotlinx-datetime, Navigation Compose, DataStore Preferences, Room con KSP y SQLite empaquetado, Coil 3 y Play Services Location. Todas se resuelven con Kotlin 2.4.20 y AGP 9.4.1, y todas son la última versión estable publicada el 2026-10-09 salvo la indicada abajo. (Las entradas del catálogo anteriores a la Fase 0, por ejemplo `material3 = 1.12.0-alpha03`, no entran en esta afirmación.)

Solo `koin-core`, `koin-compose` y `koin-android` tienen código que los usa. Las demás están resueltas y empaquetadas en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa.

## Versiones que no son la última estable

| Librería | Versión | Motivo |
|----------|---------|--------|
| kotlinx-datetime | `0.8.0-0.6.x-compat` | Ktor 3.6.0 (`ktor-openapi-schema`) arrastra esa variante en runtime. Pidiendo la 0.8.0 normal, la compilación de Android usaba un artefacto y el IDE, el runtime e iOS otro. |

**Regla para fechas.** Usar `kotlin.time.Instant` y `kotlin.time.Clock`. No importar `kotlinx.datetime.Instant` ni `kotlinx.datetime.Clock`: la variante compat todavía los trae, pero están en desuso y desaparecen al volver a la variante normal. `LocalDateTime`, `TimeZone` y las conversiones de `kotlinx.datetime` se usan con normalidad.

## Pendientes

| Dependencia | Cuándo | Motivo |
|-------------|--------|--------|
| Firebase BoM, Firebase Messaging y plugin de Google Services | Fase 6 | Exigen un `google-services.json` por `applicationId` (son tres: `com.rubusai.app`, `.dev` y `.stg`) |
| `kotlinx-coroutines-test`, `ktor-client-mock`, `koin-test`, `room-testing` | Con el primer test que las necesite | Son las únicas resoluciones del roadmap sin validar contra este toolchain |
| Trabajo en segundo plano para la sincronización (WorkManager) | Sin fecha | Mejora posible, fuera del roadmap |

## Qué hacer al usar cada librería por primera vez

- **Ktor (sub-proyecto de red).** `EnvConfig.apiBaseUrl` no termina en `/`. Al configurarla como base hay que añadirla (`url("${envConfig.apiBaseUrl}/")`) y pedir rutas relativas sin barra inicial; de lo contrario `auth/login` se resuelve como `/api/auth/login`. Añadir un test que fije una URL resuelta completa. El `Logger` por defecto no encuentra un proveedor de SLF4J en Android y no imprime nada. `Logger.ANDROID` solo existe en `androidMain`, no en `commonMain`: crear el `HttpClient` con un `Logger` que cada plataforma aporte desde su módulo de Koin (en Android, `Logger.ANDROID`). El permiso `INTERNET` ya llega al manifiesto fusionado de todos los flavors, pero solo de forma transitiva (lo declara `okhttp-android`, dependencia de `ktor-client-okhttp`): declararlo explícitamente en `androidApp/src/main/AndroidManifest.xml` para no depender de eso.
- **Almacenamiento de la sesión (sub-proyecto de red).** `androidApp/src/main/AndroidManifest.xml` tiene `android:allowBackup="true"`, heredado de la plantilla. Decidir qué se hace con él antes de guardar tokens o datos en DataStore; si no, entran en la copia de seguridad automática de Android.
- **Room (Fase 3).** Commitear `shared/schemas/` cuando aparezca con la primera `@Database`; hace falta para las migraciones. Añadir `-Xexpect-actual-classes` en `kotlin { compilerOptions { freeCompilerArgs.add("-Xexpect-actual-classes") } }` de `shared/build.gradle.kts`, porque el `expect object ... : RoomDatabaseConstructor` que pide Room emite un aviso de clases `expect`/`actual` en beta.
- **Koin.** Los módulos vacíos de `core/di/AppModule.kt` son `val` de nivel superior. Cuando `networkModule` o `databaseModule` tengan `single` reales, convertirlos en funciones como `configModule` si hay que cargar el grafo en más de una aplicación de Koin a la vez (tests en paralelo). En cualquier test que arranque Koin con `initKoin`, parar el contexto con `stopKoin()` en un `@AfterTest`: el contexto global se registra antes de ejecutar la declaración.
- **Pantallas nuevas.** No copiar de la pantalla provisional de `App.kt` el `koinInject` en la raíz ni el texto fijo en el código: usar ViewModels con `koinViewModel()` y los recursos de Compose.

## Antes del primer release (Fase 8)

- Desactivar la variante `devRelease`: hoy existe y permite HTTP sin cifrar.
- Quitar `ui-tooling` de las variantes release: hoy entra en todas por `implementation(libs.compose.uiTooling)` en `androidMain` y por `androidRuntimeClasspath(libs.compose.uiTooling)`, ambos en `shared/build.gradle.kts`. Al quitarlo, volver a añadir `debugImplementation(libs.compose.uiTooling)` en `androidApp/build.gradle.kts` para no perder las previews en debug.
- Repartir las librerías nativas por ABI (`libsqliteJni.so` pesa alrededor de 1,2 MB por ABI).
- Al activar R8, comprobar las reglas de kotlinx.serialization, Ktor y Room, y que `Environment.valueOf` sigue funcionando.

## Sin verificar

- **iOS.** Nada de `iosMain` ni `iosApp/iosApp/iOSApp.swift` se ha compilado: la máquina de desarrollo es Linux. Solo está comprobado que las dependencias de iOS se resuelven. Hay que compilar el framework en un Mac al cerrar la Fase 0. Cuando el cliente HTTP haga su primera llamada en `DEV`, `Info.plist` necesitará `NSAppTransportSecurity` con `NSAllowsLocalNetworking`, y un iPhone físico necesitará la IP del Mac en la LAN en lugar de `127.0.0.1`.
- **Ejecución en un dispositivo Android.** El arranque y la pantalla provisional se probaron en la JVM con una prueba puntual de Robolectric (API 35) sobre los tres flavors, que no quedó en el repositorio. Falta abrir `devDebug` en un emulador o teléfono real.

## Decisiones abiertas

- Si se añade al repositorio una prueba de humo con Robolectric que arranque `MainActivity` en cada flavor. Hoy esa comprobación solo se ejecutó una vez, fuera del repositorio; añadirla trae Robolectric y `ui-test-junit4` como dependencias de test de `androidApp`.
