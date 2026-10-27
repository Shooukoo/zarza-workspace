# Dependencias pendientes

Estado de las dependencias que la estructura de paquetes necesita.

## Ya en el build

Declaradas en `gradle/libs.versions.toml` y conectadas a `shared` desde la Fase 0: Koin, Ktor Client (con WebSockets y Auth), kotlinx.serialization, kotlinx.coroutines, kotlinx-datetime, Navigation Compose, DataStore Preferences, Room con KSP y SQLite empaquetado, Coil 3 y Play Services Location. Todas se resuelven con Kotlin 2.4.20 y AGP 9.4.1, y todas son la última versión estable publicada el 2026-10-09 salvo la indicada abajo. (Las entradas del catálogo anteriores a la Fase 0, por ejemplo `material3 = 1.12.0-alpha03`, no entran en esta afirmación.)

Tienen código que las usa: Koin (`koin-core`, `koin-compose`, `koin-android`), Ktor Client (`core`, `content-negotiation`, `serialization-kotlinx-json`, `auth`, `logging` y los motores OkHttp y Darwin), kotlinx.serialization, kotlinx.coroutines y DataStore Preferences. Las demás (WebSockets de Ktor, kotlinx-datetime, Navigation Compose, Room, Coil, Play Services Location) están resueltas y empaquetadas en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa.

De test, en `commonTest`: `ktor-client-mock` y `kotlinx-coroutines-test`. En `androidDeviceTest`: `androidx.test.ext:junit` y `espresso-core` (este último solo porque arrastra `androidx.test:runner`).

## Versiones que no son la última estable

| Librería | Versión | Motivo |
|----------|---------|--------|
| kotlinx-datetime | `0.8.0-0.6.x-compat` | Ktor 3.6.0 (`ktor-openapi-schema`) arrastra esa variante en runtime. Pidiendo la 0.8.0 normal, la compilación de Android usaba un artefacto y el IDE, el runtime e iOS otro. |

**Regla para fechas.** Usar `kotlin.time.Instant` y `kotlin.time.Clock`. No importar `kotlinx.datetime.Instant` ni `kotlinx.datetime.Clock`: la variante compat todavía los trae, pero están en desuso y desaparecen al volver a la variante normal. `LocalDateTime`, `TimeZone` y las conversiones de `kotlinx.datetime` se usan con normalidad.

## Pendientes

| Dependencia | Cuándo | Motivo |
|-------------|--------|--------|
| Firebase BoM, Firebase Messaging y plugin de Google Services | Fase 6 | Exigen un `google-services.json` por `applicationId` (son tres: `com.rubusai.app`, `.dev` y `.stg`) |
| `koin-test`, `room-testing` | Con el primer test que las necesite | Son las únicas resoluciones del roadmap sin validar contra este toolchain |
| Trabajo en segundo plano para la sincronización (WorkManager) | Sin fecha | Mejora posible, fuera del roadmap |

## Qué hacer al usar cada librería por primera vez

- **Peticiones HTTP.** Inyectar el `HttpClient` de Koin y pedir rutas relativas sin barra inicial (`client.get("analyses")`); con barra, Ktor descarta el `/api/v1` de la URL base. El cliente lanza `ResponseException` ante cualquier respuesta que no sea 2xx; no mostrar su `message` en pantallas reales, porque incluye el cuerpo de la respuesta. No crear otros `HttpClient`: el refresh de token solo está en este. El `Bearer` solo viaja a la API (mismo esquema, host y puerto que la URL base, bajo `/api/v1/`): una URL absoluta a otro host, como las firmadas de las imágenes, sale sin token y un 401 suyo no dispara refresh. Las peticiones sin cuerpo salen sin `Content-Type`, porque Fastify responde 400 a un cuerpo vacío declarado como JSON.
- **Sesión (fase 1).** `SecureTokenStorage` es la única fuente de verdad de los tokens y el cliente los lee en cada petición: tras el login basta con `save(...)` y en el logout con `clear()`. Escuchar `SessionEvents.expired` para llevar al usuario al login cuando el backend rechaza el refresh. El aviso no se repite a quien se suscribe después: hay que escucharlo desde un ámbito que viva lo mismo que la app y, al arrancar o volver a primer plano, comprobar además si `read()` devuelve `null`. Las peticiones a `auth/login` y `auth/refresh` no llevan `Bearer` ni disparan refresh; `auth/logout` y `auth/me` sí. `UserRole.fromApi` lanza `IllegalArgumentException` ante un rol desconocido: el mapper del DTO debe convertirlo en un error de dominio.
- **Tests de red.** Usar `mockEngine { }` y `clientFixture(...)` de `core/network/NetworkTestSupport.kt` y no `MockEngine { }` directamente: así los handlers y `HttpTimeout` corren en el tiempo virtual de `runTest` y los tests son deterministas. Los tests que usan `UnconfinedTestDispatcher` o `runCurrent` llevan `@OptIn(ExperimentalCoroutinesApi::class)` en la clase.
- **Room (Fase 3).** Commitear `shared/schemas/` cuando aparezca con la primera `@Database`; hace falta para las migraciones. Añadir `-Xexpect-actual-classes` en `kotlin { compilerOptions { freeCompilerArgs.add("-Xexpect-actual-classes") } }` de `shared/build.gradle.kts`, porque el `expect object ... : RoomDatabaseConstructor` que pide Room emite un aviso de clases `expect`/`actual` en beta.
- **Koin.** `networkModule()` y los módulos de plataforma (`androidPlatformModule()`, `iosPlatformModule()`) ya son funciones, porque contienen instancias. `databaseModule`, `repositoryModule` y `viewModelModule` siguen siendo `val` vacíos en `core/di/AppModule.kt`: convertirlos en funciones cuando tengan `single` reales. Cada módulo de plataforma debe aportar `HttpClientEngine`, el `Logger` de Ktor y `SecureTokenStorage`. En cualquier test que arranque Koin con `initKoin`, parar el contexto con `stopKoin()` en un `@AfterTest`: el contexto global se registra antes de ejecutar la declaración. En Android no se puede parar y volver a arrancar Koin en el mismo proceso sin más: el DataStore de la sesión solo admite una instancia por archivo.
- **Pantallas nuevas.** No copiar de la pantalla provisional de `App.kt` el `koinInject` en la raíz ni el texto fijo en el código: usar ViewModels con `koinViewModel()` y los recursos de Compose.

## Antes del primer release (Fase 8)

- Desactivar la variante `devRelease`: hoy existe y permite HTTP sin cifrar.
- Quitar `ui-tooling` de las variantes release: hoy entra en todas por `implementation(libs.compose.uiTooling)` en `androidMain` y por `androidRuntimeClasspath(libs.compose.uiTooling)`, ambos en `shared/build.gradle.kts`. Al quitarlo, volver a añadir `debugImplementation(libs.compose.uiTooling)` en `androidApp/build.gradle.kts` para no perder las previews en debug.
- Repartir las librerías nativas por ABI (`libsqliteJni.so` pesa alrededor de 1,2 MB por ABI).
- Al activar R8, comprobar las reglas de kotlinx.serialization, Ktor y Room, y que `Environment.valueOf` sigue funcionando.

## Sin verificar

- **iOS.** Las fuentes Kotlin de `iosMain` e `iosTest` sí compilan en Linux con `./gradlew :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64` (comprobado el 2026-10-10). Enlazar el framework y ejecutar la app de iOS o sus tests siguen necesitando macOS, así que `iosApp/iosApp/iOSApp.swift` no se ha compilado. Hay que compilar el framework en un Mac al cerrar la Fase 0. Cuando el cliente HTTP haga su primera llamada en `DEV`, `Info.plist` necesitará `NSAppTransportSecurity` con `NSAllowsLocalNetworking`, y un iPhone físico necesitará la IP del Mac en la LAN en lugar de `127.0.0.1`.
- **Ejecución en un dispositivo Android.** El arranque y la pantalla provisional se probaron en la JVM con una prueba puntual de Robolectric (API 35) sobre los tres flavors, que no quedó en el repositorio. Falta abrir `devDebug` en un emulador o teléfono real.
- **Cifrado de la sesión.** `KeystoreTokenCipherTest` (`shared/src/androidDeviceTest`) compila y está dentro del APK de test, pero no se ha ejecutado: necesita un emulador o un teléfono. La primera vez conviene lanzarlo solo, porque `connectedAndroidDeviceTest` ejecuta también todos los tests de `commonTest` en el dispositivo: `./gradlew :shared:connectedAndroidDeviceTest -Pandroid.testInstrumentationRunnerArguments.class=com.rubusai.app.core.platform.KeystoreTokenCipherTest`.
- **Petición de prueba.** El botón "Probar conexión" de la pantalla provisional no se ha pulsado contra el backend local en un dispositivo. Sí se ha comprobado en la JVM con Robolectric, sustituyendo solo el cifrado del Keystore: la pantalla se dibuja, la petición sale por OkHttp y muestra "Conectado".
- **Coste de leer la sesión.** El cliente descifra los tokens con el Keystore en cada petición, en el hilo de quien llama. Medirlo en un teléfono de gama baja en la fase 2; si pesa, mover el cifrado a `Dispatchers.Default` dentro de `DataStoreTokenStorage` (envolviendo `read` y `save` enteros, no solo el `try`) o cachear el par en memoria.

## Limitaciones conocidas y decisiones abiertas de la red

Salieron de las revisiones del sub-proyecto de red (2026-10-10). Ninguna impide usar el cliente; todas esperan una decisión.

- **Ráfaga de refrescos tras un fallo transitorio.** Si el refresh falla por red, timeout o 429 en un cliente que aún no ha hecho ningún refresh con éxito en ese proceso, cada petición que esperaba repite el refresh, una tras otra: N peticiones hacen N llamadas a `auth/refresh` (limitado a 5 por minuto) y, con timeouts, la última tarda N × 30 s. Salir de la pantalla no las corta, porque el refresh no es cancelable (ver el punto siguiente). La sesión no se pierde y el cliente se recupera solo. Arreglo probado en las revisiones: recordar durante unos segundos que ese token de refresh acaba de fallar y no reintentarlo; a cambio, un reintento manual del usuario dentro de esa ventana fallaría sin intentarlo. Decidir antes de la fase 2.
- **El refresh no es cancelable** (`nonCancellableRefresh = true`). Es deliberado: si se cortara después de que el backend rote el token, quedaría guardado uno ya gastado y el siguiente refresh revocaría la sesión. Consecuencia: una petición cancelada durante un refresh no termina hasta que termina el refresh (30 s como mucho).
- **Respuesta perdida de un refresh.** Si la petición llega al backend y la respuesta se pierde, el token guardado ya está gastado: el siguiente refresh da 401 y el usuario vuelve a iniciar sesión. Desde el cliente no hay nada mejor que hacer; lo evitaría una ventana de gracia en el backend.
- **Fallos del Keystore.** `DataStoreTokenStorage.read()` borra lo guardado ante cualquier fallo de descifrado, como pide la spec. El Keystore de Android da errores pasajeros en algunos dispositivos y `read()` se llama en cada petición, así que uno solo cerraría la sesión. Además, si la entrada de la clave existe pero quedó inutilizable, `save()` fallaría siempre hasta borrar los datos de la app. Propuesta de las revisiones, sin aplicar porque cambia la spec y no se puede probar sin dispositivo: reintentar una vez el descifrado, borrar solo ante fallos permanentes (etiqueta GCM inválida, dato corto, Base64 o JSON ilegibles) y regenerar la clave al cifrar si la guardada no sirve. Si `save()` lanza después de que el backend ya rotó el refresh token (p. ej. `ProviderException`), la excepción sale de `refreshTokens`, el storage conserva el par viejo y el siguiente refresh recibe 401 (`Rejected`), lo que cierra la sesión; si el backend revoca la familia de tokens por reutilización, se pierde igual.
- **`isAuthRoute` compara por prefijo.** `auth/login` y `auth/refresh` se reconocen con `startsWith`, como dice la spec. Si el backend añadiera una ruta como `auth/login-history`, saldría sin `Bearer`. Hoy ninguna ruta choca.
- **Transferencia entre dispositivos.** `allowBackup="false"` no desactiva la transferencia de dispositivo a dispositivo en Android 12 o superior. Es inofensivo: la sesión transferida no se puede descifrar y `read()` la descarta. Si se quiere excluir del todo, añadir `android:dataExtractionRules` excluyendo `datastore/session.preferences_pb`.
- **Sin timeout de socket.** `HttpTimeout` fija conexión (10 s) y petición (30 s), pero no el de socket: un servidor que acepta y no responde corta a los 10 s por el valor por defecto de OkHttp, y en Darwin puede ser otro. Fijar `socketTimeoutMillis` cuando lleguen las subidas (fase 2).
- **`User.displayName` no recorta espacios.** Un `firstName` como `" Ana "` se muestra con los espacios. Decidir al usarlo en la UI (fase 1).
- **R8 desactivado.** Los builds de release no se minifican. Al activarlo, revisar las reglas para kotlinx.serialization, Ktor (`Logger.ANDROID` busca `android.util.Log` por reflexión) y SLF4J.

## Decisiones abiertas

- Si se añade al repositorio una prueba de humo con Robolectric que arranque `MainActivity` en cada flavor. Hoy esa comprobación solo se ejecutó una vez, fuera del repositorio; añadirla trae Robolectric y `ui-test-junit4` como dependencias de test de `androidApp`.
