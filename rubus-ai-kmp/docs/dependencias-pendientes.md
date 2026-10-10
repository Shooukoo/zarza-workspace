# Dependencias pendientes

Estado de las dependencias que la estructura de paquetes necesita.

## Ya en el build

Declaradas en `gradle/libs.versions.toml` y conectadas a `shared` desde la Fase 0: Koin, Ktor Client (con WebSockets y Auth), kotlinx.serialization, kotlinx.coroutines, kotlinx-datetime, Navigation Compose, DataStore Preferences, Room con KSP y SQLite empaquetado, Coil 3 y Play Services Location. Todas se resuelven con Kotlin 2.4.20 y AGP 9.4.1, y todas son la última versión estable publicada el 2026-10-09 salvo la indicada abajo.

Solo Koin tiene código que lo usa. Las demás están resueltas y empaquetadas en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa.

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

- **Ktor (sub-proyecto de red).** `EnvConfig.apiBaseUrl` no termina en `/`. Al configurarla como base hay que añadirla (`url("${envConfig.apiBaseUrl}/")`) y pedir rutas relativas sin barra inicial; de lo contrario `auth/login` se resuelve como `/api/auth/login`. Añadir un test que fije una URL resuelta completa. En Android, usar `Logger.ANDROID` o un `Logger` propio: el de por defecto no encuentra un proveedor de SLF4J y no imprime nada. Falta también el permiso `INTERNET` en el manifiesto.
- **Room (Fase 3).** Commitear `shared/schemas/` cuando aparezca con la primera `@Database`; hace falta para las migraciones. Añadir `-Xexpect-actual-classes` a las opciones del compilador de `shared`, porque el constructor `expect object` de Room emite un aviso de clases `expect`/`actual` en beta.
- **Koin.** Los módulos vacíos de `core/di/AppModule.kt` son `val` de nivel superior. Cuando `networkModule` o `databaseModule` tengan `single` reales, convertirlos en funciones como `configModule` si hay que cargar el grafo en más de una aplicación de Koin a la vez (tests en paralelo).
- **Pantallas nuevas.** No copiar de la pantalla provisional de `App.kt` el `koinInject` en la raíz ni el texto fijo en el código: usar ViewModels con `koinViewModel()` y los recursos de Compose.

## Antes del primer release (Fase 8)

- Desactivar la variante `devRelease`: hoy existe y permite HTTP sin cifrar.
- Quitar `ui-tooling` del classpath de runtime de `shared` (`androidRuntimeClasspath(libs.compose.uiTooling)` en `shared/build.gradle.kts`), que hoy entra en todas las variantes.
- Repartir las librerías nativas por ABI (`libsqliteJni.so` pesa alrededor de 1,2 MB por ABI).
- Al activar R8, comprobar las reglas de kotlinx.serialization, Ktor y Room, y que `Environment.valueOf` sigue funcionando.

## Sin verificar

- **iOS.** Nada de `iosMain` ni `iosApp/iosApp/iOSApp.swift` se ha compilado: la máquina de desarrollo es Linux. Solo está comprobado que las dependencias de iOS se resuelven. Hay que compilar el framework en un Mac al cerrar la Fase 0. Cuando el cliente HTTP haga su primera llamada en `DEV`, `Info.plist` necesitará `NSAppTransportSecurity` con `NSAllowsLocalNetworking`, y un iPhone físico necesitará la IP del Mac en la LAN en lugar de `127.0.0.1`.
- **Ejecución en un dispositivo Android.** El arranque y la pantalla provisional se probaron en la JVM con una prueba puntual de Robolectric (API 35) sobre los tres flavors, que no quedó en el repositorio. Falta abrir `devDebug` en un emulador o teléfono real.
