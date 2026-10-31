# Dependencias pendientes

Estado de las dependencias que la estructura de paquetes necesita.

## Ya en el build

Declaradas en `gradle/libs.versions.toml` y conectadas a `shared` desde la Fase 0: Koin, Ktor Client (con WebSockets y Auth), kotlinx.serialization, kotlinx.coroutines, kotlinx-datetime, Navigation Compose y DataStore Preferences. Todas se resuelven con Kotlin 2.4.20 y AGP 9.4.1, y todas son la última versión estable publicada el 2026-10-09 salvo la indicada abajo. (Las entradas del catálogo anteriores a la Fase 0, por ejemplo `material3 = 1.12.0-alpha03`, no entran en esta afirmación.)

Tienen código que las usa: Koin (`koin-core`, `koin-compose`, `koin-android`), Ktor Client (`core`, `content-negotiation`, `serialization-kotlinx-json`, `auth`, `logging` y los motores OkHttp y Darwin), kotlinx.serialization, kotlinx.coroutines, DataStore Preferences, Navigation Compose (`RubusNavHost`) y `compose-components-resources` (la fuente Lexend). Las demás (WebSockets de Ktor y kotlinx-datetime) están resueltas y empaquetadas en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa.

De test, en `commonTest`: `ktor-client-mock` y `kotlinx-coroutines-test`. En `androidDeviceTest`: `androidx.test.ext:junit` y `espresso-core` (este último solo porque arrastra `androidx.test:runner`). En `androidHostTest`: Robolectric 4.16, `ui-test-junit4` y `ui-test-manifest`, para los tests de UI en la JVM (ver más abajo).

## Quitadas del build el 2026-10-27

Room, KSP, SQLite empaquetado, Coil 3 y Play Services Location no tenían código que las usara y costaban APK y tiempo de build (Room corría KSP en tres destinos sin ninguna `@Database`). Se vuelven a añadir con su fase (Coil y Location en la 2, Room y KSP en la 3, según el roadmap) en `libs.versions.toml`, `shared/build.gradle.kts` y, para Room, los plugins `ksp` y `room` con `room { schemaDirectory(...) }`. Las últimas versiones resueltas contra Kotlin 2.4.20 y AGP 9.4.1 el 2026-10-09 fueron: Room 2.8.5, SQLite 2.7.1, KSP 2.3.12, Coil 3.6.3 y Play Services Location 21.4.0; comprobar que sigan siendo la última estable.

## Versiones que no son la última estable

| Librería | Versión | Motivo |
|----------|---------|--------|
| kotlinx-datetime | `0.8.0-0.6.x-compat` | Ktor 3.6.0 (`ktor-openapi-schema`) arrastra esa variante en runtime. Pidiendo la 0.8.0 normal, la compilación de Android usaba un artefacto y el IDE, el runtime e iOS otro. |

**Regla para fechas.** Usar `kotlin.time.Instant` y `kotlin.time.Clock`. No importar `kotlinx.datetime.Instant` ni `kotlinx.datetime.Clock`: la variante compat todavía los trae, pero están en desuso y desaparecen al volver a la variante normal. `LocalDateTime`, `TimeZone` y las conversiones de `kotlinx.datetime` se usan con normalidad.

## Pendientes

| Dependencia | Cuándo | Motivo |
|-------------|--------|--------|
| Firebase BoM, Firebase Messaging y plugin de Google Services | Fase 6 | Exigen un `google-services.json` por `applicationId` (son tres: `com.rubusai.app`, `.dev` y `.stg`) |
| `koin-test` | Con el primer test que las necesite | Son las únicas resoluciones del roadmap sin validar contra este toolchain |
| Proteger `POST auth/logout` del backend con `JwtAuthGuard` (o un guard opcional que rellene `request.user` sin rechazar) | Fase 6 | Hoy la ruta no tiene guard (el único `APP_GUARD` es `ThrottlerGuard`), así que `req.user?.sub` es siempre `undefined` y `clearFcmToken` nunca se ejecuta: el usuario cierra sesión y su teléfono sigue recibiendo push. El cliente KMP llama al logout con `bestEffort`. El orden del cliente (llamar al backend antes de borrar la sesión local) sigue siendo correcto, porque el logout revoca el refresh token |
| Trabajo en segundo plano para la sincronización (WorkManager) | Sin fecha | Mejora posible, fuera del roadmap |

## Qué hacer al usar cada librería por primera vez

- **Peticiones HTTP.** Inyectar el `HttpClient` de Koin y pedir rutas relativas sin barra inicial (`client.get("analyses")`); con barra, Ktor descarta el `/api/v1` de la URL base. El cliente lanza `ResponseException` ante cualquier respuesta que no sea 2xx; no mostrar su `message` en pantallas reales, porque incluye el cuerpo de la respuesta. No crear otros `HttpClient`: el refresh de token solo está en este. El `Bearer` solo viaja a la API (mismo esquema, host y puerto que la URL base, bajo `/api/v1/`): una URL absoluta a otro host, como las firmadas de las imágenes, sale sin token y un 401 suyo no dispara refresh. Las peticiones sin cuerpo salen sin `Content-Type`, porque Fastify responde 400 a un cuerpo vacío declarado como JSON.
- **Sesión (fase 1).** `SecureTokenStorage` es la única fuente de verdad de los tokens y el cliente los lee en cada petición: tras el login basta con `save(...)` y en el logout con `clear()`. Escuchar `SessionEvents.expired` para llevar al usuario al login cuando el backend rechaza el refresh. El aviso no se repite a quien se suscribe después: hay que escucharlo desde un ámbito que viva lo mismo que la app y, al arrancar o volver a primer plano, comprobar además si `read()` devuelve `null`. Las peticiones a `auth/login` y `auth/refresh` no llevan `Bearer` ni disparan refresh; `auth/logout` y `auth/me` sí. `UserRole.fromApi` lanza `IllegalArgumentException` ante un rol desconocido: el mapper del DTO debe convertirlo en un error de dominio.
- **Red local en Android 17.** Con `targetSdk` 37, Android 17 bloquea en silencio (timeout, no "connection refused") las conexiones a IPs privadas (`10.0.2.2`, la LAN) si la app no tiene `ACCESS_LOCAL_NETWORK`. Está declarado solo en `androidApp/src/dev/AndroidManifest.xml`; `staging` y `prod` usan hosts públicos y no lo necesitan. Es un permiso de ejecución: tras instalar, concederlo con `adb shell pm grant com.rubusai.app.dev android.permission.ACCESS_LOCAL_NETWORK`. `MainActivity` lo pide al arrancar el flavor `dev` (Fase 1); que el diálogo aparezca en el primer arranque está sin verificar en emulador.
- **Tests de red.** Usar `mockEngine { }` y `clientFixture(...)` de `core/network/NetworkTestSupport.kt` y no `MockEngine { }` directamente: así los handlers y `HttpTimeout` corren en el tiempo virtual de `runTest` y los tests son deterministas. Los tests que usan `UnconfinedTestDispatcher` o `runCurrent` llevan `@OptIn(ExperimentalCoroutinesApi::class)` en la clase.
- **Room (Fase 3), al volver a añadirlo.** Commitear `shared/schemas/` cuando aparezca con la primera `@Database`; hace falta para las migraciones. Añadir `-Xexpect-actual-classes` en `kotlin { compilerOptions { freeCompilerArgs.add("-Xexpect-actual-classes") } }` de `shared/build.gradle.kts`, porque el `expect object ... : RoomDatabaseConstructor` que pide Room emite un aviso de clases `expect`/`actual` en beta.
- **Koin.** `networkModule()` y los módulos de plataforma (`androidPlatformModule()`, `iosPlatformModule()`) ya son funciones, porque contienen instancias. Los módulos de base de datos, repositorios y ViewModels se quitaron de `core/di/AppModule.kt` por estar vacíos: añadirlos a `appModules` con su fase, como funciones y no como `val`, porque contendrán `single`. Cada módulo de plataforma debe aportar `HttpClientEngine`, el `Logger` de Ktor y `SecureTokenStorage`. En cualquier test que arranque Koin con `initKoin`, parar el contexto con `stopKoin()` en un `@AfterTest`: el contexto global se registra antes de ejecutar la declaración. En Android no se puede parar y volver a arrancar Koin en el mismo proceso sin más: el DataStore de la sesión solo admite una instancia por archivo.
- **Pantallas nuevas.** No copiar de las pantallas de `dev` (`DiagnosticoScreen`) el `koinInject` en la raíz ni el texto fijo en el código: usar ViewModels con `koinViewModel()` y los recursos de Compose. `App` lo usa solo para leer el entorno.
- **Tests de UI.** Decisión de la fase 0: Robolectric 4.16 y `ui-test-junit4`, en `androidHostTest` con `@Config(sdk = [35])` y `androidx.compose.ui.test.junit4.v2.createComposeRule` (el de `junit4.createComposeRule` está en desuso). Robolectric descarga `android-all` en la primera ejecución: una CI sin red lo necesita en caché. Un `BasicTextField` deshabilitado no expone `SetText`, y en un campo de contraseña `onNodeWithText` coincide con el texto sin transformar: comprobar `EditableText`.

## Antes del primer release (Fase 8)

- Desactivar la variante `devRelease`: hoy existe y permite HTTP sin cifrar.
- Quitar `ui-tooling` de las variantes release: hoy entra en todas por `implementation(libs.compose.uiTooling)` en `androidMain` y por `androidRuntimeClasspath(libs.compose.uiTooling)`, ambos en `shared/build.gradle.kts`. Al quitarlo, volver a añadir `debugImplementation(libs.compose.uiTooling)` en `androidApp/build.gradle.kts` para no perder las previews en debug.
- Cuando vuelva SQLite empaquetado (Room, Fase 3): repartir las librerías nativas por ABI (`libsqliteJni.so` pesa alrededor de 1,2 MB por ABI).
- Poner los hosts reales de staging y prod en `EnvConfig` (hoy son `*.api.zarza.example`) y actualizar `EnvConfigTest`: un APK de staging o prod construido antes no llega a ningún backend, y compila igual.
- Antes de subir un build de iOS a TestFlight: `startKoinIos()` arranca siempre en `DEV` con `127.0.0.1`, la sesión vive solo en memoria y `Diagnostico`/`Catalogo` salen en todos los builds. Hace falta el Keychain y el entorno por configuración (Fase 9).
- Al activar R8, comprobar las reglas de kotlinx.serialization, Ktor y Room, y que `Environment.valueOf` sigue funcionando. Ejecutar `assembleRelease` al menos una vez con la minificación activa: hasta ahora ningún build de release se ha minificado.

## Sin verificar

- **iOS.** Las fuentes Kotlin de `iosMain` e `iosTest` sí compilan en Linux con `./gradlew :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64` (comprobado el 2026-10-10). Enlazar el framework y ejecutar la app de iOS o sus tests siguen necesitando macOS, así que `iosApp/iosApp/iOSApp.swift` no se ha compilado. Cuando el cliente HTTP haga su primera llamada en `DEV`, `Info.plist` necesitará `NSAppTransportSecurity` con `NSAllowsLocalNetworking`, y un iPhone físico necesitará la IP del Mac en la LAN en lugar de `127.0.0.1`. Compilar el framework en un Mac queda aplazado hasta tener uno (decidido el 2026-10-27).
- **Ejecución en un dispositivo Android.** Verificado el 2026-10-27 en un emulador Pixel 7 Pro (API 37): el flavor `dev` instala y abre (`App` → `RubusNavHost` → `Splash`). Un teléfono físico y los flavors `staging` y `prod` siguen sin probarse en dispositivo.
- **Lexend y componentes.** Revisados a ojo en el emulador el 2026-10-27 con la pantalla `Catalogo`. Sigue sin comprobarse que `Diagnostico` y `Catalogo` tengan forma de volver en un simulador de iOS (no tienen control de "volver"; en Android basta el botón atrás del sistema).
- **Cifrado de la sesión.** `KeystoreTokenCipherTest` (`shared/src/androidDeviceTest`) pasa en el emulador (5 de 5, 2026-10-27). La CI (`.github/workflows/kmp-tests.yml`) corre `commonTest` y `androidHostTest`, no `androidDeviceTest`. Para repetirlo conviene lanzarlo solo, porque `connectedAndroidDeviceTest` ejecuta también todos los tests de `commonTest` en el dispositivo: `./gradlew :shared:connectedAndroidDeviceTest -Pandroid.testInstrumentationRunnerArguments.class=com.rubusai.app.core.platform.KeystoreTokenCipherTest`.
- **Petición de prueba.** El botón "Probar conexión" de `Diagnostico` (flavor `dev`) muestra "Conectado" contra el backend local desde el emulador (2026-10-27). En Android 17 hizo falta `ACCESS_LOCAL_NETWORK` (ver abajo).
- **Coste de leer la sesión.** El cliente descifra los tokens con el Keystore en cada petición, en el hilo de quien llama. Medirlo en un teléfono de gama baja en la fase 2; si pesa, mover el cifrado a `Dispatchers.Default` dentro de `DataStoreTokenStorage` (envolviendo `read` y `save` enteros, no solo el `try`) o cachear el par en memoria.

## Limitaciones conocidas y decisiones abiertas de la red

Salieron de las revisiones del sub-proyecto de red (2026-10-10). Ninguna impide usar el cliente; todas esperan una decisión.

- **Ráfaga de refrescos tras un fallo transitorio.** Resuelto el 2026-10-28 (Fase 2a): `TokenRefresher` recuerda 5 s que un refresh token falló por red, timeout o 429 y no repite la llamada. A cambio, un reintento manual del usuario dentro de esos 5 s falla sin intentarlo.
- **El refresh no es cancelable** (`nonCancellableRefresh = true`). Es deliberado: si se cortara después de que el backend rote el token, quedaría guardado uno ya gastado y el siguiente refresh revocaría la sesión. Consecuencia: una petición cancelada durante un refresh no termina hasta que termina el refresh (30 s como mucho).
- **Respuesta perdida de un refresh.** Si la petición llega al backend y la respuesta se pierde, el token guardado ya está gastado: el siguiente refresh da 401 y el usuario vuelve a iniciar sesión. Desde el cliente no hay nada mejor que hacer; lo evitaría una ventana de gracia en el backend.
- **Fallos del Keystore.** `DataStoreTokenStorage.read()` borra lo guardado ante cualquier fallo de descifrado, como pide la spec. El Keystore de Android da errores pasajeros en algunos dispositivos y `read()` se llama en cada petición, así que uno solo cerraría la sesión. Además, si la entrada de la clave existe pero quedó inutilizable, `save()` fallaría siempre hasta borrar los datos de la app. Propuesta de las revisiones, sin aplicar porque cambia la spec y no se puede probar sin dispositivo: reintentar una vez el descifrado, borrar solo ante fallos permanentes (etiqueta GCM inválida, dato corto, Base64 o JSON ilegibles) y regenerar la clave al cifrar si la guardada no sirve. Si `save()` lanza después de que el backend ya rotó el refresh token (p. ej. `ProviderException`), la excepción sale de `refreshTokens`, el storage conserva el par viejo y el siguiente refresh recibe 401 (`Rejected`), lo que cierra la sesión; si el backend revoca la familia de tokens por reutilización, se pierde igual.
- **Ventana entre `read()` y `clear()` al rechazar el refresh.** Si un login guarda un par justo entre esas dos llamadas, se borraría. Es una ventana mínima; el puerto no tiene compare-and-clear (solución futura si hace falta).
- **`isAuthRoute` compara por prefijo.** `auth/login` y `auth/refresh` se reconocen con `startsWith`, como dice la spec. Si el backend añadiera una ruta como `auth/login-history`, saldría sin `Bearer`. Hoy ninguna ruta choca.
- **Transferencia entre dispositivos.** `allowBackup="false"` no desactiva la transferencia de dispositivo a dispositivo en Android 12 o superior. Es inofensivo: la sesión transferida no se puede descifrar y `read()` la descarta. Si se quiere excluir del todo, añadir `android:dataExtractionRules` excluyendo `datastore/session.preferences_pb`.
- **Sin timeout de socket.** `HttpTimeout` fija conexión (10 s) y petición (30 s), pero no el de socket: un servidor que acepta y no responde corta a los 10 s por el valor por defecto de OkHttp, y en Darwin puede ser otro. Fijar `socketTimeoutMillis` cuando lleguen las subidas (fase 2).
- **R8 desactivado.** Los builds de release no se minifican. Al activarlo, revisar las reglas para kotlinx.serialization, Ktor (`Logger.ANDROID` busca `android.util.Log` por reflexión) y SLF4J.

## Decisiones abiertas

Pendientes menores de las revisiones de la fase 0. Ninguno bloquea la fase 1; resolverlos al tocar el código afectado.

- `RubusTextField` usa `MaterialTheme.shapes.large`, mientras que el botón y la tarjeta usan `RubusDimens`.
- `Route` es público y se exporta al framework de iOS: marcarlo `internal` si iOS no lo necesita.

## Limitaciones conocidas de la sesión (Fase 1)

Salieron de las revisiones de la Fase 1. Ninguna impide usar el login; esperan decisión o su fase.

- **Logout con el access token vencido (latente).** Hoy no ocurre: la ruta de logout del backend no tiene guard, así que nunca responde 401 ni dispara un refresh. Aparecerá cuando el backend la proteja (ver el pendiente de la Fase 6 en la tabla de pendientes): la petición de `auth/logout` tiene un tiempo de 5 s, pero el refresh del 401 puede añadir hasta 30 s.
- **Aviso "Tu sesión expiró" que puede no salir.** Si la expiración ocurre durante el `fetchMe` del caso "tokens sin usuario", el aviso puede no mostrarse.
- **`expired` rezagado durante un login.** Un `SessionEvents.expired` emitido justo antes puede llegar mientras se hace un login (ventana estrecha).
- **`fetchMe` nulo en "tokens sin usuario".** Borra la sesión incluso ante un fallo pasajero; lo sanciona el spec.
- **`read()` nulo durante un refresh.** Si `read()` devuelve `null` por un descifrado fallido mientras se refresca, no se distingue de un logout y se descarta el par renovado.

## Pendientes menores de la Fase 1

- `RubusButton` usa `maxLines = 1` y recorta textos largos a escala 2.0 (design system, Fase 4).
- `RubusNavHost` usa `destination::class.qualifiedName` como clave de `rememberSaveable`. Si se activa R8/minify, usar `destination.toString()` (hoy `isMinifyEnabled = false`).
- `MainActivity` decide el permiso con `BuildConfig.FLAVOR != "dev"` y un `37` literal: preferible `BuildConfig.ENVIRONMENT`/`Environment.DEV` y `Build.VERSION_CODES.CINNAMON_BUN`.
- Sin verificar en emulador: que el diálogo de `ACCESS_LOCAL_NETWORK` aparezca en el primer arranque dev, la rotación y la muerte de proceso (`adb shell am kill`), y el flujo completo de login, logout y expiración. iOS solo compila a klib en Linux (sin enlazar ni framework) hasta tener un Mac.
- Deuda menor de tests: `mientrasCargaLaSesionSeVeElSplashYNoHayGrafo` no comprueba la ausencia de grafo (el nombre engaña); los tests de `RubusNavHostTest` y `HomeViewModelTest` crean scopes sin cancelar.

## Pendientes de la Fase 2a

- **Backend: duplicado por `offlineSyncId`.** `POST ingestion/upload` responde 201 siempre y no devuelve 409; `fruit-ms` hace un `create` sobre `Analysis.offlineSyncId` (`@unique`). Un reintento con el mismo id no crea un análisis duplicado, pero corre otra inferencia y termina en la DLQ. Arreglo propuesto: que `fruit-ms` trate la violación de unicidad como éxito idempotente (ack sin reintentar). Corregir en la Fase 3 la línea del roadmap «un 409 del servidor cuenta como éxito».
- **Archivos temporales.** Las fotos originales de la cámara y las copias de la galería quedan en `cacheDir/captures/` hasta que pasan 24 h (se purgan al crear la siguiente) o Android limpia la caché. Conservan el EXIF con el GPS.
- **iOS.** `rememberPhotoPicker`, `rememberLocationPermission`, `PhotoPreview`, `ImageCompressor` y `LocationProvider` no tienen implementación real hasta la Fase 9.
- **Elección de campo tras la muerte del proceso.** Se restaura la foto pero no el campo elegido (con varios campos hay que volver a elegirlo).
- **Login en horizontal (Fase 1).** Al rotar, el login queda cortado: se ven correo y etiqueta «Contraseña», y el campo y el botón quedan fuera; no se probó si hace scroll.
- **Menores aceptados sin cambiar.**
  - Límite exacto de 5 s del `TokenRefresher` sin test, y test de ráfaga con reloj real.
  - `Unexpected` para 403/404 y `Success(null)` para un 409 especulativo.
  - Constantes públicas en commonMain y `ByteArray` entero en memoria.
  - `loadCampos` concurrente sin cancelar en `onUpload`.
  - Bitmap `decoded` sin reciclar si `createBitmap` lanza OOM, `Dispatchers.Default` para I/O, PNG con transparencia sale con fondo negro.
  - Test de GPS asume que el runner no preconcede permisos.
  - Fallo de la galería indistinguible de «cancelar».
  - Purga y `createTempFile` en el hilo principal.
  - `Saver` explícito en vez de `listOf`, live regions de accesibilidad, `LazyColumn` si crece la lista de campos.
  - El aviso «Imagen enviada.» persiste hasta el siguiente CAPTURAR.
