# KMP Fase 0 — Red y sesión: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un `HttpClient` de Ktor inyectable por Koin que añade el token de acceso a cada petición, lo renueva una sola vez ante un 401 sin perder la sesión por refrescos simultáneos, y guarda los tokens cifrados en Android.

**Architecture:** `core/network` tiene dos clientes sobre el mismo motor: el de la app (plugin `Auth` con proveedor `bearer`) y uno sin autenticación que solo usa `TokenRefresher` para llamar a `auth/refresh`. Los tokens viven en `SecureTokenStorage` (`core/platform`), que es la única fuente de verdad: el plugin no los cachea. En Android la implementación es DataStore Preferences con el contenido cifrado por una clave AES-256-GCM del Android Keystore. Cada plataforma aporta motor, `Logger` y almacenamiento desde su módulo de Koin.

**Tech Stack:** Kotlin 2.4.20, Ktor Client 3.6.0 (`auth`, `content-negotiation`, `logging`, `mock`), kotlinx.serialization 1.11.0, kotlinx.coroutines 1.11.0 (`coroutines-test`), Koin 4.2.2, DataStore Preferences 1.2.1, Android Keystore.

**Spec:** `docs/superpowers/specs/2026-10-09-kmp-fase0-red-design.md`

---

## Antes de empezar

**Directorios.** El repo es `/home/san/Proyectos/zarza-workspace`. Todo el trabajo se hace en el worktree `/home/san/Proyectos/zarza-workspace-kmp-fase0-red` (Task 0). Salvo que se indique otra cosa, los comandos se ejecutan desde `<worktree>/rubus-ai-kmp` y las rutas de archivo son relativas a esa carpeta. El paquete base es `com.rubusai.app` y la carpeta base `com/rubusai/app/`.

**Reglas del repo.**
- Los mensajes de commit llevan solo el resumen. Nunca `Co-Authored-By` ni menciones a Claude/Anthropic.
- No cambiar de rama en `/home/san/Proyectos/zarza-workspace`; solo se trabaja en el worktree.
- `local.properties` no entra al repositorio y no se imprime su contenido.
- En tests y ejemplos, los tokens son valores inventados y evidentes (`access-old`, `refresh-new`). Nunca un token real.

**Máquina.** Es Linux, sin emulador ni teléfono conectado. Los objetivos de iOS no se compilan: lo escrito en `iosMain` (Task 9) queda sin verificar. El test instrumentado (Task 8) solo se compila; ejecutarlo y pulsar "Probar conexión" contra el backend quedan pendientes para el usuario.

**Cómo se ejecutan los tests.** Los tests de `commonTest` y de `androidHostTest` corren en la JVM con `./gradlew :shared:testAndroidHostTest`. Para uno solo: `--tests "<clase completa>"`.

**Hechos de Ktor 3.6.0 ya comprobados en su código fuente** (no hace falta volver a investigarlos):

- Con un único proveedor registrado, `Auth` refresca ante un 401 aunque la respuesta no traiga `WWW-Authenticate`. Es el riesgo que la spec pedía validar; el test 3 lo fija.
- `Auth` lleva un contador de versión del token por proveedor: una petición que recibe 401 con un token que otra petición ya renovó no vuelve a refrescar, solo se reintenta. `AuthTokenHolder.setToken` serializa los refrescos con un `Mutex`.
- La petición reintentada lleva el atributo `AuthCircuitBreaker`: si vuelve a dar 401 no hay segundo refresh.
- `BearerAuthConfig.cacheTokens = false` hace que `loadTokens` se llame en cada petición.
- `AuthConfig.reAuthorizeOnResponse { }` decide qué respuestas disparan el refresh.
- ~~`ContentNegotiation` quita la cabecera `Content-Type` cuando la petición no lleva cuerpo.~~ Falso, comprobado el 2026-10-10 con OkHttp y `MockEngine`: la cabecera de `defaultRequest` sale también sin cuerpo y Fastify responde 400 a un `POST`/`DELETE` vacío declarado como JSON. `installBase` la quita cuando no hay cuerpo.
- `HttpTimeout` sigue al dispatcher del motor, no al de quien llama (comprobado el 2026-10-10). El `MockEngine` de los tests usa el dispatcher del test (`NetworkTestSupport.kt`, Task 4) para que handlers y timeouts corran en tiempo virtual y los tests sean deterministas.

**Decisiones que este plan toma sobre lo que la spec deja abierto.**

1. **`cacheTokens = false`.** `SecureTokenStorage` es la única fuente de verdad. Así, cuando la Fase 1 guarde los tokens tras el login o los borre en el logout, el cliente lo ve sin tener que llamar a `clearAuthTokens()`. Coste: una lectura de DataStore y un descifrado por petición.
2. **`sanitizeHeader` para `Authorization`.** La spec pide registrar cabeceras en `DEV` y no volcar tokens; la cabecera `Authorization` lleva el token, así que se enmascara.
3. **Petición con 401 y sin tokens guardados.** No se llama a `auth/refresh`, no se emite evento y la petición falla con su 401.
4. **Respuestas de `auth/refresh` que la spec no clasifica** (400, 403, un 200 con cuerpo ilegible). Se tratan como fallo transitorio: no destruyen la sesión.
5. **Contingencia del plugin propio.** La spec prevé sustituir `Auth` por un plugin con `Mutex` si no refresca sin `WWW-Authenticate`. El código fuente dice que sí refresca, así que este plan no incluye ese plugin. Si aun así fallan los tests 3 o 4 de la Task 6 con la implementación exacta de este plan, **parar y avisar al usuario** con la salida del test; no improvisar el plugin.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `gradle/libs.versions.toml` | Modificar | `ktor-client-mock` y `kotlinx-coroutines-test` |
| `shared/build.gradle.kts` | Modificar | Dependencias de `commonTest` y `androidDeviceTest` |
| `shared/src/commonMain/.../core/model/UserRole.kt` | Crear | Rol y su nombre visible |
| `shared/src/commonMain/.../core/model/User.kt` | Crear | Usuario y `displayName` |
| `shared/src/commonMain/.../core/network/AuthTokens.kt` | Crear | Par de tokens |
| `shared/src/commonMain/.../core/network/SessionEvents.kt` | Crear | Evento de sesión expirada |
| `shared/src/commonMain/.../core/network/TokenRefresher.kt` | Crear | Llamada a `auth/refresh` y sus tres resultados |
| `shared/src/commonMain/.../core/network/HttpClientFactory.kt` | Crear | Configuración común, cliente de refresh y cliente de la app |
| `shared/src/commonMain/.../core/platform/SecureTokenStorage.kt` | Modificar | Añadir `read`, `save`, `clear` |
| `shared/src/commonMain/.../core/platform/InMemoryTokenStorage.kt` | Crear | Implementación en memoria |
| `shared/src/androidMain/.../core/platform/TokenCipher.kt` | Crear | Interfaz de cifrado |
| `shared/src/androidMain/.../core/platform/DataStoreTokenStorage.kt` | Crear | Tokens cifrados en DataStore |
| `shared/src/androidMain/.../core/platform/KeystoreTokenCipher.kt` | Crear | AES-256-GCM con el Android Keystore |
| `shared/src/commonMain/.../core/di/AppModule.kt` | Modificar | `networkModule()` con instancias reales |
| `shared/src/androidMain/.../core/di/PlatformModule.android.kt` | Modificar | Motor OkHttp, `Logger.ANDROID`, cifrado y almacenamiento |
| `shared/src/iosMain/.../core/di/PlatformModule.ios.kt` | Modificar | Motor Darwin, `Logger` con `println`, almacenamiento en memoria |
| `shared/src/commonMain/.../App.kt` | Modificar | Botón "Probar conexión" |
| `androidApp/src/main/AndroidManifest.xml` | Modificar | Permiso `INTERNET`, `allowBackup="false"` |
| `docs/dependencias-pendientes.md`, `docs/roadmap-migracion-kmp.md`, `README.md` | Modificar | Estado tras el sub-proyecto |

Tests (`...` = `kotlin/com/rubusai/app`):

| Archivo | Tests de la spec |
|---------|------------------|
| `shared/src/commonTest/.../core/model/UserTest.kt` | 9 |
| `shared/src/commonTest/.../core/platform/InMemoryTokenStorageTest.kt` | — |
| `shared/src/commonTest/.../core/network/SessionEventsTest.kt` | — |
| `shared/src/commonTest/.../core/network/NetworkTestSupport.kt` | (utilidades) |
| `shared/src/commonTest/.../core/network/TokenRefresherTest.kt` | base del 5 y el 6 |
| `shared/src/commonTest/.../core/network/HttpClientTest.kt` | 1, 7 (cabecera), 8 |
| `shared/src/commonTest/.../core/network/HttpClientRefreshTest.kt` | 2, 3, 4, 5, 6, 7 (refresh) |
| `shared/src/commonTest/.../core/di/KoinGraphTest.kt` | 10 |
| `shared/src/androidHostTest/.../core/platform/DataStoreTokenStorageTest.kt` | 11 |
| `shared/src/androidDeviceTest/.../core/platform/KeystoreTokenCipherTest.kt` | 12 |

---

### Task 0: Worktree

**Files:** ninguno del repo.

- [ ] **Step 1: Comprobar el estado de `main`**

Desde `/home/san/Proyectos/zarza-workspace`:

```bash
git status --short && git branch --show-current && git log --oneline -1 -- docs/superpowers/plans/2026-10-09-kmp-fase0-red.md
```

Expected: sin líneas de estado, `main`, y un commit que contiene este plan. Si hay cambios sin commitear o el plan no está commiteado, parar y avisar al usuario.

- [ ] **Step 2: Crear el worktree**

```bash
git worktree add ../zarza-workspace-kmp-fase0-red -b feature/kmp-fase0-red
```

Expected: `Preparing worktree (new branch 'feature/kmp-fase0-red')`.

- [ ] **Step 3: Copiar `local.properties`**

Está en `.gitignore`, así que el worktree no lo trae y Gradle no encontraría el SDK de Android.

```bash
cp rubus-ai-kmp/local.properties ../zarza-workspace-kmp-fase0-red/rubus-ai-kmp/local.properties
```

- [ ] **Step 4: Confirmar que el proyecto compila y los tests pasan antes de tocar nada**

Desde `/home/san/Proyectos/zarza-workspace-kmp-fase0-red/rubus-ai-kmp`:

```bash
./gradlew :androidApp:assembleDevDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`. Si falla, parar: el problema es anterior a este plan.

---

### Task 1: Dependencias de test

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `shared/build.gradle.kts`

- [ ] **Step 1: Añadir las librerías al catálogo**

En `gradle/libs.versions.toml`, dentro de `[libraries]`, después de la línea `ktor-client-darwin = ...`:

```toml
ktor-client-mock = { module = "io.ktor:ktor-client-mock", version.ref = "ktor" }
```

Y después de la línea `kotlinx-coroutines-core = ...`:

```toml
kotlinx-coroutines-test = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-test", version.ref = "kotlinx-coroutines" }
```

- [ ] **Step 2: Conectarlas a `shared`**

En `shared/build.gradle.kts`, sustituir el bloque

```kotlin
        commonTest.dependencies {
            implementation(libs.kotlin.test)
        }
```

por

```kotlin
        commonTest.dependencies {
            implementation(libs.kotlin.test)
            implementation(libs.ktor.client.mock)
            implementation(libs.kotlinx.coroutines.test)
        }
        // espresso-core arrastra androidx.test:runner, que trae el AndroidJUnitRunner
        // configurado arriba como instrumentationRunner.
        getByName("androidDeviceTest").dependencies {
            implementation(libs.androidx.testExt.junit)
            implementation(libs.androidx.espresso.core)
        }
```

- [ ] **Step 3: Comprobar que todo se resuelve y compila**

```bash
./gradlew :shared:testAndroidHostTest :shared:assembleAndroidDeviceTest
```

Expected: `BUILD SUCCESSFUL`. `assembleAndroidDeviceTest` compila el APK de test instrumentado sin necesitar dispositivo.

Si `getByName("androidDeviceTest")` falla porque el source set no existe, listar los nombres reales con `./gradlew :shared:sourceSets 2>/dev/null || ./gradlew :shared:tasks --all | grep -i devicetest` y usar el que aparezca; avisar del cambio en el informe.

- [ ] **Step 4: Commit**

```bash
git add gradle/libs.versions.toml shared/build.gradle.kts
git commit -m "build(rubus-ai-kmp): dependencias de test para red y test instrumentado"
```

---

### Task 2: `core/model` — `UserRole` y `User`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/UserRole.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/User.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/model/UserTest.kt`

`core/model` no importa kotlinx.serialization ni ninguna otra librería.

- [ ] **Step 1: Escribir los tests**

`shared/src/commonTest/kotlin/com/rubusai/app/core/model/UserTest.kt`:

```kotlin
package com.rubusai.app.core.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class UserTest {

    private fun user(email: String = "ana.lopez@zarza.example", firstName: String? = null) =
        User(id = "u1", email = email, role = UserRole.MONITOR, firstName = firstName)

    @Test
    fun displayNameEsElNombreCuandoExiste() {
        assertEquals("Ana", user(firstName = "Ana").displayName)
    }

    @Test
    fun displayNameUsaElCorreoCuandoNoHayNombre() {
        assertEquals("ana.lopez", user(firstName = null).displayName)
    }

    @Test
    fun displayNameUsaElCorreoCuandoElNombreEstaEnBlanco() {
        assertEquals("ana.lopez", user(firstName = "   ").displayName)
    }

    @Test
    fun fromApiReconoceLosCuatroRoles() {
        assertEquals(UserRole.ADMIN, UserRole.fromApi("ADMIN"))
        assertEquals(UserRole.PRODUCTOR, UserRole.fromApi("PRODUCTOR"))
        assertEquals(UserRole.AGRONOMO, UserRole.fromApi("AGRONOMO"))
        assertEquals(UserRole.MONITOR, UserRole.fromApi("MONITOR"))
    }

    @Test
    fun fromApiNoDistingueMayusculas() {
        assertEquals(UserRole.AGRONOMO, UserRole.fromApi("agronomo"))
        assertEquals(UserRole.ADMIN, UserRole.fromApi("Admin"))
    }

    @Test
    fun fromApiFallaConUnRolDesconocido() {
        assertFailsWith<IllegalArgumentException> { UserRole.fromApi("SUPERVISOR") }
    }

    @Test
    fun cadaRolTieneSuNombreVisible() {
        assertEquals("Administrador", UserRole.ADMIN.displayName)
        assertEquals("Productor", UserRole.PRODUCTOR.displayName)
        assertEquals("Agrónomo", UserRole.AGRONOMO.displayName)
        assertEquals("Monitor", UserRole.MONITOR.displayName)
    }
}
```

- [ ] **Step 2: Ejecutarlos y ver que fallan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.model.UserTest"
```

Expected: fallo de compilación, `Unresolved reference 'User'` y `'UserRole'`.

- [ ] **Step 3: Implementar**

`shared/src/commonMain/kotlin/com/rubusai/app/core/model/UserRole.kt`:

```kotlin
package com.rubusai.app.core.model

enum class UserRole(val displayName: String) {
    ADMIN("Administrador"),
    PRODUCTOR("Productor"),
    AGRONOMO("Agrónomo"),
    MONITOR("Monitor");

    companion object {
        /**
         * Convierte el rol que envía el backend. No distingue mayúsculas.
         * Un valor desconocido es un error: no se degrada a otro rol.
         */
        fun fromApi(value: String): UserRole =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
                ?: throw IllegalArgumentException("Rol desconocido: '$value'")
    }
}
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/model/User.kt`:

```kotlin
package com.rubusai.app.core.model

data class User(
    val id: String,
    val email: String,
    val role: UserRole,
    val firstName: String? = null,
    val lastName: String? = null,
) {
    /** El nombre si existe y no está en blanco; si no, la parte del correo anterior a `@`. */
    val displayName: String
        get() = firstName?.takeIf { it.isNotBlank() } ?: email.substringBefore('@')
}
```

- [ ] **Step 4: Ejecutarlos y ver que pasan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.model.UserTest"
```

Expected: `BUILD SUCCESSFUL`, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/model shared/src/commonTest/kotlin/com/rubusai/app/core/model
git commit -m "feat(rubus-ai-kmp): User y UserRole en core/model"
```

---

### Task 3: `AuthTokens`, `SecureTokenStorage`, `InMemoryTokenStorage` y `SessionEvents`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/AuthTokens.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/SecureTokenStorage.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/InMemoryTokenStorage.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/SessionEvents.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/platform/InMemoryTokenStorageTest.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/SessionEventsTest.kt`

- [ ] **Step 1: Escribir los tests**

`shared/src/commonTest/kotlin/com/rubusai/app/core/platform/InMemoryTokenStorageTest.kt`:

```kotlin
package com.rubusai.app.core.platform

import com.rubusai.app.core.network.AuthTokens
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

class InMemoryTokenStorageTest {

    @Test
    fun empiezaVacioSiNoRecibeTokens() = runTest {
        assertNull(InMemoryTokenStorage().read())
    }

    @Test
    fun devuelveLosTokensIniciales() = runTest {
        val tokens = AuthTokens("access-1", "refresh-1")

        assertEquals(tokens, InMemoryTokenStorage(tokens).read())
    }

    @Test
    fun guardarSustituyeElParAnterior() = runTest {
        val storage = InMemoryTokenStorage(AuthTokens("access-1", "refresh-1"))

        storage.save(AuthTokens("access-2", "refresh-2"))

        assertEquals(AuthTokens("access-2", "refresh-2"), storage.read())
    }

    @Test
    fun borrarLoDejaVacio() = runTest {
        val storage = InMemoryTokenStorage(AuthTokens("access-1", "refresh-1"))

        storage.clear()

        assertNull(storage.read())
    }

    @Test
    fun toStringNoMuestraLosTokens() {
        val text = AuthTokens("access-1", "refresh-1").toString()

        assertFalse(text.contains("access-1"))
        assertFalse(text.contains("refresh-1"))
    }
}
```

`shared/src/commonTest/kotlin/com/rubusai/app/core/network/SessionEventsTest.kt`:

```kotlin
package com.rubusai.app.core.network

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest

class SessionEventsTest {

    @Test
    fun quienEstaSuscritoRecibeCadaAviso() = runTest {
        val events = SessionEvents()
        val received = mutableListOf<Unit>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            events.expired.toList(received)
        }

        events.notifyExpired()
        events.notifyExpired()

        assertEquals(2, received.size)
    }

    @Test
    fun avisarSinSuscriptoresNoFallaNiSeGuarda() = runTest {
        val events = SessionEvents()
        events.notifyExpired()

        val received = mutableListOf<Unit>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            events.expired.toList(received)
        }

        assertEquals(0, received.size)
    }
}
```

- [ ] **Step 2: Ejecutarlos y ver que fallan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.InMemoryTokenStorageTest" --tests "com.rubusai.app.core.network.SessionEventsTest"
```

Expected: fallo de compilación, `Unresolved reference 'AuthTokens'`, `'InMemoryTokenStorage'` y `'SessionEvents'`.

- [ ] **Step 3: Implementar**

`shared/src/commonMain/kotlin/com/rubusai/app/core/network/AuthTokens.kt`:

```kotlin
package com.rubusai.app.core.network

import kotlinx.serialization.Serializable

/** Par de tokens de una sesión. */
@Serializable
data class AuthTokens(val accessToken: String, val refreshToken: String) {
    // Evita que los tokens acaben en un log o en el mensaje de una excepción.
    override fun toString(): String = "AuthTokens(***)"
}
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/platform/SecureTokenStorage.kt` (contenido completo):

```kotlin
package com.rubusai.app.core.platform

import com.rubusai.app.core.network.AuthTokens

/** Almacenamiento seguro de los tokens de sesión. Los dos tokens se guardan y se borran juntos. */
interface SecureTokenStorage {
    /** El par guardado, o `null` si no hay sesión o lo guardado es ilegible. */
    suspend fun read(): AuthTokens?

    suspend fun save(tokens: AuthTokens)

    suspend fun clear()
}
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/platform/InMemoryTokenStorage.kt`:

```kotlin
package com.rubusai.app.core.platform

import com.rubusai.app.core.network.AuthTokens
import kotlin.concurrent.Volatile

/**
 * Guarda el par en memoria: la sesión se pierde al cerrar el proceso.
 * Doble de test e implementación temporal de iOS hasta que exista la de Keychain.
 */
class InMemoryTokenStorage(initial: AuthTokens? = null) : SecureTokenStorage {
    @Volatile
    private var tokens: AuthTokens? = initial

    override suspend fun read(): AuthTokens? = tokens

    override suspend fun save(tokens: AuthTokens) {
        this.tokens = tokens
    }

    override suspend fun clear() {
        tokens = null
    }
}
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/network/SessionEvents.kt`:

```kotlin
package com.rubusai.app.core.network

import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/** Avisos sobre la sesión que la capa de red emite y la de presentación escucha. */
class SessionEvents {
    private val _expired = MutableSharedFlow<Unit>(
        extraBufferCapacity = 1,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )

    /**
     * Emite cuando el backend rechaza el token de refresh y la sesión ya no se puede renovar.
     * No repite avisos anteriores a quien se suscribe después.
     */
    val expired: SharedFlow<Unit> = _expired.asSharedFlow()

    internal fun notifyExpired() {
        _expired.tryEmit(Unit)
    }
}
```

- [ ] **Step 4: Ejecutar todos los tests de `shared`**

```bash
./gradlew :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`. Se ejecutan todos porque `SecureTokenStorage` dejó de ser una interfaz vacía.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/network shared/src/commonMain/kotlin/com/rubusai/app/core/platform shared/src/commonTest/kotlin/com/rubusai/app/core/network shared/src/commonTest/kotlin/com/rubusai/app/core/platform
git commit -m "feat(rubus-ai-kmp): AuthTokens, SecureTokenStorage en memoria y SessionEvents"
```

---

### Task 4: `TokenRefresher` y el cliente de refresh

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/HttpClientFactory.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/TokenRefresher.kt`
- Create: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/NetworkTestSupport.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/TokenRefresherTest.kt`

Contrato del backend: `POST <apiBaseUrl>/auth/refresh` con cuerpo `{"refreshToken":"…"}` devuelve `{"token":"…","refreshToken":"…"}`. Un 401 significa que el token de refresh ya no vale.

- [ ] **Step 1: Escribir las utilidades de test**

`shared/src/commonTest/kotlin/com/rubusai/app/core/network/NetworkTestSupport.kt`:

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import io.ktor.client.engine.mock.MockEngine
import io.ktor.client.engine.mock.MockEngineConfig
import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpResponseData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope

internal const val TEST_BASE_URL = "http://10.0.2.2:3001/api/v1"

internal val testEnvConfig = EnvConfig(Environment.DEV, devHost = "10.0.2.2")

/** Error que lanza el motor falso para simular que no hay red. */
internal class FakeNetworkException : Exception("sin red")

/**
 * Motor falso que responde en el dispatcher del test. Si respondiera en `Dispatchers.IO`,
 * el tiempo virtual de `runTest` podría disparar los timeouts de `HttpTimeout`.
 */
internal fun TestScope.mockEngine(handler: MockRequestHandler): MockEngine =
    MockEngine(
        MockEngineConfig().apply {
            dispatcher = StandardTestDispatcher(testScheduler)
            addHandler(handler)
        },
    )

internal fun MockRequestHandleScope.respondJson(
    body: String,
    status: HttpStatusCode = HttpStatusCode.OK,
): HttpResponseData = respond(
    content = body,
    status = status,
    headers = headersOf(HttpHeaders.ContentType, "application/json"),
)

/** Respuesta de `auth/refresh` con un par nuevo. */
internal fun MockRequestHandleScope.respondNewTokens(): HttpResponseData =
    respondJson("""{"token":"access-new","refreshToken":"refresh-new"}""")
```

- [ ] **Step 2: Escribir los tests**

`shared/src/commonTest/kotlin/com/rubusai/app/core/network/TokenRefresherTest.kt`:

```kotlin
package com.rubusai.app.core.network

import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class TokenRefresherTest {

    private fun TestScope.refresher(handler: MockRequestHandler) =
        TokenRefresher(createRefreshClient(mockEngine(handler), testEnvConfig))

    @Test
    fun devuelveElParNuevo() = runTest {
        val refresher = refresher {
            respondJson("""{"token":"access-new","refreshToken":"refresh-new","campoExtra":1}""")
        }

        val result = refresher.refresh("refresh-old")

        assertEquals(RefreshResult.Success(AuthTokens("access-new", "refresh-new")), result)
    }

    @Test
    fun enviaElRefreshTokenEnElCuerpoYSinCabeceraDeAutorizacion() = runTest {
        var method: HttpMethod? = null
        var url: String? = null
        var body: String? = null
        var authorization: String? = "sin asignar"
        val refresher = refresher { request ->
            method = request.method
            url = request.url.toString()
            body = request.body.toByteArray().decodeToString()
            authorization = request.headers[HttpHeaders.Authorization]
            respondNewTokens()
        }

        refresher.refresh("refresh-old")

        assertEquals(HttpMethod.Post, method)
        assertEquals("$TEST_BASE_URL/auth/refresh", url)
        assertEquals("""{"refreshToken":"refresh-old"}""", body)
        assertNull(authorization)
    }

    @Test
    fun un401EsSesionRechazada() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.Unauthorized) }

        assertEquals(RefreshResult.Rejected, refresher.refresh("refresh-old"))
    }

    @Test
    fun un429EsFalloTransitorio() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.TooManyRequests) }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun un500EsFalloTransitorio() = runTest {
        val refresher = refresher { respondError(HttpStatusCode.InternalServerError) }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun unErrorDeRedEsFalloTransitorio() = runTest {
        val refresher = refresher { throw FakeNetworkException() }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }

    @Test
    fun un200ConCuerpoIlegibleEsFalloTransitorio() = runTest {
        val refresher = refresher { respondJson("""{"inesperado":true}""") }

        assertEquals(RefreshResult.TransientFailure, refresher.refresh("refresh-old"))
    }
}
```

- [ ] **Step 3: Ejecutarlos y ver que fallan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.TokenRefresherTest"
```

Expected: fallo de compilación, `Unresolved reference 'TokenRefresher'`, `'createRefreshClient'` y `'RefreshResult'`.

- [ ] **Step 4: Implementar la configuración común y el cliente de refresh**

`shared/src/commonMain/kotlin/com/rubusai/app/core/network/HttpClientFactory.kt`:

```kotlin
package com.rubusai.app.core.network

import com.rubusai.app.core.config.EnvConfig
import io.ktor.client.HttpClient
import io.ktor.client.HttpClientConfig
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.defaultRequest
import io.ktor.http.ContentType
import io.ktor.http.contentType
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

private const val CONNECT_TIMEOUT_MS = 10_000L
private const val REQUEST_TIMEOUT_MS = 30_000L

/**
 * Configuración que comparten el cliente de la app y el de refresh.
 * Las rutas se piden relativas y sin barra inicial (`client.get("health")`): con barra,
 * Ktor descarta el `/api/v1` de la URL base.
 */
private fun HttpClientConfig<*>.installBase(envConfig: EnvConfig) {
    install(ContentNegotiation) {
        json(Json { ignoreUnknownKeys = true })
    }
    install(HttpTimeout) {
        connectTimeoutMillis = CONNECT_TIMEOUT_MS
        requestTimeoutMillis = REQUEST_TIMEOUT_MS
    }
    defaultRequest {
        url("${envConfig.apiBaseUrl}/")
        contentType(ContentType.Application.Json)
    }
}

/**
 * Cliente que solo usa [TokenRefresher]. No lleva autenticación, para que la llamada a
 * `auth/refresh` no pueda disparar otro refresh, ni registro, para no volcar tokens.
 * No lanza por códigos de error: [TokenRefresher] los interpreta.
 */
internal fun createRefreshClient(engine: HttpClientEngine, envConfig: EnvConfig): HttpClient =
    HttpClient(engine) {
        expectSuccess = false
        installBase(envConfig)
    }
```

- [ ] **Step 5: Implementar `TokenRefresher`**

`shared/src/commonMain/kotlin/com/rubusai/app/core/network/TokenRefresher.kt`:

```kotlin
package com.rubusai.app.core.network

import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpStatusCode
import io.ktor.http.isSuccess
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.serialization.Serializable

sealed interface RefreshResult {
    data class Success(val tokens: AuthTokens) : RefreshResult

    /** El backend respondió 401: el token de refresh ya no vale y la sesión terminó. */
    data object Rejected : RefreshResult

    /** Error de red, 429, 5xx o respuesta inesperada. La sesión puede seguir siendo válida. */
    data object TransientFailure : RefreshResult
}

@Serializable
private data class RefreshRequest(val refreshToken: String)

@Serializable
private data class RefreshResponse(val token: String, val refreshToken: String)

/**
 * Pide un par de tokens nuevo a `POST auth/refresh`. [client] debe ser el de
 * [createRefreshClient]: sin autenticación y con la misma URL base que el de la app.
 */
class TokenRefresher(private val client: HttpClient) {

    suspend fun refresh(refreshToken: String): RefreshResult = try {
        val response = client.post("auth/refresh") { setBody(RefreshRequest(refreshToken)) }
        when {
            response.status.isSuccess() -> {
                val body = response.body<RefreshResponse>()
                RefreshResult.Success(AuthTokens(body.token, body.refreshToken))
            }
            response.status == HttpStatusCode.Unauthorized -> RefreshResult.Rejected
            else -> RefreshResult.TransientFailure
        }
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        RefreshResult.TransientFailure
    }
}
```

- [ ] **Step 6: Ejecutarlos y ver que pasan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.TokenRefresherTest"
```

Expected: `BUILD SUCCESSFUL`, 7 tests.

- [ ] **Step 7: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/network shared/src/commonTest/kotlin/com/rubusai/app/core/network
git commit -m "feat(rubus-ai-kmp): TokenRefresher y cliente HTTP de refresh"
```

---

### Task 5: Cliente de la app — URL base y cabecera `Bearer`

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/HttpClientFactory.kt`
- Modify: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/NetworkTestSupport.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/HttpClientTest.kt`

Esta tarea deja el cliente sin refresh; lo añade la Task 6.

- [ ] **Step 1: Añadir el montaje común a las utilidades de test**

Añadir al final de `shared/src/commonTest/kotlin/com/rubusai/app/core/network/NetworkTestSupport.kt`:

```kotlin
/** Cliente de la app montado sobre un motor falso, con sus colaboradores a la vista. */
internal class ClientFixture(
    val client: HttpClient,
    val storage: InMemoryTokenStorage,
    val sessionEvents: SessionEvents,
)

/**
 * [handler] recibe todas las peticiones: las del cliente de la app y las de `auth/refresh`
 * que hace [TokenRefresher], porque ambos clientes comparten el motor.
 */
internal fun TestScope.clientFixture(
    tokens: AuthTokens? = AuthTokens("access-old", "refresh-old"),
    handler: MockRequestHandler,
): ClientFixture {
    val engine = mockEngine(handler)
    val storage = InMemoryTokenStorage(tokens)
    val sessionEvents = SessionEvents()
    val client = createHttpClient(
        engine = engine,
        logger = Logger.EMPTY,
        envConfig = testEnvConfig,
        tokenStorage = storage,
        tokenRefresher = TokenRefresher(createRefreshClient(engine, testEnvConfig)),
        sessionEvents = sessionEvents,
    )
    return ClientFixture(client, storage, sessionEvents)
}
```

Y estos imports, junto a los que ya tiene el archivo:

```kotlin
import com.rubusai.app.core.platform.InMemoryTokenStorage
import io.ktor.client.HttpClient
import io.ktor.client.plugins.logging.EMPTY
import io.ktor.client.plugins.logging.Logger
```

- [ ] **Step 2: Escribir los tests**

`shared/src/commonTest/kotlin/com/rubusai/app/core/network/HttpClientTest.kt`:

```kotlin
package com.rubusai.app.core.network

import io.ktor.client.engine.mock.respondOk
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.HttpHeaders
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.test.runTest

class HttpClientTest {

    // Test 1 de la spec.
    @Test
    fun unaPeticionAutenticadaLlevaElTokenDeAcceso() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("analyses")

        assertEquals("Bearer access-old", requests.single().headers[HttpHeaders.Authorization])
    }

    @Test
    fun sinTokensLaPeticionSaleSinCabecera() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(tokens = null) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("health")

        assertNull(requests.single().headers[HttpHeaders.Authorization])
    }

    @Test
    fun usaLosTokensGuardadosDespuesDeCrearElCliente() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(tokens = null) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("health")
        fixture.storage.save(AuthTokens("access-login", "refresh-login"))
        fixture.client.get("analyses")

        assertNull(requests[0].headers[HttpHeaders.Authorization])
        assertEquals("Bearer access-login", requests[1].headers[HttpHeaders.Authorization])
    }

    // Test 7 de la spec, parte de la cabecera.
    @Test
    fun lasRutasDeAuthSalenSinCabecera() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(AuthTokens("access-old", "refresh-old")) { request ->
            requests += request
            respondOk()
        }

        fixture.client.post("auth/login")
        fixture.client.post("auth/refresh")

        assertEquals(2, requests.size)
        assertNull(requests[0].headers[HttpHeaders.Authorization])
        assertNull(requests[1].headers[HttpHeaders.Authorization])
    }

    // Test 8 de la spec.
    @Test
    fun lasRutasRelativasSeResuelvenSobreLaUrlBase() = runTest {
        val requests = mutableListOf<HttpRequestData>()
        val fixture = clientFixture(tokens = null) { request ->
            requests += request
            respondOk()
        }

        fixture.client.get("health")

        assertEquals("$TEST_BASE_URL/health", requests.single().url.toString())
    }

    @Test
    fun isAuthRouteSoloReconoceLoginYRefreshBajoLaBase() {
        assertTrue(isAuthRoute("/api/v1/auth/login", basePath = "/api/v1/"))
        assertTrue(isAuthRoute("/api/v1/auth/refresh", basePath = "/api/v1/"))
        assertFalse(isAuthRoute("/api/v1/auth/me", basePath = "/api/v1/"))
        assertFalse(isAuthRoute("/api/v1/analyses", basePath = "/api/v1/"))
        assertFalse(isAuthRoute("/otra/auth/login", basePath = "/api/v1/"))
    }
}
```

- [ ] **Step 3: Ejecutarlos y ver que fallan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.HttpClientTest"
```

Expected: fallo de compilación, `Unresolved reference 'createHttpClient'` y `'isAuthRoute'`.

- [ ] **Step 4: Implementar el cliente de la app**

En `shared/src/commonMain/kotlin/com/rubusai/app/core/network/HttpClientFactory.kt`, añadir estos imports (manteniendo el orden alfabético con los existentes):

```kotlin
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.plugins.auth.Auth
import io.ktor.client.plugins.auth.providers.BearerTokens
import io.ktor.client.plugins.auth.providers.bearer
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.plugins.logging.Logging
import io.ktor.http.HttpHeaders
import io.ktor.http.Url
import io.ktor.http.encodedPath
```

Añadir, después de las constantes de timeout:

```kotlin
private val AUTH_ROUTES = listOf("auth/login", "auth/refresh")

/**
 * `true` si [encodedPath] es una ruta de login o de refresh bajo [basePath] (la ruta de la
 * URL base, terminada en `/`). Esas peticiones no llevan `Bearer` ni disparan refresh.
 */
internal fun isAuthRoute(encodedPath: String, basePath: String): Boolean {
    if (!encodedPath.startsWith(basePath)) return false
    val relative = encodedPath.removePrefix(basePath)
    return AUTH_ROUTES.any { relative.startsWith(it) }
}
```

Y al final del archivo:

```kotlin
/**
 * Cliente HTTP de la app. Añade el token de acceso a cada petición salvo a las rutas de
 * login y refresh. Lanza `ResponseException` ante cualquier respuesta que no sea 2xx.
 *
 * Los tokens se leen de [tokenStorage] en cada petición y no se cachean: quien guarde o
 * borre la sesión ahí no tiene que avisar al cliente.
 */
internal fun createHttpClient(
    engine: HttpClientEngine,
    logger: Logger,
    envConfig: EnvConfig,
    tokenStorage: SecureTokenStorage,
    tokenRefresher: TokenRefresher,
    sessionEvents: SessionEvents,
): HttpClient {
    val basePath = Url("${envConfig.apiBaseUrl}/").encodedPath
    return HttpClient(engine) {
        expectSuccess = true
        installBase(envConfig)
        install(Logging) {
            this.logger = logger
            // Nunca cuerpos: llevan tokens y datos del usuario.
            level = if (envConfig.environment == Environment.DEV) LogLevel.HEADERS else LogLevel.NONE
            sanitizeHeader { it == HttpHeaders.Authorization }
        }
        install(Auth) {
            bearer {
                cacheTokens = false
                loadTokens {
                    tokenStorage.read()?.let { BearerTokens(it.accessToken, it.refreshToken) }
                }
                sendWithoutRequest { request -> !isAuthRoute(request.url.encodedPath, basePath) }
            }
        }
    }
}
```

`tokenRefresher` y `sessionEvents` quedan sin usar hasta la Task 6; el aviso del compilador por parámetro sin usar es esperado en este commit.

- [ ] **Step 5: Ejecutarlos y ver que pasan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.HttpClientTest"
```

Expected: `BUILD SUCCESSFUL`, 6 tests.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/network shared/src/commonTest/kotlin/com/rubusai/app/core/network
git commit -m "feat(rubus-ai-kmp): cliente HTTP de la app con URL base y cabecera Bearer"
```

---

### Task 6: Cliente de la app — refresh ante un 401

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/HttpClientFactory.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/HttpClientRefreshTest.kt`

Reglas (sección 2 de la spec): un 401 dispara un refresh, se guarda el par nuevo y la petición original se reintenta una vez. Varios 401 simultáneos producen un solo refresh. Sesión rechazada: se borran los tokens, se emite `SessionEvents.expired` y la petición falla con su 401. Fallo transitorio: no se borra nada ni se emite evento, y la petición falla. Las rutas de auth no disparan refresh.

- [ ] **Step 1: Escribir los tests**

`shared/src/commonTest/kotlin/com/rubusai/app/core/network/HttpClientRefreshTest.kt`:

```kotlin
package com.rubusai.app.core.network

import io.ktor.client.engine.mock.MockRequestHandleScope
import io.ktor.client.engine.mock.respond
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.HttpRequestData
import io.ktor.client.request.HttpResponseData
import io.ktor.client.request.get
import io.ktor.client.request.post
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import io.ktor.http.headersOf
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest

class HttpClientRefreshTest {

    private val oldTokens = AuthTokens("access-old", "refresh-old")
    private val newTokens = AuthTokens("access-new", "refresh-new")

    private fun HttpRequestData.isRefresh() = url.encodedPath.endsWith("/auth/refresh")
    private fun HttpRequestData.authorization() = headers[HttpHeaders.Authorization]

    /** 200 si la petición trae el token nuevo; si no, [unauthorized]. */
    private fun MockRequestHandleScope.okOnlyWithNewToken(
        request: HttpRequestData,
        unauthorized: MockRequestHandleScope.() -> HttpResponseData = {
            respondError(HttpStatusCode.Unauthorized)
        },
    ): HttpResponseData =
        if (request.authorization() == "Bearer access-new") respondOk() else unauthorized()

    private fun TestScope.collectExpired(events: SessionEvents): List<Unit> {
        val received = mutableListOf<Unit>()
        backgroundScope.launch(UnconfinedTestDispatcher(testScheduler)) {
            events.expired.toList(received)
        }
        return received
    }

    // Test 2 de la spec.
    @Test
    fun un401RefrescaGuardaElParNuevoYReintentaUnaVez() = runTest {
        val dataRequests = mutableListOf<HttpRequestData>()
        var refreshCalls = 0
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                dataRequests += request
                okOnlyWithNewToken(request) {
                    respond(
                        content = "",
                        status = HttpStatusCode.Unauthorized,
                        headers = headersOf(HttpHeaders.WWWAuthenticate, "Bearer"),
                    )
                }
            }
        }

        val response = fixture.client.get("analyses")

        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(1, refreshCalls)
        assertEquals(newTokens, fixture.storage.read())
        assertEquals(
            listOf("Bearer access-old", "Bearer access-new"),
            dataRequests.map { it.authorization() },
        )
    }

    // Test 3 de la spec: el backend real no envía WWW-Authenticate.
    @Test
    fun un401SinWwwAuthenticateTambienRefresca() = runTest {
        var dataCalls = 0
        var refreshCalls = 0
        var unauthorizedHadHeader: Boolean? = null
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                dataCalls++
                okOnlyWithNewToken(request) {
                    respondError(HttpStatusCode.Unauthorized).also {
                        unauthorizedHadHeader = it.headers.contains(HttpHeaders.WWWAuthenticate)
                    }
                }
            }
        }

        val response = fixture.client.get("analyses")

        assertEquals(false, unauthorizedHadHeader)
        assertEquals(HttpStatusCode.OK, response.status)
        assertEquals(1, refreshCalls)
        assertEquals(2, dataCalls)
        assertEquals(newTokens, fixture.storage.read())
    }

    @Test
    fun siElReintentoTambienDa401NoHaySegundoRefresh() = runTest {
        var dataCalls = 0
        var refreshCalls = 0
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                dataCalls++
                respondError(HttpStatusCode.Unauthorized)
            }
        }

        val error = assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(HttpStatusCode.Unauthorized, error.response.status)
        assertEquals(1, refreshCalls)
        assertEquals(2, dataCalls)
    }

    // Test 4 de la spec.
    @Test
    fun tres401SimultaneosProducenUnSoloRefresh() = runTest {
        var refreshCalls = 0
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                refreshCalls++
                respondNewTokens()
            } else {
                okOnlyWithNewToken(request)
            }
        }

        val responses = listOf("analyses", "campos", "solicitudes")
            .map { path -> async { fixture.client.get(path) } }
            .awaitAll()

        assertEquals(List(3) { HttpStatusCode.OK }, responses.map { it.status })
        assertEquals(1, refreshCalls)
        assertEquals(newTokens, fixture.storage.read())
    }

    // Test 5 de la spec.
    @Test
    fun refreshRechazadoBorraLaSesionYEmiteElEvento() = runTest {
        val fixture = clientFixture(oldTokens) { respondError(HttpStatusCode.Unauthorized) }
        val expired = collectExpired(fixture.sessionEvents)

        val error = assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(HttpStatusCode.Unauthorized, error.response.status)
        assertNull(fixture.storage.read())
        assertEquals(1, expired.size)
    }

    // Test 6 de la spec, error de red.
    @Test
    fun refreshConErrorDeRedConservaLaSesion() = runTest {
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) throw FakeNetworkException()
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    // Test 6 de la spec, 429.
    @Test
    fun refreshCon429ConservaLaSesion() = runTest {
        val fixture = clientFixture(oldTokens) { request ->
            if (request.isRefresh()) {
                respondError(HttpStatusCode.TooManyRequests)
            } else {
                respondError(HttpStatusCode.Unauthorized)
            }
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    // Test 7 de la spec, parte del refresh.
    @Test
    fun un401EnLasRutasDeAuthNoDisparaRefresh() = runTest {
        val paths = mutableListOf<String>()
        val fixture = clientFixture(oldTokens) { request ->
            paths += request.url.encodedPath
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.post("auth/login") }
        assertFailsWith<ClientRequestException> { fixture.client.post("auth/refresh") }

        assertEquals(listOf("/api/v1/auth/login", "/api/v1/auth/refresh"), paths)
        assertEquals(oldTokens, fixture.storage.read())
        assertEquals(0, expired.size)
    }

    @Test
    fun un401SinTokensGuardadosNoLlamaAlRefresh() = runTest {
        val paths = mutableListOf<String>()
        val fixture = clientFixture(tokens = null) { request ->
            paths += request.url.encodedPath
            respondError(HttpStatusCode.Unauthorized)
        }
        val expired = collectExpired(fixture.sessionEvents)

        assertFailsWith<ClientRequestException> { fixture.client.get("analyses") }

        assertEquals(listOf("/api/v1/analyses"), paths)
        assertEquals(0, expired.size)
    }
}
```

- [ ] **Step 2: Ejecutarlos y ver que fallan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.HttpClientRefreshTest"
```

Expected: compila y fallan los tests que esperan un refresh: `un401RefrescaGuardaElParNuevoYReintentaUnaVez`, `un401SinWwwAuthenticateTambienRefresca`, `siElReintentoTambienDa401NoHaySegundoRefresh`, `tres401SimultaneosProducenUnSoloRefresh` y `refreshRechazadoBorraLaSesionYEmiteElEvento` (lanzan `ClientRequestException` o no cumplen las aserciones). Los que comprueban que la sesión se conserva pueden pasar ya; es correcto.

- [ ] **Step 3: Implementar el refresh**

En `shared/src/commonMain/kotlin/com/rubusai/app/core/network/HttpClientFactory.kt`, añadir el import:

```kotlin
import io.ktor.http.HttpStatusCode
```

Y sustituir el bloque `install(Auth) { ... }` completo por:

```kotlin
        install(Auth) {
            // El backend no envía WWW-Authenticate en sus 401; con un solo proveedor,
            // Auth refresca igualmente.
            reAuthorizeOnResponse { response ->
                response.status == HttpStatusCode.Unauthorized &&
                    !isAuthRoute(response.request.url.encodedPath, basePath)
            }
            bearer {
                cacheTokens = false
                loadTokens {
                    tokenStorage.read()?.let { BearerTokens(it.accessToken, it.refreshToken) }
                }
                sendWithoutRequest { request -> !isAuthRoute(request.url.encodedPath, basePath) }
                // Auth serializa esta llamada: con varios 401 a la vez, solo el primero
                // llega aquí y los demás se reintentan con el par que este guarde.
                refreshTokens {
                    val refreshToken = oldTokens?.refreshToken ?: return@refreshTokens null
                    when (val result = tokenRefresher.refresh(refreshToken)) {
                        is RefreshResult.Success -> {
                            tokenStorage.save(result.tokens)
                            BearerTokens(result.tokens.accessToken, result.tokens.refreshToken)
                        }
                        RefreshResult.Rejected -> {
                            tokenStorage.clear()
                            sessionEvents.notifyExpired()
                            null
                        }
                        RefreshResult.TransientFailure -> null
                    }
                }
            }
        }
```

Actualizar el KDoc de `createHttpClient` para que describa el refresh. Queda así:

```kotlin
/**
 * Cliente HTTP de la app. Añade el token de acceso a cada petición salvo a las rutas de
 * login y refresh. Ante un 401 pide un par nuevo con [tokenRefresher], lo guarda y
 * reintenta la petición una vez. Si el backend rechaza el refresh, borra la sesión y
 * avisa por [sessionEvents]; si el refresh falla por otra causa, la sesión se conserva.
 * En ambos casos la petición original falla con su 401.
 * Lanza `ResponseException` ante cualquier respuesta que no sea 2xx.
 *
 * Los tokens se leen de [tokenStorage] en cada petición y no se cachean: quien guarde o
 * borre la sesión ahí no tiene que avisar al cliente.
 */
```

- [ ] **Step 4: Ejecutar todos los tests de red**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.network.*"
```

Expected: `BUILD SUCCESSFUL`: 9 tests de `HttpClientRefreshTest`, 6 de `HttpClientTest`, 7 de `TokenRefresherTest` y 2 de `SessionEventsTest`.

Si `un401SinWwwAuthenticateTambienRefresca` o `tres401SimultaneosProducenUnSoloRefresh` fallan con este código exacto, **parar y avisar al usuario** con la salida del test (decisión 5 de "Antes de empezar"). No cambiar los tests ni escribir un plugin propio por cuenta propia.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/network shared/src/commonTest/kotlin/com/rubusai/app/core/network
git commit -m "feat(rubus-ai-kmp): refresh de token serializado ante un 401"
```

---

### Task 7: `DataStoreTokenStorage` (Android)

**Files:**
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/TokenCipher.kt`
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/DataStoreTokenStorage.kt`
- Delete: `shared/src/androidHostTest/kotlin/com/rubusai/app/SharedLogicAndroidHostTest.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/core/platform/DataStoreTokenStorageTest.kt`

El test usa un DataStore real sobre un archivo temporal (en la JVM no hace falta `Context`) y un cifrado falso. El archivo de un DataStore Preferences debe terminar en `.preferences_pb`.

- [ ] **Step 1: Escribir los tests**

`shared/src/androidHostTest/kotlin/com/rubusai/app/core/platform/DataStoreTokenStorageTest.kt`:

```kotlin
package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import com.rubusai.app.core.network.AuthTokens
import java.io.File
import java.nio.file.Files
import kotlin.io.encoding.Base64
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class DataStoreTokenStorageTest {

    /** Invierte los bytes: reversible y distinto del texto original. */
    private class ReversingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain.reversedArray()
        override fun decrypt(data: ByteArray): ByteArray = data.reversedArray()
    }

    private class FailingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw IllegalStateException("clave perdida")
    }

    private val directory: File = Files.createTempDirectory("session-test").toFile()

    @AfterTest
    fun tearDown() {
        directory.deleteRecursively()
    }

    private fun TestScope.newDataStore(): DataStore<Preferences> =
        PreferenceDataStoreFactory.create(scope = backgroundScope) {
            File(directory, "session.preferences_pb")
        }

    private suspend fun DataStore<Preferences>.storedValue(): String? =
        data.first()[DataStoreTokenStorage.TOKENS_KEY]

    @Test
    fun sinNadaGuardadoDevuelveNull() = runTest {
        val storage = DataStoreTokenStorage(newDataStore(), ReversingCipher())

        assertNull(storage.read())
    }

    @Test
    fun guardaYLeeElPar() = runTest {
        val storage = DataStoreTokenStorage(newDataStore(), ReversingCipher())

        storage.save(AuthTokens("access-1", "refresh-1"))

        assertEquals(AuthTokens("access-1", "refresh-1"), storage.read())
    }

    @Test
    fun loGuardadoNoContieneLosTokensEnClaro() = runTest {
        val dataStore = newDataStore()
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())

        storage.save(AuthTokens("access-1", "refresh-1"))

        val stored = dataStore.storedValue()!!
        assertFalse(stored.contains("access-1"))
        assertFalse(stored.contains("refresh-1"))
        // Lo guardado es el JSON cifrado y codificado en Base64.
        assertEquals(
            """{"accessToken":"access-1","refreshToken":"refresh-1"}""",
            Base64.decode(stored).reversedArray().decodeToString(),
        )
    }

    @Test
    fun borrarEliminaLoGuardado() = runTest {
        val dataStore = newDataStore()
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())
        storage.save(AuthTokens("access-1", "refresh-1"))

        storage.clear()

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }

    @Test
    fun siElDescifradoFallaBorraLoGuardadoYDevuelveNull() = runTest {
        val dataStore = newDataStore()
        DataStoreTokenStorage(dataStore, ReversingCipher()).save(AuthTokens("access-1", "refresh-1"))
        val storage = DataStoreTokenStorage(dataStore, FailingCipher())

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }

    @Test
    fun siLoDescifradoNoEsElJsonEsperadoBorraLoGuardadoYDevuelveNull() = runTest {
        val dataStore = newDataStore()
        val notJson = Base64.encode("esto no es json".encodeToByteArray().reversedArray())
        dataStore.edit { it[DataStoreTokenStorage.TOKENS_KEY] = notJson }
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }

    @Test
    fun siLoGuardadoNoEsBase64BorraLoGuardadoYDevuelveNull() = runTest {
        val dataStore = newDataStore()
        dataStore.edit { it[DataStoreTokenStorage.TOKENS_KEY] = "¡¡no es base64!!" }
        val storage = DataStoreTokenStorage(dataStore, ReversingCipher())

        assertNull(storage.read())
        assertNull(dataStore.storedValue())
    }
}
```

- [ ] **Step 2: Borrar el test de plantilla del source set**

```bash
git rm shared/src/androidHostTest/kotlin/com/rubusai/app/SharedLogicAndroidHostTest.kt
```

Es el `assertEquals(3, 1 + 2)` de la plantilla; ya hay un test real en `androidHostTest`.

- [ ] **Step 3: Ejecutarlos y ver que fallan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.DataStoreTokenStorageTest"
```

Expected: fallo de compilación, `Unresolved reference 'TokenCipher'` y `'DataStoreTokenStorage'`.

- [ ] **Step 4: Implementar**

`shared/src/androidMain/kotlin/com/rubusai/app/core/platform/TokenCipher.kt`:

```kotlin
package com.rubusai.app.core.platform

/** Cifrado simétrico de lo que se guarda en disco. Separado del almacenamiento para poder probarlo sin Keystore. */
internal interface TokenCipher {
    fun encrypt(plain: ByteArray): ByteArray

    /** Lanza si [data] no se cifró con la clave actual o está corrupto. */
    fun decrypt(data: ByteArray): ByteArray
}
```

`shared/src/androidMain/kotlin/com/rubusai/app/core/platform/DataStoreTokenStorage.kt`:

```kotlin
package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.rubusai.app.core.network.AuthTokens
import kotlin.io.encoding.Base64
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

/**
 * Guarda los dos tokens en una sola entrada de DataStore: el JSON de [AuthTokens],
 * cifrado con [cipher] y codificado en Base64. Al ser una entrada, se escriben y se
 * borran de forma atómica.
 */
internal class DataStoreTokenStorage(
    private val dataStore: DataStore<Preferences>,
    private val cipher: TokenCipher,
) : SecureTokenStorage {

    override suspend fun read(): AuthTokens? {
        val stored = dataStore.data.first()[TOKENS_KEY] ?: return null
        val tokens = try {
            Json.decodeFromString<AuthTokens>(cipher.decrypt(Base64.decode(stored)).decodeToString())
        } catch (e: Exception) {
            // Clave del Keystore perdida, dato corrupto o formato antiguo: no hay forma
            // de recuperarlo, así que se descarta y el usuario vuelve a iniciar sesión.
            null
        }
        if (tokens == null) clear()
        return tokens
    }

    override suspend fun save(tokens: AuthTokens) {
        val encrypted = cipher.encrypt(Json.encodeToString(tokens).encodeToByteArray())
        val encoded = Base64.encode(encrypted)
        dataStore.edit { it[TOKENS_KEY] = encoded }
    }

    override suspend fun clear() {
        dataStore.edit { it.remove(TOKENS_KEY) }
    }

    internal companion object {
        /** Nombre del DataStore Preferences donde vive la sesión. */
        const val DATASTORE_NAME = "session"
        val TOKENS_KEY = stringPreferencesKey("tokens")
    }
}
```

El `try` no contiene ninguna llamada `suspend`, así que no puede tragarse una `CancellationException`.

- [ ] **Step 5: Ejecutarlos y ver que pasan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.DataStoreTokenStorageTest"
```

Expected: `BUILD SUCCESSFUL`, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add shared/src/androidMain/kotlin/com/rubusai/app/core/platform shared/src/androidHostTest
git commit -m "feat(rubus-ai-kmp): DataStoreTokenStorage con el contenido cifrado"
```

---

### Task 8: `KeystoreTokenCipher` (Android)

**Files:**
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/KeystoreTokenCipher.kt`
- Test: `shared/src/androidDeviceTest/kotlin/com/rubusai/app/core/platform/KeystoreTokenCipherTest.kt`

El Android Keystore solo existe en un dispositivo o emulador, así que este test es instrumentado. En esta máquina solo se compila; ejecutarlo queda pendiente para el usuario (`./gradlew :shared:connectedAndroidDeviceTest`).

- [ ] **Step 1: Escribir el test**

`shared/src/androidDeviceTest/kotlin/com/rubusai/app/core/platform/KeystoreTokenCipherTest.kt`:

```kotlin
package com.rubusai.app.core.platform

import java.security.KeyStore
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse

class KeystoreTokenCipherTest {

    private val alias = "rubus_session_key_test"
    private val cipher = KeystoreTokenCipher(alias)
    private val plain = """{"accessToken":"access-1","refreshToken":"refresh-1"}""".encodeToByteArray()

    @AfterTest
    fun tearDown() {
        KeyStore.getInstance("AndroidKeyStore").apply { load(null) }.deleteEntry(alias)
    }

    @Test
    fun loCifradoSeDescifraAlValorOriginal() {
        assertContentEquals(plain, cipher.decrypt(cipher.encrypt(plain)))
    }

    @Test
    fun dosCifradosDelMismoValorDifieren() {
        assertFalse(cipher.encrypt(plain).contentEquals(cipher.encrypt(plain)))
    }

    @Test
    fun otraInstanciaConElMismoAliasDescifra() {
        val encrypted = cipher.encrypt(plain)

        assertContentEquals(plain, KeystoreTokenCipher(alias).decrypt(encrypted))
    }

    @Test
    fun unDatoManipuladoNoSeDescifra() {
        val encrypted = cipher.encrypt(plain)
        encrypted[encrypted.lastIndex] = (encrypted.last().toInt() xor 0x01).toByte()

        assertFailsWith<Exception> { cipher.decrypt(encrypted) }
    }

    @Test
    fun unDatoDemasiadoCortoNoSeDescifra() {
        assertFailsWith<IllegalArgumentException> { cipher.decrypt(ByteArray(4)) }
    }
}
```

- [ ] **Step 2: Compilarlo y ver que falla**

```bash
./gradlew :shared:assembleAndroidDeviceTest
```

Expected: fallo de compilación, `Unresolved reference 'KeystoreTokenCipher'`.

- [ ] **Step 3: Implementar**

`shared/src/androidMain/kotlin/com/rubusai/app/core/platform/KeystoreTokenCipher.kt`:

```kotlin
package com.rubusai.app.core.platform

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * AES-256-GCM con una clave que vive en el Android Keystore y nunca sale de él.
 * Cada cifrado usa un IV aleatorio, que se antepone al resultado: `IV (12 bytes) + cifrado`.
 *
 * La clave no entra en las copias de seguridad ni sobrevive a una reinstalación: lo
 * cifrado antes deja de poder leerse.
 */
internal class KeystoreTokenCipher(private val alias: String = DEFAULT_ALIAS) : TokenCipher {

    private val keyStore: KeyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }

    override fun encrypt(plain: ByteArray): ByteArray {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key())
        return cipher.iv + cipher.doFinal(plain)
    }

    override fun decrypt(data: ByteArray): ByteArray {
        require(data.size > IV_SIZE_BYTES) { "Dato cifrado demasiado corto" }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(TAG_SIZE_BITS, data, 0, IV_SIZE_BYTES))
        return cipher.doFinal(data, IV_SIZE_BYTES, data.size - IV_SIZE_BYTES)
    }

    // Sincronizado para que dos hilos no generen la clave a la vez en el primer uso.
    @Synchronized
    private fun key(): SecretKey =
        (keyStore.getKey(alias, null) as? SecretKey) ?: generateKey()

    private fun generateKey(): SecretKey {
        val spec = KeyGenParameterSpec.Builder(
            alias,
            KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
            .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
            .setKeySize(KEY_SIZE_BITS)
            .build()
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
            .apply { init(spec) }
            .generateKey()
    }

    private companion object {
        const val DEFAULT_ALIAS = "rubus_session_key"
        const val ANDROID_KEYSTORE = "AndroidKeyStore"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val KEY_SIZE_BITS = 256
        const val IV_SIZE_BYTES = 12
        const val TAG_SIZE_BITS = 128
    }
}
```

- [ ] **Step 4: Compilar el test instrumentado y volver a pasar los tests de la JVM**

```bash
./gradlew :shared:assembleAndroidDeviceTest :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Ejecutar el test instrumentado solo si hay dispositivo**

```bash
adb devices
```

Si la lista tiene al menos un dispositivo en estado `device`:

```bash
./gradlew :shared:connectedAndroidDeviceTest
```

Expected: `BUILD SUCCESSFUL`. Con `sourceSetTreeName = "test"`, esta tarea ejecuta también los tests de `commonTest` en el dispositivo.

Si la lista está vacía o `adb` no existe, no ejecutar nada y anotar para el informe final: "test 12 compilado, sin ejecutar".

- [ ] **Step 6: Commit**

```bash
git add shared/src/androidMain/kotlin/com/rubusai/app/core/platform shared/src/androidDeviceTest
git commit -m "feat(rubus-ai-kmp): KeystoreTokenCipher con AES-256-GCM del Android Keystore"
```

---

### Task 9: Koin

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Modify: `shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt`
- Modify: `shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`

Cada módulo de plataforma debe aportar tres cosas que `networkModule()` consume: `HttpClientEngine`, `Logger` (de Ktor) y `SecureTokenStorage`.

- [ ] **Step 1: Escribir el test**

En `shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`, añadir estos imports:

```kotlin
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.HttpClient
import com.rubusai.app.core.network.mockEngine
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.mock.respondOk
import io.ktor.client.plugins.logging.EMPTY
import io.ktor.client.plugins.logging.Logger
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import kotlin.test.assertSame
import kotlinx.coroutines.test.runTest
```

Y este test dentro de la clase (test 10 de la spec):

```kotlin
    @Test
    fun elGrafoResuelveElHttpClientConUnModuloDePlataformaDePrueba() = runTest {
        // mockEngine y no MockEngine { }: responde en el dispatcher del test.
        val engine = mockEngine { respondOk() }
        val platformModule = module {
            single<HttpClientEngine> { engine }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val client = app.koin.get<HttpClient>()

            assertSame(client, app.koin.get<HttpClient>())
            app.koin.get<SessionEvents>()
            app.koin.get<TokenRefresher>()
            assertEquals(HttpStatusCode.OK, client.get("health").status)
        } finally {
            app.close()
        }
    }
```

- [ ] **Step 2: Ejecutarlo y ver que falla**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.di.KoinGraphTest"
```

Expected: FAIL con `NoDefinitionFoundException` (o `NoBeanDefFoundException`) para `io.ktor.client.HttpClient`.

- [ ] **Step 3: Implementar `networkModule()`**

`shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt` (contenido completo):

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.network.createHttpClient
import com.rubusai.app.core.network.createRefreshClient
import org.koin.core.module.Module
import org.koin.dsl.module

internal fun configModule(environment: Environment, devHost: String): Module {
    // Se crea aquí y no dentro del `single` para que una configuración inválida
    // falle en el arranque y no en la primera inyección.
    val config = EnvConfig(environment, devHost)
    return module { single { config } }
}

/**
 * Cliente HTTP de la app y sus colaboradores. El motor, el `Logger` de Ktor y
 * `SecureTokenStorage` los aporta el módulo de cada plataforma.
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun networkModule(): Module = module {
    single { SessionEvents() }
    // Su cliente no se registra en el grafo: solo debe usarlo TokenRefresher.
    single { TokenRefresher(createRefreshClient(engine = get(), envConfig = get())) }
    single {
        createHttpClient(
            engine = get(),
            logger = get(),
            envConfig = get(),
            tokenStorage = get(),
            tokenRefresher = get(),
            sessionEvents = get(),
        )
    }
}

internal val databaseModule: Module = module { }
internal val repositoryModule: Module = module { }
internal val viewModelModule: Module = module { }

internal fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule(),
    databaseModule,
    repositoryModule,
    viewModelModule,
)
```

- [ ] **Step 4: Ejecutar los tests de Koin y ver que pasan**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.di.*"
```

Expected: `BUILD SUCCESSFUL`. Los tests anteriores (`KoinGraphTest` con módulo de plataforma vacío y `KoinInitTest`) siguen pasando: los `single` son perezosos y esos tests no piden el `HttpClient`.

- [ ] **Step 5: Módulo de plataforma de Android**

`shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt` (contenido completo):

```kotlin
package com.rubusai.app.core.di

import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.preferencesDataStoreFile
import com.rubusai.app.core.platform.DataStoreTokenStorage
import com.rubusai.app.core.platform.KeystoreTokenCipher
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.TokenCipher
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.logging.ANDROID
import io.ktor.client.plugins.logging.Logger
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module

/** Implementaciones de `core/platform` y piezas de red propias de Android. */
internal val androidPlatformModule: Module = module {
    single<HttpClientEngine> { OkHttp.create() }
    single<Logger> { Logger.ANDROID }
    single<TokenCipher> { KeystoreTokenCipher() }
    single<SecureTokenStorage> {
        val context = androidContext()
        DataStoreTokenStorage(
            // Un solo DataStore por archivo y proceso: por eso vive dentro de este `single`.
            dataStore = PreferenceDataStoreFactory.create {
                context.preferencesDataStoreFile(DataStoreTokenStorage.DATASTORE_NAME)
            },
            cipher = get(),
        )
    }
}
```

- [ ] **Step 6: Módulo de plataforma de iOS**

`shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt` (contenido completo):

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.darwin.Darwin
import io.ktor.client.plugins.logging.Logger
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Implementaciones de `core/platform` y piezas de red propias de iOS.
 * La sesión se guarda en memoria y se pierde al cerrar la app hasta que exista
 * la implementación con Keychain (fase 9).
 */
internal val iosPlatformModule: Module = module {
    single<HttpClientEngine> { Darwin.create() }
    single<Logger> {
        object : Logger {
            override fun log(message: String) = println(message)
        }
    }
    single<SecureTokenStorage> { InMemoryTokenStorage() }
}
```

Este archivo no se compila en Linux. Queda sin verificar, igual que el resto de `iosMain`.

- [ ] **Step 7: Compilar Android y pasar todos los tests**

```bash
./gradlew :androidApp:assembleDevDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 8: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/di shared/src/androidMain/kotlin/com/rubusai/app/core/di shared/src/iosMain/kotlin/com/rubusai/app/core/di shared/src/commonTest/kotlin/com/rubusai/app/core/di
git commit -m "feat(rubus-ai-kmp): registrar el cliente HTTP y el almacenamiento de sesión en Koin"
```

---

### Task 10: Manifiesto y petición de prueba

**Files:**
- Modify: `androidApp/src/main/AndroidManifest.xml`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/App.kt`

- [ ] **Step 1: Manifiesto**

`androidApp/src/main/AndroidManifest.xml` (contenido completo):

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <!-- allowBackup="false": la clave del Keystore que cifra la sesión no entra en las
         copias de seguridad, así que una sesión restaurada sería ilegible. -->
    <application
        android:name=".RubusApplication"
        android:allowBackup="false"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">
        <activity
            android:exported="true"
            android:name=".MainActivity">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />

                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
```

- [ ] **Step 2: Pantalla provisional**

`shared/src/commonMain/kotlin/com/rubusai/app/App.kt` (contenido completo):

```kotlin
package com.rubusai.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.theme.RubusTheme
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

// Pantalla provisional: comprueba a simple vista que flavor, Koin, tema y red están
// conectados. La sustituye la navegación.
@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()
    val httpClient = koinInject<HttpClient>()
    val scope = rememberCoroutineScope()
    var checking by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }

    RubusTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .safeDrawingPadding()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = envConfig.environment.name,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = envConfig.apiBaseUrl,
                    style = MaterialTheme.typography.bodyLarge,
                )
                RubusButton(
                    text = "Probar conexión",
                    enabled = !checking,
                    onClick = {
                        checking = true
                        result = null
                        scope.launch {
                            result = checkConnection(httpClient)
                            checking = false
                        }
                    },
                )
                result?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodyLarge,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }
    }
}

/** `GET health` contra el backend: "Conectado" o el mensaje del error. */
private suspend fun checkConnection(client: HttpClient): String = try {
    client.get("health")
    "Conectado"
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    e.message ?: e::class.simpleName ?: "Error desconocido"
}
```

- [ ] **Step 3: Compilar los tres flavors en debug y release, y pasar todos los tests**

```bash
./gradlew :androidApp:assemble :shared:testAndroidHostTest :shared:assembleAndroidDeviceTest
```

Expected: `BUILD SUCCESSFUL`. `:androidApp:assemble` construye las seis variantes (`dev`, `staging` y `prod` en debug y release).

- [ ] **Step 4: Comprobar el manifiesto fusionado**

```bash
grep -c 'android.permission.INTERNET' androidApp/build/intermediates/merged_manifests/prodRelease/processProdReleaseManifest/AndroidManifest.xml
grep -o 'android:allowBackup="[a-z]*"' androidApp/build/intermediates/merged_manifests/prodRelease/processProdReleaseManifest/AndroidManifest.xml
```

Expected: `1` y `android:allowBackup="false"`. Si la ruta no existe, localizarla con `find androidApp/build/intermediates -path '*prodRelease*' -name AndroidManifest.xml` y repetir sobre el archivo de `merged_manifests`.

- [ ] **Step 5: Probar en dispositivo solo si hay uno**

```bash
adb devices
```

Si hay un dispositivo en estado `device` y el backend local está levantado (`curl -s -o /dev/null -w '%{http_code}\n' http://localhost:3001/api/v1/health` imprime `200`):

```bash
./gradlew :androidApp:installDevDebug
```

Abrir la app, pulsar "Probar conexión" y comprobar que aparece "Conectado". En un teléfono físico hace falta `rubus.devHost=<IP de esta máquina en la LAN>` en `local.properties`.

Si no hay dispositivo o el backend no está levantado, no ejecutar nada y anotar para el informe final: "petición de prueba sin comprobar en dispositivo".

- [ ] **Step 6: Commit**

```bash
git add androidApp/src/main/AndroidManifest.xml shared/src/commonMain/kotlin/com/rubusai/app/App.kt
git commit -m "feat(rubus-ai-kmp): permiso INTERNET, sin copias de seguridad y botón de probar conexión"
```

---

### Task 11: Documentación

**Files:**
- Modify: `docs/dependencias-pendientes.md`
- Modify: `docs/roadmap-migracion-kmp.md`
- Modify: `README.md`

Las rutas son relativas a `rubus-ai-kmp/`. Cada paso da el texto exacto a sustituir.

- [ ] **Step 1: `docs/dependencias-pendientes.md` — librerías con código que las usa**

Sustituir el párrafo que empieza por `Solo \`koin-core\`, \`koin-compose\` y \`koin-android\` tienen código que los usa.` por:

```markdown
Tienen código que las usa: Koin (`koin-core`, `koin-compose`, `koin-android`), Ktor Client (`core`, `content-negotiation`, `serialization-kotlinx-json`, `auth`, `logging` y los motores OkHttp y Darwin), kotlinx.serialization, kotlinx.coroutines y DataStore Preferences. Las demás (WebSockets de Ktor, kotlinx-datetime, Navigation Compose, Room, Coil, Play Services Location) están resueltas y empaquetadas en el APK, pero su uso real desde el proyecto está sin probar hasta que llegue su primera capa.

De test, en `commonTest`: `ktor-client-mock` y `kotlinx-coroutines-test`. En `androidDeviceTest`: `androidx.test.ext:junit` y `espresso-core` (este último solo porque arrastra `androidx.test:runner`).
```

- [ ] **Step 2: `docs/dependencias-pendientes.md` — tabla de pendientes**

Sustituir la fila

```markdown
| `kotlinx-coroutines-test`, `ktor-client-mock`, `koin-test`, `room-testing` | Con el primer test que las necesite | Son las únicas resoluciones del roadmap sin validar contra este toolchain |
```

por

```markdown
| `koin-test`, `room-testing` | Con el primer test que las necesite | Son las únicas resoluciones del roadmap sin validar contra este toolchain |
```

- [ ] **Step 3: `docs/dependencias-pendientes.md` — notas de primer uso**

En la sección `## Qué hacer al usar cada librería por primera vez`, borrar los dos puntos completos que empiezan por `- **Ktor (sub-proyecto de red).**` y `- **Almacenamiento de la sesión (sub-proyecto de red).**` (ya están resueltos), y poner en su lugar:

```markdown
- **Peticiones HTTP.** Inyectar el `HttpClient` de Koin y pedir rutas relativas sin barra inicial (`client.get("analyses")`); con barra, Ktor descarta el `/api/v1` de la URL base. El cliente lanza `ResponseException` ante cualquier respuesta que no sea 2xx. No crear otros `HttpClient`: el refresh de token solo está en este.
- **Sesión (fase 1).** `SecureTokenStorage` es la única fuente de verdad de los tokens y el cliente los lee en cada petición: tras el login basta con `save(...)` y en el logout con `clear()`. Escuchar `SessionEvents.expired` para llevar al usuario al login cuando el backend rechaza el refresh. Las peticiones a `auth/login` y `auth/refresh` no llevan `Bearer` ni disparan refresh; `auth/logout` y `auth/me` sí.
- **Tests de red.** Usar `mockEngine { }` de `core/network/NetworkTestSupport.kt` y no `MockEngine { }` directamente: con `runTest`, un motor que responde fuera del dispatcher del test puede disparar los timeouts de `HttpTimeout` por el tiempo virtual.
```

En la misma sección, sustituir el punto que empieza por `- **Koin.**` por:

```markdown
- **Koin.** `networkModule()` ya es función. `databaseModule`, `repositoryModule` y `viewModelModule` siguen siendo `val` vacíos en `core/di/AppModule.kt`: convertirlos en funciones cuando tengan `single` reales. Cada módulo de plataforma debe aportar `HttpClientEngine`, el `Logger` de Ktor y `SecureTokenStorage`. En cualquier test que arranque Koin con `initKoin`, parar el contexto con `stopKoin()` en un `@AfterTest`: el contexto global se registra antes de ejecutar la declaración.
```

- [ ] **Step 4: `docs/dependencias-pendientes.md` — sin verificar**

En la sección `## Sin verificar`, añadir al final de la lista:

```markdown
- **Cifrado de la sesión.** `KeystoreTokenCipherTest` (`shared/src/androidDeviceTest`) compila pero no se ha ejecutado: necesita un emulador o un teléfono. Se lanza con `./gradlew :shared:connectedAndroidDeviceTest`.
- **Petición de prueba.** El botón "Probar conexión" de la pantalla provisional no se ha pulsado contra el backend local en un dispositivo.
- **Coste de leer la sesión.** El cliente descifra los tokens con el Keystore en cada petición. Medirlo en un teléfono de gama baja en la fase 2; si pesa, cachear el par en memoria dentro de `DataStoreTokenStorage`.
```

Si en la Task 8 o en la Task 10 sí hubo dispositivo y la comprobación salió bien, no añadir el punto correspondiente.

- [ ] **Step 5: `docs/roadmap-migracion-kmp.md` — registro de usuarios descartado**

En la tabla `## Bloqueos que dependen de ti`, sustituir la fila

```markdown
| Confirmar si el registro de usuarios sigue vigente (ver "Dudas abiertas") | Fase 1 |
```

por

```markdown
| ~~Confirmar si el registro de usuarios sigue vigente~~ — resuelto el 2026-10-09: se descarta, `POST /auth/register` exige rol `ADMIN` | — |
```

En `### Fase 1 — Auth y splash`, sustituir `\`feature/auth\` (login y, si se confirma, registro)` por `\`feature/auth\` (solo login; el registro se descarta)`, y borrar la línea de riesgos `- El registro actual no guarda refresh token; hay que confirmar qué devuelve el backend.`

En `## Dudas abiertas sobre el código Flutter`, sustituir el punto 1 completo por:

```markdown
1. ~~**Registro de usuarios.**~~ Resuelto el 2026-10-09: no se migra. `POST /auth/register` exige rol `ADMIN`, así que una pantalla de registro pública no puede funcionar; los usuarios se crean desde el panel de `zarza-web`. `RegisterScreen` y el caso de uso `Register` de Flutter no se portan.
```

- [ ] **Step 6: `docs/roadmap-migracion-kmp.md` — estado de la fase 0**

En `### Fase 0 — Fundaciones`, sustituir estas tres líneas de "Qué se migra":

```markdown
- `core/network`: cliente Ktor con JSON, timeouts, cabecera `Bearer` y refresh de token.
- `core/datastore` y `core/platform`: `SecureTokenStorage` para Android.
```

```markdown
- `core/model`: `User`, `UserRole`.
```

por, respectivamente:

```markdown
- `core/network`: cliente Ktor con JSON, timeouts, cabecera `Bearer` y refresh de token. Hecho el 2026-10-09.
- `core/platform`: `SecureTokenStorage` para Android (DataStore cifrado con una clave del Keystore). Hecho el 2026-10-09; en iOS es en memoria hasta la fase 9.
```

```markdown
- `core/model`: `User`, `UserRole`. Hecho el 2026-10-09.
```

Y añadir al final de la lista de **Riesgos** de la misma fase:

```markdown
- ~~El plugin `Auth` de Ktor decide el refresh a partir de `WWW-Authenticate`, que el backend no envía.~~ Resuelto el 2026-10-09: con un solo proveedor registrado refresca igualmente; lo fija `HttpClientRefreshTest`.
```

- [ ] **Step 7: `README.md` — tests instrumentados**

En la sección `### Running tests`, después de la línea `- Android tests: \`./gradlew :shared:testAndroidHostTest\``, añadir:

```markdown
- Android instrumented tests (need an emulator or a device): `./gradlew :shared:connectedAndroidDeviceTest`
```

- [ ] **Step 8: Revisar el resultado**

```bash
git diff --stat && grep -n "sub-proyecto de red" docs/dependencias-pendientes.md
```

Expected: tres archivos modificados y ninguna línea del `grep` (las notas "sub-proyecto de red" ya no existen).

- [ ] **Step 9: Commit**

```bash
git add docs/dependencias-pendientes.md docs/roadmap-migracion-kmp.md README.md
git commit -m "docs(rubus-ai-kmp): estado tras el cliente HTTP y descarte del registro de usuarios"
```

---

### Task 12: Verificación final y merge

**Files:** ninguno.

- [ ] **Step 1: Build limpio completo**

```bash
./gradlew clean :androidApp:assemble :shared:testAndroidHostTest :shared:assembleAndroidDeviceTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 2: Confirmar que los tests se ejecutaron de verdad**

```bash
grep -l "<testsuite" shared/build/test-results/testAndroidHostTest/*.xml | wc -l
grep -ho 'tests="[0-9]*" skipped="[0-9]*" failures="[0-9]*" errors="[0-9]*"' shared/build/test-results/testAndroidHostTest/*.xml
```

Expected: al menos 11 archivos de resultados (uno por clase de test) y, en todos, `failures="0" errors="0"`. Entre ellos deben estar `HttpClientRefreshTest` (9 tests), `HttpClientTest` (6), `TokenRefresherTest` (7), `DataStoreTokenStorageTest` (7) y `UserTest` (7).

- [ ] **Step 3: Árbol limpio**

Desde `/home/san/Proyectos/zarza-workspace-kmp-fase0-red`:

```bash
git status --short && git log --oneline main..HEAD
```

Expected: sin líneas de estado (el `local.properties` copiado está ignorado) y once commits, uno por cada Task de la 1 a la 11.

- [ ] **Step 4: Informar al usuario**

Resumir contra la sección "Terminado cuando" de la spec:

1. Tests de `shared` y compilación de los tres flavors en debug y release: resultado.
2. `un401RefrescaGuardaElParNuevoYReintentaUnaVez`: resultado.
3. "Probar conexión" en el flavor `dev` contra el backend local: comprobado o pendiente de dispositivo.
4. `KeystoreTokenCipherTest`: ejecutado o solo compilado.
5. Documentación actualizada.

Añadir que `iosMain` está escrito pero sin compilar, y las cinco decisiones de "Antes de empezar" para que el usuario pueda objetarlas.

- [ ] **Step 5: Merge a `main`**

Solo si los pasos 1 a 3 salieron bien. Desde `/home/san/Proyectos/zarza-workspace` (que ya está en `main`; no se cambia de rama):

```bash
git status --short && git branch --show-current
git merge --no-ff feature/kmp-fase0-red -m "Merge feature/kmp-fase0-red: red y sesión de la fase 0 del KMP"
```

Expected: `main`, sin cambios pendientes, y merge sin conflictos. Si hay conflictos o cambios sin commitear en `main`, no resolver por cuenta propia ni usar `git stash`: avisar al usuario.

- [ ] **Step 6: Limpiar**

```bash
git worktree remove ../zarza-workspace-kmp-fase0-red
git branch -d feature/kmp-fase0-red
```

No usar `--force` si `git worktree remove` se niega por archivos sin commitear que no sean `local.properties` o carpetas `build/`.
