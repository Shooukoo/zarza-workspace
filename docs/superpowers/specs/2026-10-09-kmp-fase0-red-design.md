# KMP Fase 0, sub-proyecto B: red y sesión

Fecha: 2026-10-09

## Contexto

Segundo de los tres sub-proyectos que cierran la Fase 0 del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`). El sub-proyecto A (`2026-10-09-kmp-fase0-build-design.md`) dejó el identificador, los flavors, las librerías, `EnvConfig` y el grafo de Koin. Este añade el cliente HTTP con sesión. El C traerá la UI base y la navegación.

Contrato del backend que este diseño da por hecho (`fruit-backend/src/auth`):

- `POST /api/v1/auth/login` devuelve `{ token, refreshToken, user }`.
- `POST /api/v1/auth/refresh` recibe `{ "refreshToken": "…" }` y devuelve `{ token, refreshToken }`. Está limitado a 5 peticiones por minuto.
- Cada refresh invalida el token de refresh usado. Reutilizar uno ya gastado revoca toda la familia de sesiones.
- El token de acceso dura 15 minutos y el de refresh 7 días.
- Las rutas protegidas aceptan `Authorization: Bearer <token>`.
- Los 401 del backend no llevan cabecera `WWW-Authenticate`.
- `GET /api/v1/health` es público.

## Objetivo

Un `HttpClient` inyectable que añade el token de acceso a cada petición, lo renueva una sola vez ante un 401 sin perder la sesión por refrescos simultáneos, y guarda los tokens cifrados en Android.

## Fuera de alcance

- Login, logout, `/auth/me`, el repositorio de auth, sus DTOs y la sesión local con el usuario guardado (Fase 1).
- Pantallas, navegación y redirección al expirar la sesión (sub-proyecto C y Fase 1). Aquí solo se emite el evento.
- Mapeo de errores HTTP a mensajes para el usuario (Fase 1).
- Cliente WebSocket y subida multipart (Fase 2).
- `SecureTokenStorage` con Keychain en iOS (Fase 9).
- Cambios en el backend.

## Diseño

### 1. `core/network`

| Pieza | Responsabilidad | Depende de |
|-------|-----------------|------------|
| `AuthTokens` | `data class` con `accessToken` y `refreshToken`. | — |
| `TokenRefresher` | Llama a `POST auth/refresh` y devuelve el par nuevo. | Un `HttpClient` propio, sin plugin de autenticación, con la misma URL base. |
| `SessionEvents` | Expone `expired: SharedFlow<Unit>` y un método interno para emitir. | — |
| `createHttpClient(...)` | Construye el cliente de la app. | motor, `Logger`, `EnvConfig`, `SecureTokenStorage`, `TokenRefresher`, `SessionEvents` |

`TokenRefresher` distingue tres resultados: par nuevo; sesión rechazada (el backend respondió 401); fallo transitorio (error de red, 429 o 5xx).

`createHttpClient` instala:

- `ContentNegotiation` con JSON (`ignoreUnknownKeys = true`).
- `HttpTimeout`: 10 s de conexión y 30 s por petición.
- `Logging` con el `Logger` recibido; nivel de cabeceras en `DEV` y ninguno en los demás entornos. Nunca se registran cuerpos, para no volcar tokens.
- `defaultRequest` con la URL `"${envConfig.apiBaseUrl}/"` y `Content-Type: application/json`.
- `expectSuccess = true`.
- `Auth` con el proveedor `bearer`.

### 2. Comportamiento de la autenticación

- **Carga.** `loadTokens` lee de `SecureTokenStorage`. Sin tokens, la petición sale sin cabecera.
- **Refresh.** Ante un 401, `refreshTokens` llama a `TokenRefresher`, guarda el par nuevo y la petición original se reintenta una vez.
- **Serialización.** Varios 401 simultáneos producen una sola llamada a `/auth/refresh`; el resto de peticiones se reintenta con el token nuevo.
- **Rutas de auth.** Las peticiones cuya ruta empieza por `auth/login` o `auth/refresh` no llevan Bearer ni disparan refresh.
- **Sesión rechazada.** Se borran los tokens, se emite `SessionEvents.expired` y la petición original falla con su 401.
- **Fallo transitorio.** No se borra nada ni se emite evento; la petición original falla.
- **Rutas.** Se piden relativas y sin barra inicial (`client.get("health")`).

**Riesgo a validar.** El plugin `Auth` decide si refresca a partir de `WWW-Authenticate`, que el backend no envía. Un test reproduce esa respuesta exacta. Si el plugin no refresca en ese caso, se sustituye por un plugin propio con un `Mutex` que cumpla las mismas reglas de esta sección; el backend no se modifica.

### 3. `core/platform`: almacenamiento de tokens

```kotlin
interface SecureTokenStorage {
    suspend fun read(): AuthTokens?
    suspend fun save(tokens: AuthTokens)
    suspend fun clear()
}
```

| Pieza | Source set | Responsabilidad |
|-------|------------|-----------------|
| `InMemoryTokenStorage` | `commonMain` | Guarda el par en memoria. Doble de test e implementación temporal de iOS. |
| `TokenCipher` | `androidMain`, `internal` | `encrypt(ByteArray): ByteArray` y `decrypt(ByteArray): ByteArray`. |
| `KeystoreTokenCipher` | `androidMain` | AES-256-GCM con una clave del Android Keystore (alias `rubus_session_key`), IV aleatorio por cifrado antepuesto al resultado. |
| `DataStoreTokenStorage` | `androidMain` | Serializa `AuthTokens` a JSON, lo cifra y guarda el resultado en Base64 en un DataStore Preferences llamado `session`. |

- **Dato ilegible.** Si el descifrado o la deserialización fallan, `read()` borra lo guardado y devuelve `null`.
- **Escritura.** Los dos tokens se guardan en una sola entrada, de forma atómica.

### 4. `core/model`

```kotlin
enum class UserRole(val displayName: String) {
    ADMIN("Administrador"), PRODUCTOR("Productor"), AGRONOMO("Agrónomo"), MONITOR("Monitor");

    companion object { fun fromApi(value: String): UserRole }
}

data class User(
    val id: String,
    val email: String,
    val role: UserRole,
    val firstName: String? = null,
    val lastName: String? = null,
) {
    val displayName: String
}
```

- `fromApi` compara sin distinguir mayúsculas y lanza `IllegalArgumentException` ante un valor desconocido. La app Flutter lo convertía en `MONITOR`; aquí es un error.
- `User.displayName` es `firstName` si existe y no está en blanco; si no, la parte del correo anterior a `@`.
- `core/model` no depende de kotlinx.serialization ni de ninguna otra librería.

### 5. Koin

- `networkModule`: `SessionEvents`, `TokenRefresher` y el `HttpClient` de la app, todos `single`. Deja de ser un `val` vacío y pasa a función, porque ahora contiene instancias.
- `androidPlatformModule`: motor OkHttp, `Logger.ANDROID`, `KeystoreTokenCipher` y `DataStoreTokenStorage` como `SecureTokenStorage`.
- `iosPlatformModule`: motor Darwin, un `Logger` que escribe con `println`, e `InMemoryTokenStorage` como `SecureTokenStorage`.

### 6. `androidApp`

- `AndroidManifest.xml` declara `<uses-permission android:name="android.permission.INTERNET" />`.
- `android:allowBackup` pasa a `false`: la clave del Keystore no entra en las copias de seguridad, así que una sesión restaurada sería ilegible.

### 7. Petición de prueba

En la pantalla provisional de `App.kt`, el botón pasa a llamarse "Probar conexión". Al pulsarlo hace `GET health` con el `HttpClient` inyectado y muestra debajo "Conectado" o el mensaje del error. La pantalla desaparece en el sub-proyecto C.

### 8. Dependencias

Se añaden al catálogo, como dependencias de `commonTest` de `shared`: `ktor-client-mock` (misma versión que Ktor) y `kotlinx-coroutines-test` (misma versión que coroutines). El test instrumentado usa las de AndroidX Test que ya están en el catálogo.

## Pruebas

En `commonTest`, con `MockEngine`:

1. Una petición autenticada lleva `Authorization: Bearer <accessToken>`.
2. Un 401 dispara un refresh, se guarda el par nuevo y la petición se reintenta exactamente una vez.
3. Lo mismo con un 401 sin cabecera `WWW-Authenticate`.
4. Tres peticiones simultáneas que reciben 401 producen una sola llamada a `auth/refresh` y las tres terminan bien.
5. Refresh rechazado con 401: `SecureTokenStorage` queda vacío, se emite `SessionEvents.expired` y la petición falla.
6. Refresh con error de red y con 429: los tokens se conservan y no hay evento.
7. Las peticiones a `auth/login` y `auth/refresh` salen sin `Authorization` y un 401 en ellas no dispara refresh.
8. `client.get("health")` se resuelve como `<apiBaseUrl>/health`.
9. `User.displayName` y `UserRole.fromApi`, incluido el valor desconocido.
10. El grafo de Koin resuelve el `HttpClient` con un módulo de plataforma de prueba.

En `androidHostTest`:

11. `DataStoreTokenStorage` con un `TokenCipher` falso: guardar y leer, borrar, y dato ilegible (se borra y devuelve `null`).

En `androidDeviceTest`:

12. `KeystoreTokenCipher`: lo cifrado se descifra al valor original y dos cifrados del mismo valor difieren. Solo se ejecuta con un emulador o teléfono.

## Terminado cuando

1. Los tests de `shared` ejecutables en Linux pasan y los tres flavors compilan en debug y release.
2. El test 2 demuestra el refresh con un único reintento.
3. Con el backend local levantado, "Probar conexión" muestra "Conectado" en el flavor `dev`. Requiere emulador o teléfono.
4. El test 12 pasa en un emulador o teléfono.
5. `rubus-ai-kmp/docs/dependencias-pendientes.md` y el roadmap reflejan lo resuelto, y el roadmap registra que el registro de usuarios se descarta: `POST /auth/register` exige rol `ADMIN`.

Los puntos 3 y 4 no se pueden comprobar en la máquina de desarrollo mientras no haya un dispositivo. El código de `iosMain` queda sin compilar, como en el sub-proyecto A.

## Rama

Worktree `../zarza-workspace-kmp-fase0-red`, rama `feature/kmp-fase0-red`. Merge a `main` y limpieza del worktree al terminar, si todo está commiteado, compila y pasa las pruebas.
