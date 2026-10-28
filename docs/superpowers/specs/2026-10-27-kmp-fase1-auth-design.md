# KMP Fase 1: auth y splash

Fecha: 2026-10-27

## Contexto

Primera fase de features del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`). La Fase 0 está cerrada y verificada en un emulador Android 17. Ya existen:

- Cliente Ktor con `Bearer` y refresh de token (`core/network`), `SessionEvents.expired` y `SecureTokenStorage` (solo el par de tokens, cifrado con una clave del Keystore).
- Rutas tipadas `Splash`, `Login` y `Home` como marcadores en `RubusNavHost`.
- Design system: `RubusTextField`, `RubusButton`, `RubusCard`, estados de carga y de error.
- `User` y `UserRole`.
- `lifecycle-viewmodel-compose` y `koin-compose-viewmodel` ya están en el build de `shared`.

Lo que hace Flutter hoy y hay que conservar: `POST /auth/login` devuelve `{token, refreshToken, user}`; se guardan los dos tokens y el usuario; el splash lee el usuario guardado sin red; el logout llama a `POST /auth/logout` y limpia el almacenamiento local aunque la llamada falle. Lo que no se conserva: deducir el mensaje de error buscando texto en la excepción, el registro (`POST /auth/register` exige `ADMIN`) y la espera fija de 2,4 s del splash.

## Objetivo

Entrar y salir de la app con sesión persistente: login, sesión que sobrevive al reinicio, logout y redirección según la sesión.

## Fuera de alcance

- Registro de usuarios, cambio de contraseña y edición de perfil (Fase 7).
- Registro del token FCM (Fase 6) y WebSocket (Fase 2).
- "Olvidé mi contraseña" y biometría.
- Keychain de iOS (Fase 9): el almacén del usuario en iOS es en memoria, como el de los tokens.
- La decisión sobre la ráfaga de refrescos tras un fallo transitorio (`dependencias-pendientes.md`), previa a la Fase 2.
- Cambios en el backend.

## Decisiones tomadas

| Tema | Decisión |
|------|----------|
| Origen del usuario al reiniciar | Se guarda local y se refresca en segundo plano con `GET /auth/me`. El arranque no depende de la red (offline-first, Fase 3). |
| Splash | Navega en cuanto se lee la sesión. Solo el logo, sin animación ni espera fija. |
| Quién decide la navegación | Un `SessionManager` global con `StateFlow<SessionState>`; el `NavHost` lo observa y redirige en un solo punto. |

## Diseño

### 1. Estado de sesión y almacenamiento

- `SecureTokenStorage` no cambia. El usuario va en un almacén aparte, `UserStorage` (`read` / `save` / `clear`): en Android, el mismo DataStore `session` con otra clave y cifrado con el mismo `TokenCipher` (el correo y el nombre son datos personales); en iOS, en memoria. Separarlo evita que cada refresh de tokens borre el usuario, porque el refresco solo reescribe tokens.
- `DataStoreTokenStorage` y `DataStoreUserStorage` comparten **una sola** instancia de `DataStore<Preferences>` en un `single` de Koin: DataStore solo admite una instancia por archivo y proceso.
- `SessionState`: `Loading` (valor inicial), `Authenticated(user)` y `Unauthenticated(expired: Boolean = false)`.
- Consistencia: al cerrar sesión o expirar se borran los tokens y después el usuario. Si hay tokens pero no usuario (almacenamiento corrupto), se pide `GET /auth/me` una vez; si falla, se limpia todo. No se adivina el rol. Si el almacén del usuario falla por un error pasajero del Keystore, se propaga y no se borra nada, igual que `DataStoreTokenStorage`.
- Ubicación: `core/data/auth` (repositorio y `SessionManager`) y `core/platform` (`UserStorage`). El `SessionManager` es un `single` de Koin con un `CoroutineScope` de la app, para que escuche `SessionEvents.expired` toda la vida del proceso.

### 2. Flujos

**Arranque** (`SessionManager.start()`, una vez, desde el ámbito de la app):

1. Sin tokens: `Unauthenticated`.
2. Con tokens y usuario: `Authenticated(user)` al instante, sin red. En segundo plano se pide `GET /auth/me`: si responde se guarda el usuario y se actualiza el estado; si falla por red o 5xx se ignora y la sesión sigue; si el refresh es rechazado, el cliente ya emite `expired`.
3. Con tokens y sin usuario: `GET /auth/me` una vez; si falla, se limpia todo y `Unauthenticated`.
4. Si `read()` lanza un error pasajero del Keystore, se reintenta una vez; si vuelve a fallar, `Unauthenticated` **sin borrar nada**, para que la sesión sobreviva al siguiente arranque.

**Login** (`POST auth/login`, que sale sin `Bearer`): la respuesta `{token, refreshToken, user}` se guarda (tokens, luego usuario) y se emite `Authenticated`. Si falla el guardado del usuario se borran los tokens y se propaga el error, para no dejar media sesión. Un `Mutex` impide dos logins a la vez; la pantalla además deshabilita el botón mientras envía.

**Logout:** `POST auth/logout` con el refresh token en el cuerpo y timeout de 5 s, **antes** de borrar, porque necesita el `Bearer` para que el backend limpie el token FCM de ese usuario (la Fase 6 exige que tras cerrar sesión el dispositivo deje de recibir push). Pase lo que pase con la petición, después se borran tokens y usuario y se emite `Unauthenticated`.

**Expiración:** `SessionEvents.expired` borra tokens y usuario y emite `Unauthenticated(expired = true)`; el Login muestra el aviso "Tu sesión expiró".

**Navegación:** el `NavHost` observa el estado. `Loading` se queda en `Splash`; `Authenticated` navega a `Home` y `Unauthenticated` a `Login`, ambos con `popUpTo(0)` para que "atrás" no vuelva al Splash ni al login. Solo navega cuando cambia el tipo de estado, no el usuario, para que el refresco de `me` en segundo plano no recargue la pantalla. Los botones dev (Diagnóstico y Catálogo) pasan del Splash al Login y al Home provisional, solo en `Environment.DEV`.

### 3. Errores

El repositorio clasifica por código HTTP o tipo de excepción y devuelve `LoginResult.Success(user)` o `LoginResult.Failure(reason)`; los errores esperados no viajan como excepciones.

| Causa | Detección | Mensaje |
|-------|-----------|---------|
| `InvalidCredentials` | HTTP 401 | "Correo o contraseña incorrectos." |
| `RateLimited` | HTTP 429 (el login admite 10 por minuto) | "Demasiados intentos. Espera un minuto." |
| `Network` | `ConnectTimeout`, `SocketTimeout`, `UnresolvedAddress` y otros fallos de E/S | "Sin conexión con el servidor. Verifica tu red." |
| `InvalidInput` | HTTP 400 | "Revisa el correo y la contraseña." |
| `UnsupportedRole` | `UserRole.fromApi` lanza `IllegalArgumentException` | "Tu cuenta tiene un rol que esta versión de la app no reconoce." |
| `Unexpected` | 5xx, cuerpo ilegible y todo lo demás | "Ocurrió un error. Intenta de nuevo." |

Reglas:

- Los mensajes son recursos de Compose y viven en la presentación; el dominio solo conoce la causa.
- Una `CancellationException` se propaga siempre; nunca se convierte en `Network`.
- Nunca se muestra ni se registra `ResponseException.message` (incluye el cuerpo de la respuesta); solo se registra el código de estado.
- Los fallos de `GET /auth/me` en segundo plano y del `POST auth/logout` no se muestran al usuario.
- Validación en cliente antes de enviar: el correo se recorta y debe tener forma de correo (`x@y`); la contraseña no puede estar vacía. No se valida su fortaleza en el login. Los errores de campo van en el propio `RubusTextField`; los de credenciales y red, como mensaje bajo el formulario.

### 4. Pantallas

- **Splash** (`feature/splash`): el logo centrado. Sin ViewModel: es la vista del estado `Loading`.
- **Login** (`feature/auth`): logo pequeño, correo (teclado de correo, `ImeAction.Next`), contraseña con mostrar/ocultar (`ImeAction.Done` envía) y botón "Iniciar sesión", que mientras envía queda deshabilitado y dice "Entrando…" (`RubusButton` no tiene estado de carga). Muestra el aviso de expiración y, en DEV, los botones Diagnóstico y Catálogo.
- **Home provisional** (`feature/home`): nombre, correo y rol, botón "Cerrar sesión" y, en DEV, los botones dev. La Fase 4 lo sustituye.
- **ViewModels** con `koinViewModel()`: `LoginViewModel` expone `StateFlow<LoginUiState>` (correo, contraseña, errores de campo, `submitting`, error del formulario) con `onEmailChange`, `onPasswordChange` y `onSubmit`; `HomeViewModel` mínimo (usuario del `SessionManager` y `logout()`).
- **Recursos:** el logo de `zarza_ai/assets/images/logo-rubus.png` pasa a `composeResources/drawable/logo_rubus.png` (el guion no es válido en el nombre). Se crea el primer `values/strings.xml`: es la primera vez que el proyecto usa recursos de texto de Compose y hay que comprobar que Robolectric los resuelve.
- **Permiso de red local en DEV:** `MainActivity` pide `ACCESS_LOCAL_NETWORK` al arrancar si `BuildConfig.FLAVOR == "dev"` y el SDK es 37 o mayor. En `staging` y `prod` no se pide nada.
- **Pendientes de la Fase 0 que esta fase resuelve:** extraer un `RubusScreen` (Surface, `safeDrawingPadding` y padding) que usan Splash, Login, Home y las tres pantallas existentes (`Marcador`, `DiagnosticoScreen`, `CatalogoScreen`); dar al botón mostrar/ocultar de `RubusTextField` un área táctil de al menos 48 dp; que `User.displayName` recorte los espacios del nombre. Queda fuera la diferencia de forma entre `RubusTextField` (`shapes.large`) y el resto (`RubusDimens`).

### 5. Pruebas y cierre

| Dónde | Qué cubre |
|-------|-----------|
| `commonTest` | `AuthRepositoryTest`: cada fila de la tabla de errores (200, 400, 401, 429, 500, timeout, rol desconocido), que la cancelación se propague y que el logout envíe el refresh token con `Bearer` y el timeout corto. Usa `mockEngine` y `clientFixture` de `NetworkTestSupport.kt`. |
| `commonTest` | `SessionManagerTest`: los cuatro casos de arranque, el orden de guardado y el rollback si falla `UserStorage`, el logout que limpia aunque la red falle, `expired` y el `Mutex`. |
| `commonTest` | `LoginViewModelTest` (validación, envío, doble envío ignorado) y `UserTest` para el recorte de espacios. `KoinGraphTest` se amplía con los bindings nuevos. |
| `androidHostTest` | `LoginScreenTest` (errores visibles, botón deshabilitado al enviar, mostrar/ocultar contraseña, aviso de expiración) y `DataStoreUserStorageTest`. |
| `androidHostTest` | `RubusNavHostTest` ampliado: `Loading` muestra Splash, `Authenticated` va a Home, `Unauthenticated` va a Login, "atrás" no vuelve al Splash, un refresco del usuario no navega y los botones dev solo salen en DEV. |

No se añade test de dispositivo: el cifrado ya lo cubre `KeystoreTokenCipherTest`. Los tests que arranquen Koin paran el contexto con `stopKoin()` en `@AfterTest`.

**Terminado cuando**, en el emulador: un login correcto lleva al Home provisional; credenciales malas muestran el mensaje que corresponde; al cerrar y abrir la app la sesión sigue; el logout borra el almacenamiento; con el token vencido la app refresca sin sacar al usuario (se baja `JWT_ACCESS_EXPIRES_IN` en el backend local; el usuario sale de `pnpm run seed:admin` en `fruit-backend`).

## Riesgos

- Los recursos de texto de Compose nunca se han usado en el proyecto, ni en tests de Robolectric: puede haber fricción de configuración en la primera pantalla.
- Hay dos almacenes sobre un mismo DataStore: un `single` duplicado reintroduce el fallo de "una instancia por archivo".
- `DataStoreUserStorage` hereda el riesgo de fallos pasajeros del Keystore ya documentado; la política de no borrar ante errores no permanentes lo contiene.

## Ejecución

Spec, plan e implementación en el worktree `feature/kmp-fase1-auth`; al terminar se mergea a `main` y se limpia.
