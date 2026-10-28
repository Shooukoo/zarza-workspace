# KMP Fase 1: auth y splash — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Login, sesión persistente, logout y redirección por sesión en `rubus-ai-kmp`, según `docs/superpowers/specs/2026-10-27-kmp-fase1-auth-design.md`.

**Architecture:** Un `SessionManager` global expone `StateFlow<SessionState>` (`Loading` / `Authenticated(user)` / `Unauthenticated(expired)`) y es la única fuente de verdad. `RubusNavHost` lo observa y redirige en un solo punto. El usuario se persiste en un `UserStorage` aparte (mismo DataStore que los tokens, cifrado con el mismo `TokenCipher`). `AuthRepository` clasifica los errores por código HTTP y devuelve un resultado explícito.

**Tech Stack:** Kotlin Multiplatform, Compose Multiplatform, Ktor Client (MockEngine en tests), Koin (`viewModelOf`, `koinViewModel`), DataStore Preferences, kotlinx.serialization, Robolectric + `ui-test-junit4` para UI en la JVM.

---

## Antes de empezar

- **Directorio de trabajo:** todo se hace en el worktree `/home/san/Proyectos/zarza-workspace-kmp-fase1-auth` (rama `feature/kmp-fase1-auth`). Los comandos de Gradle se lanzan desde `/home/san/Proyectos/zarza-workspace-kmp-fase1-auth/rubus-ai-kmp`. Las rutas de archivo del plan son relativas a ese directorio (`shared/...`, `androidApp/...`) salvo que empiecen por `docs/`.
- **Commits:** mensajes en español, formato `tipo(rubus-ai-kmp): resumen`. **Sin** línea `Co-Authored-By` ni pie que mencione a Claude/Anthropic (regla del usuario).
- **Tests:** `./gradlew :shared:testAndroidHostTest --tests "<clase>"` corre los tests de `commonTest` y `androidHostTest` en la JVM. El primer arranque en el worktree tarda varios minutos.
- **Recursos de texto de Compose:** pueden cargarse de forma asíncrona. Los tests de UI que comprueban un texto de `strings.xml` esperan con `waitUntilAtLeastOneExists(hasText(...))`, no con `assertIsDisplayed` inmediato.
- **Convención de comentarios:** en español, solo el porqué que el código no muestra.

## Mapa de archivos

Crear (`shared/src/...`):

| Archivo | Responsabilidad |
|---|---|
| `commonMain/composeResources/values/strings.xml` | Textos de login, errores y home |
| `commonMain/composeResources/drawable/logo_rubus.png` | Logo (copia del de Flutter) |
| `commonMain/kotlin/com/rubusai/app/core/platform/UserStorage.kt` | Puerto del almacén del usuario |
| `commonMain/kotlin/com/rubusai/app/core/platform/InMemoryUserStorage.kt` | Doble de test e implementación de iOS |
| `androidMain/kotlin/com/rubusai/app/core/platform/DataStoreUserStorage.kt` | Usuario cifrado en el DataStore `session` |
| `commonMain/kotlin/com/rubusai/app/core/data/auth/AuthModels.kt` | `LoginFailure`, `AuthSession`, `LoginResult` |
| `commonMain/kotlin/com/rubusai/app/core/data/auth/AuthRepository.kt` | Interfaz del repositorio |
| `commonMain/kotlin/com/rubusai/app/core/data/auth/AuthDtos.kt` | DTOs de la API y su conversión |
| `commonMain/kotlin/com/rubusai/app/core/data/auth/AuthRepositoryImpl.kt` | Ktor: login, `me`, logout |
| `commonMain/kotlin/com/rubusai/app/core/data/auth/SessionManager.kt` | `SessionState` y `SessionManager` |
| `commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusScreen.kt` | Superficie común de pantalla |
| `commonMain/kotlin/com/rubusai/app/dev/DevActions.kt` | Acciones y botones solo de DEV |
| `commonMain/kotlin/com/rubusai/app/feature/splash/SplashScreen.kt` | Logo |
| `commonMain/kotlin/com/rubusai/app/feature/auth/LoginViewModel.kt` | Estado y eventos del login |
| `commonMain/kotlin/com/rubusai/app/feature/auth/LoginTexts.kt` | Causa → recurso de texto |
| `commonMain/kotlin/com/rubusai/app/feature/auth/LoginScreen.kt` | UI sin estado + `LoginRoute` |
| `commonMain/kotlin/com/rubusai/app/feature/home/HomeViewModel.kt` | Usuario y logout |
| `commonMain/kotlin/com/rubusai/app/feature/home/HomeScreen.kt` | UI sin estado + `HomeRoute` |

Tests nuevos: `commonTest/.../core/platform/InMemoryUserStorageTest.kt`, `commonTest/.../core/data/auth/{AuthTestSupport,AuthRepositoryTest,SessionManagerTest}.kt`, `commonTest/.../feature/auth/LoginViewModelTest.kt`, `commonTest/.../feature/home/HomeViewModelTest.kt`, `androidHostTest/.../core/resources/ResourcesTest.kt`, `androidHostTest/.../core/platform/DataStoreUserStorageTest.kt`, `androidHostTest/.../feature/auth/LoginScreenTest.kt`, `androidHostTest/.../feature/home/HomeScreenTest.kt`.

Modificar: `core/model/User.kt`, `core/model/UserRole.kt`, `core/di/AppModule.kt`, `androidMain/.../PlatformModule.android.kt`, `iosMain/.../PlatformModule.ios.kt`, `dev/DiagnosticoScreen.kt`, `dev/CatalogoScreen.kt`, `core/designsystem/component/RubusTextField.kt`, `core/navigation/RubusNavHost.kt`, `App.kt`, `androidApp/src/main/kotlin/com/rubusai/app/MainActivity.kt`, y los tests `UserTest`, `KoinGraphTest`, `RubusTextFieldTest`, `RubusNavHostTest`.

---

### Task 1: Recursos (logo y textos) y prueba de que cargan en Robolectric

Es el riesgo más incierto del spec (primer uso de recursos de texto de Compose), así que va primero.

**Files:**
- Copy: `/home/san/Proyectos/zarza-workspace/rubus-ai-kmp/local.properties` → worktree (no está en git)
- Create: `shared/src/commonMain/composeResources/values/strings.xml`
- Create: `shared/src/commonMain/composeResources/drawable/logo_rubus.png`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/core/resources/ResourcesTest.kt`

- [ ] **Step 1: Copiar `local.properties` al worktree**

```bash
cp /home/san/Proyectos/zarza-workspace/rubus-ai-kmp/local.properties /home/san/Proyectos/zarza-workspace-kmp-fase1-auth/rubus-ai-kmp/local.properties
git -C /home/san/Proyectos/zarza-workspace-kmp-fase1-auth status --short
```
Expected: sin salida (el archivo está ignorado por git).

- [ ] **Step 2: Copiar el logo**

```bash
mkdir -p shared/src/commonMain/composeResources/drawable
cp /home/san/Proyectos/zarza-workspace/zarza_ai/assets/images/logo-rubus.png shared/src/commonMain/composeResources/drawable/logo_rubus.png
```

- [ ] **Step 3: Crear `strings.xml`**

`shared/src/commonMain/composeResources/values/strings.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">Rubus AI</string>

    <string name="login_title">Iniciar sesión</string>
    <string name="login_email_label">Correo electrónico</string>
    <string name="login_password_label">Contraseña</string>
    <string name="password_show">Mostrar</string>
    <string name="password_hide">Ocultar</string>
    <string name="login_submit">Iniciar sesión</string>
    <string name="login_submitting">Entrando…</string>
    <string name="login_session_expired">Tu sesión expiró. Inicia sesión de nuevo.</string>

    <string name="login_error_email_required">Escribe tu correo.</string>
    <string name="login_error_email_invalid">Escribe un correo válido.</string>
    <string name="login_error_password_required">Escribe tu contraseña.</string>

    <string name="login_failure_invalid_credentials">Correo o contraseña incorrectos.</string>
    <string name="login_failure_rate_limited">Demasiados intentos. Espera un minuto.</string>
    <string name="login_failure_network">Sin conexión con el servidor. Verifica tu red.</string>
    <string name="login_failure_invalid_input">Revisa el correo y la contraseña.</string>
    <string name="login_failure_unsupported_role">Tu cuenta tiene un rol que esta versión de la app no reconoce.</string>
    <string name="login_failure_unexpected">Ocurrió un error. Intenta de nuevo.</string>

    <string name="home_title">Inicio</string>
    <string name="home_logout">Cerrar sesión</string>
    <string name="home_logging_out">Cerrando sesión…</string>
</resources>
```

- [ ] **Step 4: Escribir el test de recursos**

`shared/src/androidHostTest/kotlin/com/rubusai/app/core/resources/ResourcesTest.kt`:

```kotlin
package com.rubusai.app.core.resources

import androidx.compose.foundation.Image
import androidx.compose.material3.Text
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.login_submit
import com.rubusai.app.resources.logo_rubus
import kotlin.test.Test
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Primer uso de recursos de texto e imagen de Compose en el proyecto: si Robolectric no los
// resuelve, los tests de pantalla de la fase no se pueden escribir como están en el plan.
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ResourcesTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun lasCadenasDeComposeSeResuelvenEnRobolectric() {
        rule.setContent { Text(stringResource(Res.string.login_submit)) }

        rule.waitUntilAtLeastOneExists(hasText("Iniciar sesión"), timeoutMillis = 5_000)
    }

    @Test
    fun elLogoSeDibuja() {
        rule.setContent {
            Image(painterResource(Res.drawable.logo_rubus), contentDescription = "logo")
        }

        rule.waitUntilAtLeastOneExists(hasContentDescription("logo"), timeoutMillis = 5_000)
    }
}
```

- [ ] **Step 5: Ejecutar el test**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.resources.ResourcesTest"`
Expected: PASS (2 tests). Si falla porque Robolectric no resuelve los recursos, **detente y repórtalo**: el spec lo marca como riesgo y habría que decidir otra estrategia de tests de UI antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/composeResources shared/src/androidHostTest/kotlin/com/rubusai/app/core/resources
git commit -m "feat(rubus-ai-kmp): logo y textos de login como recursos de Compose"
```

---

### Task 2: `User` serializable y `displayName` sin espacios

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/User.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/UserRole.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/model/UserTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

En `UserTest.kt`, añade estos imports junto a los existentes:

```kotlin
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
```

y estos tests dentro de la clase (antes de `fromApiReconoceLosCuatroRoles`):

```kotlin
    @Test
    fun displayNameRecortaLosEspaciosDelNombre() {
        assertEquals("Ana", user(firstName = " Ana ").displayName)
    }

    @Test
    fun elUsuarioSobreviveAUnViajeDeIdaYVueltaPorJson() {
        val original = User("u1", "ana@zarza.example", UserRole.AGRONOMO, "Ana", null)

        val restored = Json.decodeFromString<User>(Json.encodeToString(original))

        assertEquals(original, restored)
    }
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.model.UserTest"`
Expected: FAIL (no compila: `User` no es `@Serializable`).

- [ ] **Step 3: Implementar**

`shared/src/commonMain/kotlin/com/rubusai/app/core/model/User.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.model

import kotlinx.serialization.Serializable

// Serializable para guardarlo cifrado en el dispositivo (UserStorage).
@Serializable
data class User(
    val id: String,
    val email: String,
    val role: UserRole,
    val firstName: String? = null,
    val lastName: String? = null,
) {
    /** El nombre sin espacios si queda algo; si no, la parte del correo anterior a `@`. */
    val displayName: String
        get() = firstName?.trim()?.takeIf { it.isNotEmpty() } ?: email.substringBefore('@')
}
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/model/UserRole.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.model

import kotlinx.serialization.Serializable

@Serializable
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

- [ ] **Step 4: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.model.UserTest"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/model shared/src/commonTest/kotlin/com/rubusai/app/core/model
git commit -m "feat(rubus-ai-kmp): User serializable y displayName que recorta espacios"
```

---

### Task 3: `UserStorage` y su versión en memoria

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/UserStorage.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/InMemoryUserStorage.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/platform/InMemoryUserStorageTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.core.platform

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

class InMemoryUserStorageTest {

    private val ana = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")

    @Test
    fun sinNadaGuardadoLeeNull() = runTest {
        assertNull(InMemoryUserStorage().read())
    }

    @Test
    fun loGuardadoSeLee() = runTest {
        val storage = InMemoryUserStorage()

        storage.save(ana)

        assertEquals(ana, storage.read())
    }

    @Test
    fun clearBorraElUsuario() = runTest {
        val storage = InMemoryUserStorage(ana)

        storage.clear()

        assertNull(storage.read())
    }
}
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.InMemoryUserStorageTest"`
Expected: FAIL (no compila: `InMemoryUserStorage` no existe).

- [ ] **Step 3: Implementar**

`UserStorage.kt`:

```kotlin
package com.rubusai.app.core.platform

import com.rubusai.app.core.model.User

/**
 * Almacén del usuario de la sesión. Va aparte de [SecureTokenStorage] porque el refresco de
 * tokens solo reescribe tokens: en la misma entrada, cada refresh borraría al usuario.
 */
interface UserStorage {
    /**
     * El usuario guardado, o `null` si no hay o lo guardado es ilegible. Una implementación
     * puede borrar lo ilegible al leerlo.
     */
    suspend fun read(): User?

    suspend fun save(user: User)

    suspend fun clear()
}
```

`InMemoryUserStorage.kt`:

```kotlin
package com.rubusai.app.core.platform

import com.rubusai.app.core.model.User
import kotlin.concurrent.Volatile

/**
 * Guarda el usuario en memoria: se pierde al cerrar el proceso.
 * Doble de test e implementación temporal de iOS hasta que exista la de Keychain.
 */
class InMemoryUserStorage(initial: User? = null) : UserStorage {
    @Volatile
    private var user: User? = initial

    override suspend fun read(): User? = user

    override suspend fun save(user: User) {
        this.user = user
    }

    override suspend fun clear() {
        user = null
    }
}
```

- [ ] **Step 4: Ejecutar para ver que pasa**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.InMemoryUserStorageTest"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/platform shared/src/commonTest/kotlin/com/rubusai/app/core/platform
git commit -m "feat(rubus-ai-kmp): UserStorage y su versión en memoria"
```

---

### Task 4: `DataStoreUserStorage` (Android)

Copia deliberada de la estructura de `DataStoreTokenStorage` (mismo cifrado, misma política de borrado): extraer un genérico obligaría a tocar una clase ya probada y no compensa con dos usuarios.

**Files:**
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/DataStoreUserStorage.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/core/platform/DataStoreUserStorageTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.network.AuthTokens
import java.io.File
import java.nio.file.Files
import java.security.ProviderException
import java.security.UnrecoverableKeyException
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.runBlocking

class DataStoreUserStorageTest {

    /** Invierte los bytes: reversible y distinto del texto original. */
    private class ReversingCipher : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain.reversedArray()
        override fun decrypt(data: ByteArray): ByteArray = data.reversedArray()
    }

    private class FailingCipher(private val failure: Exception) : TokenCipher {
        override fun encrypt(plain: ByteArray): ByteArray = plain
        override fun decrypt(data: ByteArray): ByteArray = throw failure
    }

    private val ana = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")
    private val directories = mutableListOf<File>()
    private val scopes = mutableListOf<CoroutineScope>()

    private fun dataStore(directory: File = newDirectory()): DataStore<Preferences> {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO).also(scopes::add)
        return PreferenceDataStoreFactory.create(scope = scope) { File(directory, "session.preferences_pb") }
    }

    private fun newDirectory(): File =
        Files.createTempDirectory("user-storage").toFile().also(directories::add)

    @AfterTest
    fun cleanup() {
        scopes.forEach { it.cancel() }
        directories.forEach { it.deleteRecursively() }
    }

    @Test
    fun sinNadaGuardadoLeeNull() = runBlocking {
        assertNull(DataStoreUserStorage(dataStore(), ReversingCipher()).read())
    }

    @Test
    fun loGuardadoSeLeeIgual() = runBlocking {
        val storage = DataStoreUserStorage(dataStore(), ReversingCipher())

        storage.save(ana)

        assertEquals(ana, storage.read())
    }

    @Test
    fun clearBorraElUsuario() = runBlocking {
        val storage = DataStoreUserStorage(dataStore(), ReversingCipher())
        storage.save(ana)

        storage.clear()

        assertNull(storage.read())
    }

    @Test
    fun elValorGuardadoNoContieneElCorreoEnClaro() = runBlocking {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        val raw = store.data.first()[DataStoreUserStorage.USER_KEY]

        assertNotNull(raw)
        assertFalse("ana@zarza.example" in raw)
    }

    @Test
    fun unaClavePerdidaDevuelveNullYBorraLaEntrada() = runBlocking {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        val result = DataStoreUserStorage(store, FailingCipher(UnrecoverableKeyException("clave perdida"))).read()

        assertNull(result)
        assertNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    @Test
    fun unFalloPasajeroSePropagaYNoBorraLaEntrada() = runBlocking {
        val store = dataStore()
        DataStoreUserStorage(store, ReversingCipher()).save(ana)

        assertFailsWith<ProviderException> {
            DataStoreUserStorage(store, FailingCipher(ProviderException("keystore ocupado"))).read()
        }

        assertNotNull(store.data.first()[DataStoreUserStorage.USER_KEY])
    }

    @Test
    fun comparteElArchivoConLosTokensSinPisarlos() = runBlocking {
        val store = dataStore()
        val cipher = ReversingCipher()
        val tokens = DataStoreTokenStorage(store, cipher)
        val users = DataStoreUserStorage(store, cipher)
        tokens.save(AuthTokens("access", "refresh"))
        users.save(ana)

        tokens.clear()

        assertNull(tokens.read())
        assertEquals(ana, users.read())
    }
}
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.DataStoreUserStorageTest"`
Expected: FAIL (no compila: `DataStoreUserStorage` no existe).

- [ ] **Step 3: Implementar**

`shared/src/androidMain/kotlin/com/rubusai/app/core/platform/DataStoreUserStorage.kt`:

```kotlin
package com.rubusai.app.core.platform

import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import com.rubusai.app.core.model.User
import java.security.GeneralSecurityException
import kotlin.coroutines.cancellation.CancellationException
import kotlin.io.encoding.Base64
import kotlinx.coroutines.flow.first
import kotlinx.serialization.json.Json

/**
 * Guarda el usuario en la misma instancia de DataStore que [DataStoreTokenStorage] (solo se
 * admite una por archivo), en otra clave: el JSON de [User] cifrado con [cipher] y en Base64.
 * Cifrado porque el correo y el nombre son datos personales.
 *
 * [read] tiene el mismo efecto secundario que el de los tokens: lo ilegible (clave perdida,
 * dato corrupto) se borra y devuelve `null`; un fallo pasajero del cifrado se propaga sin borrar.
 */
internal class DataStoreUserStorage(
    private val dataStore: DataStore<Preferences>,
    private val cipher: TokenCipher,
) : UserStorage {

    override suspend fun read(): User? {
        val stored = dataStore.data.first()[USER_KEY] ?: return null
        val user = try {
            Json.decodeFromString<User>(cipher.decrypt(Base64.decode(stored)).decodeToString())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Igual que con los tokens: solo lo permanente se descarta; cualquier otro fallo
            // se propaga para no perder la sesión por un Keystore ocupado. SerializationException
            // es una IllegalArgumentException, así que un JSON ilegible también se descarta.
            if (e !is GeneralSecurityException && e !is IllegalArgumentException) throw e
            null
        }
        // Solo se borra si sigue guardado lo que no se pudo leer: otro `save` puede haber
        // dejado un valor válido mientras tanto.
        if (user == null) dataStore.edit { if (it[USER_KEY] == stored) it.remove(USER_KEY) }
        return user
    }

    override suspend fun save(user: User) {
        val encrypted = cipher.encrypt(Json.encodeToString(user).encodeToByteArray())
        dataStore.edit { it[USER_KEY] = Base64.encode(encrypted) }
    }

    override suspend fun clear() {
        dataStore.edit { it.remove(USER_KEY) }
    }

    internal companion object {
        val USER_KEY = stringPreferencesKey("user")
    }
}
```

- [ ] **Step 4: Ejecutar para ver que pasa**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.platform.DataStoreUserStorageTest"`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/androidMain/kotlin/com/rubusai/app/core/platform/DataStoreUserStorage.kt shared/src/androidHostTest/kotlin/com/rubusai/app/core/platform/DataStoreUserStorageTest.kt
git commit -m "feat(rubus-ai-kmp): DataStoreUserStorage cifrado en el DataStore de la sesión"
```

---

### Task 5: Modelos de auth y `AuthRepository.login`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/AuthModels.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/AuthRepository.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/AuthDtos.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/AuthRepositoryImpl.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth/AuthRepositoryTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

`AuthRepositoryTest.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.content.TextContent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

private fun loginBody(role: String = "MONITOR") =
    """{"token":"access-new","refreshToken":"refresh-new","user":{"id":"u1","email":"ana@zarza.example","role":"$role","firstName":"Ana","lastName":"Pérez"}}"""

private fun bodyText(request: HttpRequestData): String = when (val body = request.body) {
    is TextContent -> body.text
    is OutgoingContent.ByteArrayContent -> body.bytes().decodeToString()
    else -> error("cuerpo inesperado: ${body::class}")
}

class AuthRepositoryTest {

    private val expectedUser = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")

    @Test
    fun unLoginCorrectoDevuelveLosTokensYElUsuario() = runTest {
        var captured: HttpRequestData? = null
        val fixture = clientFixture { request ->
            captured = request
            respondJson(loginBody())
        }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(
            LoginResult.Success(AuthSession(AuthTokens("access-new", "refresh-new"), expectedUser)),
            result,
        )
        val request = assertNotNull(captured)
        assertEquals(HttpMethod.Post, request.method)
        assertEquals("/api/v1/auth/login", request.url.encodedPath)
        assertNull(request.headers[HttpHeaders.Authorization])
        assertEquals("""{"email":"ana@zarza.example","password":"secreto"}""", bodyText(request))
    }

    @Test
    fun cadaCodigoDeErrorSeClasificaPorSuEstado() = runTest {
        val esperados = mapOf(
            401 to LoginFailure.InvalidCredentials,
            429 to LoginFailure.RateLimited,
            400 to LoginFailure.InvalidInput,
            404 to LoginFailure.Unexpected,
            500 to LoginFailure.Unexpected,
            503 to LoginFailure.Unexpected,
        )

        for ((status, failure) in esperados) {
            val fixture = clientFixture { respondJson("""{"message":"x"}""", HttpStatusCode.fromValue(status)) }

            val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

            assertEquals(LoginResult.Failure(failure), result, "estado $status")
        }
    }

    @Test
    fun unFalloDeRedSeClasificaComoNetwork() = runTest {
        val fixture = clientFixture { throw FakeNetworkException() }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.Network), result)
    }

    @Test
    fun unRolDesconocidoSeClasificaComoUnsupportedRole() = runTest {
        val fixture = clientFixture { respondJson(loginBody(role = "SUPERHEROE")) }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.UnsupportedRole), result)
    }

    @Test
    fun unCuerpoIlegibleSeClasificaComoUnexpected() = runTest {
        val fixture = clientFixture { respondJson("esto no es json") }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.Unexpected), result)
    }

    @Test
    fun laCancelacionSePropagaYNoSeConvierteEnNetwork() = runTest {
        val fixture = clientFixture {
            delay(60_000)
            respondJson(loginBody())
        }
        var terminoNormalmente = false

        val job = launch {
            AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")
            terminoNormalmente = true
        }
        runCurrent()
        job.cancelAndJoin()

        assertFalse(terminoNormalmente)
    }
}
```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.AuthRepositoryTest"`
Expected: FAIL (no compila: no existen los tipos de `core/data/auth`).

- [ ] **Step 3: Implementar los modelos y la interfaz**

`AuthModels.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.AuthTokens

/** Por qué falló un login. La presentación convierte cada causa en un texto. */
enum class LoginFailure {
    InvalidCredentials,
    RateLimited,
    Network,
    InvalidInput,
    UnsupportedRole,
    Unexpected,
}

/** Lo que devuelve un login correcto: el par de tokens y el usuario. */
data class AuthSession(val tokens: AuthTokens, val user: User)

sealed interface LoginResult {
    data class Success(val session: AuthSession) : LoginResult
    data class Failure(val reason: LoginFailure) : LoginResult
}
```

`AuthRepository.kt`:

```kotlin
package com.rubusai.app.core.data.auth

interface AuthRepository {
    /** `POST auth/login`. No guarda nada: quien llama decide qué persistir. Nunca lanza, salvo por cancelación. */
    suspend fun login(email: String, password: String): LoginResult
}
```

`AuthDtos.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlinx.serialization.Serializable

@Serializable
internal data class LoginRequest(val email: String, val password: String)

@Serializable
internal data class UserDto(
    val id: String,
    val email: String,
    val role: String,
    val firstName: String? = null,
    val lastName: String? = null,
)

@Serializable
internal data class LoginResponse(val token: String, val refreshToken: String, val user: UserDto)

/** `null` si el rol que envía el backend no se conoce: no se degrada a otro rol. */
internal fun UserDto.toUserOrNull(): User? {
    val userRole = try {
        UserRole.fromApi(role)
    } catch (e: IllegalArgumentException) {
        return null
    }
    return User(id = id, email = email, role = userRole, firstName = firstName, lastName = lastName)
}
```

- [ ] **Step 4: Implementar `AuthRepositoryImpl.login`**

`AuthRepositoryImpl.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.network.AuthTokens
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ResponseException
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive

/**
 * Usa el `HttpClient` de la app (el único con refresh de token). Nada de lo que falla se
 * registra: el mensaje de un `ResponseException` incluye el cuerpo de la respuesta.
 */
internal class AuthRepositoryImpl(private val client: HttpClient) : AuthRepository {

    override suspend fun login(email: String, password: String): LoginResult {
        val response = try {
            client.post("auth/login") { setBody(LoginRequest(email, password)) }
        } catch (e: ResponseException) {
            return LoginResult.Failure(e.response.status.toLoginFailure())
        } catch (e: Exception) {
            // Una cancelación de quien llama se propaga; cualquier otra excepción sin respuesta
            // del servidor es un fallo de red.
            currentCoroutineContext().ensureActive()
            return LoginResult.Failure(LoginFailure.Network)
        }
        val body = try {
            response.body<LoginResponse>()
        } catch (e: Exception) {
            currentCoroutineContext().ensureActive()
            return LoginResult.Failure(LoginFailure.Unexpected)
        }
        val user = body.user.toUserOrNull() ?: return LoginResult.Failure(LoginFailure.UnsupportedRole)
        return LoginResult.Success(AuthSession(AuthTokens(body.token, body.refreshToken), user))
    }
}

private fun HttpStatusCode.toLoginFailure(): LoginFailure = when (value) {
    401 -> LoginFailure.InvalidCredentials
    429 -> LoginFailure.RateLimited
    400 -> LoginFailure.InvalidInput
    else -> LoginFailure.Unexpected
}
```

- [ ] **Step 5: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.AuthRepositoryTest"`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/data shared/src/commonTest/kotlin/com/rubusai/app/core/data
git commit -m "feat(rubus-ai-kmp): AuthRepository.login con errores clasificados por código HTTP"
```

---

### Task 6: `AuthRepository.fetchMe` y `logout`

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/AuthRepository.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/AuthRepositoryImpl.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth/AuthRepositoryTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

En `AuthRepositoryTest.kt` añade estos imports:

```kotlin
import io.ktor.client.utils.EmptyContent
import kotlin.test.assertTrue
```

y estos tests dentro de la clase `AuthRepositoryTest`:

```kotlin
    @Test
    fun meDevuelveElUsuarioYLlevaElBearer() = runTest {
        var captured: HttpRequestData? = null
        val fixture = clientFixture { request ->
            captured = request
            respondJson("""{"id":"u1","email":"ana@zarza.example","role":"MONITOR","firstName":"Ana","lastName":"Pérez","createdAt":"2026-01-01T00:00:00.000Z"}""")
        }

        val user = AuthRepositoryImpl(fixture.client).fetchMe()

        assertEquals(expectedUser, user)
        val request = assertNotNull(captured)
        assertEquals("/api/v1/auth/me", request.url.encodedPath)
        assertEquals("Bearer access-old", request.headers[HttpHeaders.Authorization])
    }

    @Test
    fun meDevuelveNullSiElServidorFalla() = runTest {
        val fixture = clientFixture { respondJson("""{"message":"x"}""", HttpStatusCode.InternalServerError) }

        assertNull(AuthRepositoryImpl(fixture.client).fetchMe())
    }

    @Test
    fun meDevuelveNullSiNoHayRed() = runTest {
        val fixture = clientFixture { throw FakeNetworkException() }

        assertNull(AuthRepositoryImpl(fixture.client).fetchMe())
    }

    @Test
    fun meDevuelveNullConUnRolDesconocido() = runTest {
        val fixture = clientFixture { respondJson("""{"id":"u1","email":"ana@zarza.example","role":"SUPERHEROE"}""") }

        assertNull(AuthRepositoryImpl(fixture.client).fetchMe())
    }

    @Test
    fun logoutEnviaElRefreshTokenConBearer() = runTest {
        var captured: HttpRequestData? = null
        val fixture = clientFixture { request ->
            captured = request
            respondJson("""{"message":"Logged out"}""")
        }

        AuthRepositoryImpl(fixture.client).logout("refresh-old")

        val request = assertNotNull(captured)
        assertEquals(HttpMethod.Post, request.method)
        assertEquals("/api/v1/auth/logout", request.url.encodedPath)
        assertEquals("Bearer access-old", request.headers[HttpHeaders.Authorization])
        assertEquals("""{"refreshToken":"refresh-old"}""", bodyText(request))
    }

    @Test
    fun logoutSinRefreshTokenSaleSinCuerpoNiContentType() = runTest {
        var captured: HttpRequestData? = null
        val fixture = clientFixture { request ->
            captured = request
            respondJson("""{"message":"Logged out"}""")
        }

        AuthRepositoryImpl(fixture.client).logout(null)

        val request = assertNotNull(captured)
        assertTrue(request.body is EmptyContent)
        assertNull(request.headers[HttpHeaders.ContentType])
    }

    @Test
    fun logoutNoLanzaSiElServidorFalla() = runTest {
        val fixture = clientFixture { respondJson("""{"message":"x"}""", HttpStatusCode.InternalServerError) }

        AuthRepositoryImpl(fixture.client).logout("refresh-old")
    }

    @Test
    fun logoutNoLanzaSiNoHayRed() = runTest {
        val fixture = clientFixture { throw FakeNetworkException() }

        AuthRepositoryImpl(fixture.client).logout("refresh-old")
    }

    @Test
    fun logoutNoEsperaMasDeCincoSegundos() = runTest {
        val fixture = clientFixture {
            delay(60_000)
            respondJson("""{"message":"Logged out"}""")
        }

        AuthRepositoryImpl(fixture.client).logout("refresh-old")

        assertTrue(testScheduler.currentTime < 10_000, "tardó ${testScheduler.currentTime} ms")
    }
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.AuthRepositoryTest"`
Expected: FAIL (no compila: faltan `fetchMe` y `logout`).

- [ ] **Step 3: Ampliar la interfaz**

`AuthRepository.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User

interface AuthRepository {
    /** `POST auth/login`. No guarda nada: quien llama decide qué persistir. Nunca lanza, salvo por cancelación. */
    suspend fun login(email: String, password: String): LoginResult

    /**
     * `GET auth/me`: el usuario actual, o `null` ante cualquier fallo (red, 4xx, 5xx, cuerpo
     * ilegible o rol desconocido). Un 401 ya lo gestiona el cliente con el refresh de token.
     */
    suspend fun fetchMe(): User?

    /**
     * `POST auth/logout` con el refresh token, como mucho 5 s. Nunca lanza, salvo por
     * cancelación: si falla, el cierre de sesión local sigue adelante igual.
     */
    suspend fun logout(refreshToken: String?)
}
```

- [ ] **Step 4: Implementar**

En `AuthRepositoryImpl.kt` añade estos imports:

```kotlin
import com.rubusai.app.core.model.User
import io.ktor.client.plugins.timeout
import io.ktor.client.request.get
```

y estos miembros dentro de la clase, tras `login`:

```kotlin
    override suspend fun fetchMe(): User? = try {
        client.get("auth/me").body<UserDto>().toUserOrNull()
    } catch (e: Exception) {
        currentCoroutineContext().ensureActive()
        null
    }

    override suspend fun logout(refreshToken: String?) {
        try {
            client.post("auth/logout") {
                timeout { requestTimeoutMillis = LOGOUT_TIMEOUT_MS }
                // Sin token no hay cuerpo (ni Content-Type): Fastify responde 400 a un JSON vacío.
                if (refreshToken != null) setBody(LogoutRequest(refreshToken))
            }
        } catch (e: Exception) {
            currentCoroutineContext().ensureActive()
        }
    }
```

y esta constante al final del archivo:

```kotlin
// Corto a propósito: sin red, el usuario no debe esperar los 30 s del cliente para cerrar sesión.
private const val LOGOUT_TIMEOUT_MS = 5_000L
```

En `AuthDtos.kt` añade:

```kotlin
@Serializable
internal data class LogoutRequest(val refreshToken: String)
```

- [ ] **Step 5: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.AuthRepositoryTest"`
Expected: PASS (15 tests).

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/data shared/src/commonTest/kotlin/com/rubusai/app/core/data
git commit -m "feat(rubus-ai-kmp): AuthRepository.fetchMe y logout con timeout corto"
```

---

### Task 7: `SessionState` y `SessionManager` (arranque, refresco y expiración)

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/SessionManager.kt`
- Create: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth/AuthTestSupport.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth/SessionManagerTest.kt`

- [ ] **Step 1: Escribir el soporte de tests**

`AuthTestSupport.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.network.AuthTokens
import kotlinx.coroutines.CompletableDeferred

internal val ana = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")
internal val anaAdmin = ana.copy(role = UserRole.ADMIN)
internal val TOKENS = AuthTokens("access-old", "refresh-old")

/** Repositorio falso: devuelve lo que se le configura y deja constancia de las llamadas. */
internal class FakeAuthRepository : AuthRepository {
    var loginResult: LoginResult =
        LoginResult.Success(AuthSession(AuthTokens("access-new", "refresh-new"), ana))
    var loginGate: CompletableDeferred<Unit>? = null
    var me: User? = null
    var meGate: CompletableDeferred<Unit>? = null

    val loginCalls = mutableListOf<Pair<String, String>>()
    val logoutCalls = mutableListOf<String?>()
    var meCalls = 0
    var maxActiveLogins = 0
    private var activeLogins = 0

    override suspend fun login(email: String, password: String): LoginResult {
        loginCalls += email to password
        activeLogins++
        maxActiveLogins = maxOf(maxActiveLogins, activeLogins)
        try {
            loginGate?.await()
        } finally {
            activeLogins--
        }
        return loginResult
    }

    override suspend fun fetchMe(): User? {
        meCalls++
        meGate?.await()
        return me
    }

    override suspend fun logout(refreshToken: String?) {
        logoutCalls += refreshToken
    }
}
```

- [ ] **Step 2: Escribir los tests que fallan**

`SessionManagerTest.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

/** Almacén de tokens que falla las próximas [failures] lecturas, como un Keystore ocupado. */
private class FlakyTokenStorage(
    private val delegate: SecureTokenStorage,
    var failures: Int = 0,
) : SecureTokenStorage {
    var clears = 0

    override suspend fun read(): AuthTokens? {
        if (failures > 0) {
            failures--
            throw IllegalStateException("keystore ocupado")
        }
        return delegate.read()
    }

    override suspend fun save(tokens: AuthTokens) = delegate.save(tokens)

    override suspend fun clear() {
        clears++
        delegate.clear()
    }
}

class SessionManagerTest {

    private fun TestScope.manager(
        repository: FakeAuthRepository = FakeAuthRepository(),
        tokens: SecureTokenStorage = InMemoryTokenStorage(),
        users: UserStorage = InMemoryUserStorage(),
        events: SessionEvents = SessionEvents(),
    ) = SessionManager(repository, tokens, users, events, scope = backgroundScope)

    @Test
    fun alCrearseEstaEnLoading() = runTest {
        assertEquals(SessionState.Loading, manager().state.value)
    }

    @Test
    fun sinTokensEmiteUnauthenticatedYBorraUnUsuarioHuerfano() = runTest {
        val users = InMemoryUserStorage(ana)
        val manager = manager(users = users)

        manager.start()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
        assertNull(users.read())
    }

    @Test
    fun conTokensYUsuarioEmiteAuthenticatedSinEsperarLaRed() = runTest {
        val repository = FakeAuthRepository().apply { meGate = CompletableDeferred() }
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana))

        manager.start()

        // `me` sigue en vuelo (la compuerta no se ha abierto) y la sesión ya está lista.
        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun elRefrescoEnSegundoPlanoActualizaElUsuarioYLoGuarda() = runTest {
        val repository = FakeAuthRepository().apply {
            meGate = CompletableDeferred()
            me = anaAdmin
        }
        val users = InMemoryUserStorage(ana)
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), users)
        manager.start()
        runCurrent()

        repository.meGate!!.complete(Unit)
        runCurrent()

        assertEquals(SessionState.Authenticated(anaAdmin), manager.state.value)
        assertEquals(anaAdmin, users.read())
    }

    @Test
    fun siElRefrescoEnSegundoPlanoFallaLaSesionSigue() = runTest {
        val repository = FakeAuthRepository().apply { me = null }
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana))

        manager.start()
        runCurrent()

        assertEquals(1, repository.meCalls)
        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun conTokensSinUsuarioPideMeYAutentica() = runTest {
        val repository = FakeAuthRepository().apply { me = ana }
        val users = InMemoryUserStorage()
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), users)

        manager.start()

        assertEquals(SessionState.Authenticated(ana), manager.state.value)
        assertEquals(ana, users.read())
    }

    @Test
    fun conTokensSinUsuarioYMeFallidoLimpiaTodo() = runTest {
        val repository = FakeAuthRepository().apply { me = null }
        val tokens = InMemoryTokenStorage(TOKENS)
        val manager = manager(repository, tokens, InMemoryUserStorage())

        manager.start()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
        assertNull(tokens.read())
    }

    @Test
    fun unaLecturaPasajeraSeReintentaUnaVez() = runTest {
        val tokens = FlakyTokenStorage(InMemoryTokenStorage(TOKENS), failures = 1)
        val manager = manager(tokens = tokens, users = InMemoryUserStorage(ana))

        manager.start()

        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun dosLecturasFallidasDejanUnauthenticatedSinBorrarNada() = runTest {
        val tokens = FlakyTokenStorage(InMemoryTokenStorage(TOKENS), failures = 2)
        val users = InMemoryUserStorage(ana)
        val manager = manager(tokens = tokens, users = users)

        manager.start()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
        assertEquals(0, tokens.clears)
        assertEquals(ana, users.read())
    }

    @Test
    fun startEsIdempotente() = runTest {
        val repository = FakeAuthRepository()
        val manager = manager(repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana))

        manager.start()
        manager.start()
        runCurrent()

        assertEquals(1, repository.meCalls)
    }

    @Test
    fun expiredBorraLaSesionYEmiteUnauthenticatedConExpired() = runTest {
        val events = SessionEvents()
        val tokens = InMemoryTokenStorage(TOKENS)
        val users = InMemoryUserStorage(ana)
        val manager = manager(tokens = tokens, users = users, events = events)
        manager.start()

        events.notifyExpired()
        runCurrent()

        assertEquals(SessionState.Unauthenticated(expired = true), manager.state.value)
        assertNull(tokens.read())
        assertNull(users.read())
    }

    @Test
    fun expiredSinSesionNoCambiaElEstado() = runTest {
        val events = SessionEvents()
        val manager = manager(events = events)
        manager.start()

        events.notifyExpired()
        runCurrent()

        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }
}
```

- [ ] **Step 3: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.SessionManagerTest"`
Expected: FAIL (no compila: `SessionManager` y `SessionState` no existen).

- [ ] **Step 4: Implementar**

`SessionManager.kt`:

```kotlin
package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed interface SessionState {
    /** Valor inicial: todavía se está leyendo el almacenamiento. */
    data object Loading : SessionState

    data class Authenticated(val user: User) : SessionState

    /** [expired] es `true` si el backend rechazó el refresh y la sesión se cerró sola. */
    data class Unauthenticated(val expired: Boolean = false) : SessionState
}

/**
 * Única fuente de verdad de la sesión. La navegación observa [state] y redirige; nadie más
 * decide a dónde va la app según la sesión.
 *
 * [scope] debe vivir lo mismo que la app: escucha `SessionEvents.expired` y hace el refresco
 * del usuario en segundo plano.
 */
class SessionManager(
    private val repository: AuthRepository,
    private val tokenStorage: SecureTokenStorage,
    private val userStorage: UserStorage,
    private val sessionEvents: SessionEvents,
    private val scope: CoroutineScope,
) {
    private val _state = MutableStateFlow<SessionState>(SessionState.Loading)
    val state: StateFlow<SessionState> = _state.asStateFlow()

    // Serializa las transiciones (login, logout, expiración, refresco del usuario) para que
    // un evento tardío no resucite una sesión ya cerrada.
    private val transitions = Mutex()
    private val startLock = Mutex()
    private var started = false

    /** Lee la sesión guardada y empieza a escuchar su expiración. Idempotente. */
    suspend fun start() {
        startLock.withLock {
            if (started) return
            started = true
        }
        // UNDISPATCHED: la suscripción existe antes de leer nada, porque `expired` no repite avisos.
        scope.launch(start = CoroutineStart.UNDISPATCHED) {
            sessionEvents.expired.collect { expire() }
        }
        try {
            restore()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Un Keystore que falla dos veces seguidas: se pide iniciar sesión sin borrar nada,
            // para que la sesión guardada sobreviva al siguiente arranque.
            leaveLoading(SessionState.Unauthenticated())
        }
    }

    private suspend fun restore() {
        val tokens = readWithRetry { tokenStorage.read() }
        if (tokens == null) {
            // Un usuario sin tokens es resto de una sesión cerrada a medias.
            bestEffort { userStorage.clear() }
            leaveLoading(SessionState.Unauthenticated())
            return
        }
        val user = readWithRetry { userStorage.read() }
        if (user != null) {
            _state.value = SessionState.Authenticated(user)
            scope.launch { refreshUser() }
            return
        }
        // Tokens sin usuario (almacenamiento corrupto): no se adivina el rol.
        val fetched = repository.fetchMe()
        if (fetched != null) {
            userStorage.save(fetched)
            _state.value = SessionState.Authenticated(fetched)
        } else {
            clearStorage()
            leaveLoading(SessionState.Unauthenticated())
        }
    }

    /** Actualiza rol y nombre con `GET auth/me`; si falla por cualquier causa, la sesión sigue como estaba. */
    private suspend fun refreshUser() {
        val fresh = repository.fetchMe() ?: return
        transitions.withLock {
            val current = _state.value
            if (current !is SessionState.Authenticated || current.user == fresh) return
            try {
                userStorage.save(fresh)
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                return
            }
            _state.value = SessionState.Authenticated(fresh)
        }
    }

    private suspend fun expire() = transitions.withLock {
        // Tras un logout o sin sesión no hay nada que expirar (y no debe salir el aviso).
        if (_state.value is SessionState.Unauthenticated) return@withLock
        clearStorage()
        _state.value = SessionState.Unauthenticated(expired = true)
    }

    /** Pasa de `Loading` a [next] sin pisar una transición que haya ocurrido mientras tanto. */
    private fun leaveLoading(next: SessionState) {
        _state.update { if (it is SessionState.Loading) next else it }
    }

    /** Un único reintento: un Keystore ocupado suele resolverse al instante. */
    private suspend fun <T> readWithRetry(read: suspend () -> T): T = try {
        read()
    } catch (e: CancellationException) {
        throw e
    } catch (e: Exception) {
        read()
    }

    /** Borra tokens y luego usuario. Si el almacenamiento falla no hay nada más que hacer: la sesión ya no es válida. */
    private suspend fun clearStorage() {
        bestEffort { tokenStorage.clear() }
        bestEffort { userStorage.clear() }
    }

    private suspend fun bestEffort(block: suspend () -> Unit) {
        try {
            block()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // Sin acción: ver clearStorage.
        }
    }
}
```

- [ ] **Step 5: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.SessionManagerTest"`
Expected: PASS (12 tests).

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/SessionManager.kt shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth
git commit -m "feat(rubus-ai-kmp): SessionManager con arranque, refresco en segundo plano y expiración"
```

---

### Task 8: `SessionManager.login` y `logout`

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/SessionManager.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth/SessionManagerTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

En `SessionManagerTest.kt` añade estos imports:

```kotlin
import com.rubusai.app.core.model.User
import kotlin.test.assertFailsWith
import kotlin.test.assertTrue
import kotlinx.coroutines.launch
```

estas clases privadas, junto a `FlakyTokenStorage`:

```kotlin
/** Registra el orden de los `save` de tokens y usuario. */
private class LoggingTokenStorage(private val log: MutableList<String>) : SecureTokenStorage {
    private val delegate = InMemoryTokenStorage()
    override suspend fun read() = delegate.read()
    override suspend fun save(tokens: AuthTokens) {
        log += "tokens"
        delegate.save(tokens)
    }
    override suspend fun clear() = delegate.clear()
}

private class LoggingUserStorage(private val log: MutableList<String>) : UserStorage {
    private val delegate = InMemoryUserStorage()
    override suspend fun read() = delegate.read()
    override suspend fun save(user: User) {
        log += "usuario"
        delegate.save(user)
    }
    override suspend fun clear() = delegate.clear()
}

/** Almacén de usuario cuyo guardado falla, como un disco lleno. */
private class FailingSaveUserStorage : UserStorage {
    override suspend fun read(): User? = null
    override suspend fun save(user: User) = throw IllegalStateException("disco lleno")
    override suspend fun clear() = Unit
}
```

y estos tests dentro de la clase `SessionManagerTest`:

```kotlin
    @Test
    fun unLoginCorrectoGuardaTokensYUsuarioEnOrdenYEmiteAuthenticated() = runTest {
        val log = mutableListOf<String>()
        val manager = manager(tokens = LoggingTokenStorage(log), users = LoggingUserStorage(log))
        manager.start()

        val result = manager.login("ana@zarza.example", "secreto")

        assertTrue(result is LoginResult.Success)
        assertEquals(listOf("tokens", "usuario"), log)
        assertEquals(SessionState.Authenticated(ana), manager.state.value)
    }

    @Test
    fun unLoginFallidoNoGuardaNadaNiCambiaElEstado() = runTest {
        val repository = FakeAuthRepository().apply {
            loginResult = LoginResult.Failure(LoginFailure.InvalidCredentials)
        }
        val tokens = InMemoryTokenStorage()
        val manager = manager(repository, tokens)
        manager.start()

        val result = manager.login("ana@zarza.example", "mala")

        assertEquals(LoginResult.Failure(LoginFailure.InvalidCredentials), result)
        assertNull(tokens.read())
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun siFallaElGuardadoDelUsuarioSeBorranLosTokensYSePropagaElError() = runTest {
        val tokens = InMemoryTokenStorage()
        val manager = manager(tokens = tokens, users = FailingSaveUserStorage())
        manager.start()

        assertFailsWith<IllegalStateException> { manager.login("ana@zarza.example", "secreto") }

        assertNull(tokens.read())
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun dosLoginsSimultaneosSeSerializan() = runTest {
        val repository = FakeAuthRepository().apply { loginGate = CompletableDeferred() }
        val manager = manager(repository)
        manager.start()

        val first = launch { manager.login("ana@zarza.example", "secreto") }
        val second = launch { manager.login("ana@zarza.example", "secreto") }
        runCurrent()
        assertEquals(1, repository.loginCalls.size)

        repository.loginGate!!.complete(Unit)
        runCurrent()

        first.join()
        second.join()
        assertEquals(2, repository.loginCalls.size)
        assertEquals(1, repository.maxActiveLogins)
    }

    @Test
    fun logoutLlamaAlBackendConElRefreshTokenYLimpiaTodo() = runTest {
        val repository = FakeAuthRepository()
        val tokens = InMemoryTokenStorage(TOKENS)
        val users = InMemoryUserStorage(ana)
        val manager = manager(repository, tokens, users)
        manager.start()

        manager.logout()

        assertEquals(listOf<String?>("refresh-old"), repository.logoutCalls)
        assertNull(tokens.read())
        assertNull(users.read())
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun logoutLimpiaAunqueLaLecturaDeTokensFalle() = runTest {
        val repository = FakeAuthRepository()
        val tokens = FlakyTokenStorage(InMemoryTokenStorage(TOKENS))
        val manager = manager(repository, tokens, InMemoryUserStorage(ana))
        manager.start()
        tokens.failures = Int.MAX_VALUE

        manager.logout()

        assertEquals(listOf<String?>(null), repository.logoutCalls)
        assertEquals(1, tokens.clears)
        assertEquals(SessionState.Unauthenticated(), manager.state.value)
    }

    @Test
    fun logoutSinSesionNoLlamaAlBackend() = runTest {
        val repository = FakeAuthRepository()
        val manager = manager(repository)
        manager.start()

        manager.logout()

        assertTrue(repository.logoutCalls.isEmpty())
    }

    @Test
    fun unExpiredTardioTrasElLogoutNoMuestraElAviso() = runTest {
        val events = SessionEvents()
        val manager = manager(tokens = InMemoryTokenStorage(TOKENS), users = InMemoryUserStorage(ana), events = events)
        manager.start()

        manager.logout()
        events.notifyExpired()
        runCurrent()

        assertEquals(SessionState.Unauthenticated(expired = false), manager.state.value)
    }
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.SessionManagerTest"`
Expected: FAIL (no compila: faltan `login` y `logout`).

- [ ] **Step 3: Implementar**

En `SessionManager.kt` añade estos imports:

```kotlin
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.withContext
```

y estos métodos en la clase, justo después de `start()`:

```kotlin
    /**
     * Inicia sesión. Si el backend acepta, guarda los tokens y luego el usuario y pasa a
     * `Authenticated`. Si no puede guardarlos, borra lo guardado y propaga el error: no queda
     * media sesión. Un `Mutex` impide dos logins a la vez.
     */
    suspend fun login(email: String, password: String): LoginResult = transitions.withLock {
        val result = repository.login(email, password)
        if (result !is LoginResult.Success) return@withLock result
        val session = result.session
        try {
            tokenStorage.save(session.tokens)
            userStorage.save(session.user)
        } catch (e: Exception) {
            // NonCancellable: si lo que falló fue una cancelación, aun así hay que limpiar.
            withContext(NonCancellable) { clearStorage() }
            throw e
        }
        _state.value = SessionState.Authenticated(session.user)
        result
    }

    /**
     * Cierra la sesión. Llama al backend **antes** de borrar: necesita el `Bearer` para que
     * limpie el token FCM de este usuario. Pase lo que pase con la llamada, la sesión local
     * se borra. No se cancela a medias: dejaría la sesión abierta con el usuario ya fuera.
     */
    suspend fun logout() = withContext(NonCancellable) {
        transitions.withLock {
            if (_state.value !is SessionState.Authenticated) return@withLock
            val refreshToken = try {
                tokenStorage.read()?.refreshToken
            } catch (e: Exception) {
                null
            }
            repository.logout(refreshToken)
            clearStorage()
            _state.value = SessionState.Unauthenticated()
        }
    }
```

- [ ] **Step 4: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.data.auth.SessionManagerTest"`
Expected: PASS (20 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/data/auth/SessionManager.kt shared/src/commonTest/kotlin/com/rubusai/app/core/data/auth/SessionManagerTest.kt
git commit -m "feat(rubus-ai-kmp): login y logout del SessionManager"
```

---

### Task 9: Cableado de Koin (`authModule`, DataStore único, almacén del usuario)

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Modify: `shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt`
- Modify: `shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`

Los `ViewModel` se registran en la Task 12 y la 14; aquí solo el repositorio y el `SessionManager`.

- [ ] **Step 1: Escribir el test que falla**

En `KoinGraphTest.kt` añade estos imports junto a los existentes:

```kotlin
import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.UserStorage
```

y este test antes de `configModuleFallaAlCrearseSiFaltaElHostEnDev`:

```kotlin
    @Test
    fun elGrafoResuelveElSessionManagerComoUnicaInstancia() = runTest {
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val manager = app.koin.get<SessionManager>()

            assertSame(manager, app.koin.get<SessionManager>())
            app.koin.get<AuthRepository>()
        } finally {
            app.close()
        }
    }

```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.di.KoinGraphTest"`
Expected: FAIL (`NoDefinitionFoundException` para `SessionManager`).

- [ ] **Step 3: Implementar el módulo común**

`AppModule.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.AuthRepository
import com.rubusai.app.core.data.auth.AuthRepositoryImpl
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.network.TokenRefresher
import com.rubusai.app.core.network.createHttpClient
import com.rubusai.app.core.network.createRefreshClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
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

/**
 * Sesión: repositorio y `SessionManager`. Cada módulo de plataforma aporta `UserStorage`.
 * El ámbito del `SessionManager` vive lo mismo que la app, para escuchar `SessionEvents.expired`
 * todo el tiempo.
 */
internal fun authModule(): Module = module {
    single<AuthRepository> { AuthRepositoryImpl(client = get()) }
    single {
        SessionManager(
            repository = get(),
            tokenStorage = get(),
            userStorage = get(),
            sessionEvents = get(),
            scope = CoroutineScope(SupervisorJob() + Dispatchers.Default),
        )
    }
}

internal fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule(),
    authModule(),
)
```

- [ ] **Step 4: Implementar los módulos de plataforma**

`PlatformModule.android.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.di

import androidx.datastore.core.DataStore
import androidx.datastore.core.handlers.ReplaceFileCorruptionHandler
import androidx.datastore.preferences.core.PreferenceDataStoreFactory
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.emptyPreferences
import androidx.datastore.preferences.preferencesDataStoreFile
import com.rubusai.app.core.platform.DataStoreTokenStorage
import com.rubusai.app.core.platform.DataStoreUserStorage
import com.rubusai.app.core.platform.KeystoreTokenCipher
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.TokenCipher
import com.rubusai.app.core.platform.UserStorage
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.okhttp.OkHttp
import io.ktor.client.plugins.logging.ANDROID
import io.ktor.client.plugins.logging.Logger
import org.koin.android.ext.koin.androidContext
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Implementaciones de `core/platform` y piezas de red propias de Android.
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun androidPlatformModule(): Module = module {
    single<HttpClientEngine> { OkHttp.create() }
    single<Logger> { Logger.ANDROID }
    single<TokenCipher> { KeystoreTokenCipher() }
    // DataStore solo admite una instancia por archivo y proceso: la comparten los tokens y el
    // usuario, y por eso vive en su propio `single`. Si Koin se parase y se volviera a arrancar
    // en el mismo proceso (tests), la segunda instancia fallaría al usarse.
    single<DataStore<Preferences>> {
        val context = androidContext()
        PreferenceDataStoreFactory.create(
            // Un archivo corrupto se sustituye por uno vacío: se pierde la sesión, no la app.
            corruptionHandler = ReplaceFileCorruptionHandler { emptyPreferences() },
        ) {
            context.preferencesDataStoreFile(DataStoreTokenStorage.DATASTORE_NAME)
        }
    }
    single<SecureTokenStorage> { DataStoreTokenStorage(dataStore = get(), cipher = get()) }
    single<UserStorage> { DataStoreUserStorage(dataStore = get(), cipher = get()) }
}
```

`PlatformModule.ios.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import com.rubusai.app.core.platform.UserStorage
import io.ktor.client.engine.HttpClientEngine
import io.ktor.client.engine.darwin.Darwin
import io.ktor.client.plugins.logging.Logger
import org.koin.core.module.Module
import org.koin.dsl.module

/**
 * Implementaciones de `core/platform` y piezas de red propias de iOS.
 * La sesión (tokens y usuario) se guarda en memoria y se pierde al cerrar la app hasta que
 * exista la implementación con Keychain (fase 9).
 * Es función y no `val` porque contiene instancias: cada aplicación de Koin recibe las suyas.
 */
internal fun iosPlatformModule(): Module = module {
    single<HttpClientEngine> { Darwin.create() }
    single<Logger> {
        object : Logger {
            override fun log(message: String) = println(message)
        }
    }
    single<SecureTokenStorage> { InMemoryTokenStorage() }
    single<UserStorage> { InMemoryUserStorage() }
}
```

- [ ] **Step 5: Ejecutar los tests de Koin**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.di.*"`
Expected: PASS (`KoinGraphTest` y `KoinInitTest`).

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/di shared/src/androidMain/kotlin/com/rubusai/app/core/di shared/src/iosMain/kotlin/com/rubusai/app/core/di shared/src/commonTest/kotlin/com/rubusai/app/core/di
git commit -m "feat(rubus-ai-kmp): authModule y un único DataStore para tokens y usuario"
```

---

### Task 10: `RubusScreen` y refactor de `DiagnosticoScreen` y `CatalogoScreen`

Es un refactor sin cambio de comportamiento: la red de seguridad son los tests de navegación existentes (que dibujan las pantallas dev). `Marcador` se migra en la Task 15, cuando se reescribe `RubusNavHost`.

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusScreen.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/dev/DiagnosticoScreen.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/dev/CatalogoScreen.kt`

- [ ] **Step 1: Crear `RubusScreen`**

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

/**
 * Superficie de una pantalla completa: fondo del tema, respeto de las barras del sistema y del
 * teclado, y un margen de 24 dp. Por defecto centra el contenido; con [scrollable] el contenido
 * crece hacia abajo (y no se centra: un contenedor desplazable no conoce su altura).
 */
@Composable
fun RubusScreen(
    modifier: Modifier = Modifier,
    scrollable: Boolean = false,
    verticalArrangement: Arrangement.Vertical = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
    horizontalAlignment: Alignment.Horizontal = Alignment.CenterHorizontally,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .then(if (scrollable) Modifier.verticalScroll(rememberScrollState()) else Modifier)
                .padding(24.dp),
            verticalArrangement = verticalArrangement,
            horizontalAlignment = horizontalAlignment,
            content = content,
        )
    }
}
```

- [ ] **Step 2: Migrar `DiagnosticoScreen`**

`DiagnosticoScreen.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.dev

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.text.style.TextAlign
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusScreen
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

// Solo existe en el flavor dev: comprueba a simple vista que flavor, Koin, tema y red
// están conectados.
@Composable
fun DiagnosticoScreen() {
    val envConfig = koinInject<EnvConfig>()
    val httpClient = koinInject<HttpClient>()
    val scope = rememberCoroutineScope()
    var checking by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }

    RubusScreen {
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

- [ ] **Step 3: Migrar `CatalogoScreen` con un script**

Desde `rubus-ai-kmp/`, crea y ejecuta este script (cambia el envoltorio `Surface`+`Column` por `RubusScreen` y quita un nivel de sangría al contenido):

```bash
python3 - <<'EOF'
import pathlib
p = pathlib.Path("shared/src/commonMain/kotlin/com/rubusai/app/dev/CatalogoScreen.kt")
s = p.read_text().rstrip() + "\n"
old_head = """    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
"""
new_head = """    RubusScreen(
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.Start,
    ) {
"""
old_tail = "        }\n    }\n}\n"
assert old_head in s, "no se encontró la cabecera de CatalogoScreen"
assert s.endswith(old_tail), "no se encontró el final de CatalogoScreen"
head, body = s.split(old_head)
body = body[: -len(old_tail)]
body = "".join(l[4:] if l.startswith("    ") else l for l in body.splitlines(keepends=True))
s = head + new_head + body + "    }\n}\n"
s = s.replace(
    "import androidx.compose.runtime.setValue\n",
    "import androidx.compose.runtime.setValue\nimport androidx.compose.ui.Alignment\n",
)
s = s.replace(
    "import com.rubusai.app.core.designsystem.component.RubusLoadingState\n",
    "import com.rubusai.app.core.designsystem.component.RubusLoadingState\nimport com.rubusai.app.core.designsystem.component.RubusScreen\n",
)
p.write_text(s)
EOF
git diff --stat shared/src/commonMain/kotlin/com/rubusai/app/dev/CatalogoScreen.kt
```
Expected: el diff muestra unas 20 líneas cambiadas y el script no lanza `AssertionError`.

- [ ] **Step 4: Compilar y pasar los tests de navegación existentes**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.navigation.*"`
Expected: PASS (los tests siguen abriendo Diagnóstico y Catálogo desde el Splash marcador).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusScreen.kt shared/src/commonMain/kotlin/com/rubusai/app/dev
git commit -m "refactor(rubus-ai-kmp): RubusScreen reemplaza el layout repetido de las pantallas dev"
```

---

### Task 11: Área táctil de 48 dp en el botón de contraseña

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusTextField.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem/component/RubusTextFieldTest.kt`

- [ ] **Step 1: Escribir el test que falla**

En `RubusTextFieldTest.kt` añade estos imports (junto a los de `androidx.compose.ui.test` y `androidx.compose.ui.text`):

```kotlin
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.unit.dp
```

y este test antes de `muestraElTextoDeError`:

```kotlin
    @Test
    fun elBotonDeContrasenaTieneAreaTactilDe48dp() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "",
                    onValueChange = {},
                    label = "Clave",
                    isPassword = true,
                    showPasswordLabel = "Mostrar",
                    hidePasswordLabel = "Ocultar",
                )
            }
        }

        rule.onNodeWithText("Mostrar").assertHeightIsAtLeast(48.dp).assertWidthIsAtLeast(48.dp)
    }

```

- [ ] **Step 2: Ejecutar para ver que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.designsystem.component.RubusTextFieldTest"`
Expected: FAIL en `elBotonDeContrasenaTieneAreaTactilDe48dp` (el botón mide la altura del texto).

- [ ] **Step 3: Implementar**

En `RubusTextField.kt` añade el import:

```kotlin
import androidx.compose.foundation.layout.wrapContentSize
```

y cambia el `Row` de `decorationBox`. Sustituye:

```kotlin
                        .border(RubusDimens.BorderWidth, borderColor, shape)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.weight(1f)) { innerTextField() }
```

por:

```kotlin
                        .border(RubusDimens.BorderWidth, borderColor, shape)
                        .padding(horizontal = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    // El relleno vertical va aquí y no en el Row: así el botón de contraseña
                    // (48 dp) cabe sin agrandar el campo por encima de ButtonHeight.
                    Box(modifier = Modifier.weight(1f).padding(vertical = 12.dp)) { innerTextField() }
```

y sustituye:

```kotlin
                            modifier = Modifier
                                .clickable(enabled = enabled, role = Role.Button) {
                                    passwordVisible = !passwordVisible
                                }
                                .padding(start = 12.dp),
```

por:

```kotlin
                            modifier = Modifier
                                .clickable(enabled = enabled, role = Role.Button) {
                                    passwordVisible = !passwordVisible
                                }
                                // Área táctil mínima de 48 dp; el texto queda centrado en ella.
                                .defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)
                                .wrapContentSize(Alignment.Center)
                                .padding(start = 12.dp),
```

- [ ] **Step 4: Ejecutar para ver que pasa (y que los demás tests del campo siguen verdes)**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.designsystem.component.*"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusTextField.kt shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem/component/RubusTextFieldTest.kt
git commit -m "fix(rubus-ai-kmp): el botón de contraseña de RubusTextField mide al menos 48 dp"
```

---

### Task 12: `LoginViewModel`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/auth/LoginViewModel.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/feature/auth/LoginViewModelTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

```kotlin
package com.rubusai.app.feature.auth

import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.core.data.auth.LoginResult
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class LoginViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private fun viewModel(
        repository: FakeAuthRepository = FakeAuthRepository(),
        tokens: SecureTokenStorage = InMemoryTokenStorage(),
    ): LoginViewModel {
        val manager = SessionManager(
            repository, tokens, InMemoryUserStorage(), SessionEvents(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        return LoginViewModel(manager)
    }

    @Test
    fun elCorreoVacioMuestraSuErrorYNoLlamaAlRepositorio() = runTest(dispatcher) {
        val repository = FakeAuthRepository()
        val vm = viewModel(repository)
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(LoginFieldError.EmailRequired, vm.state.value.emailError)
        assertNull(vm.state.value.passwordError)
        assertTrue(repository.loginCalls.isEmpty())
    }

    @Test
    fun unCorreoSinFormaDeCorreoMuestraSuError() = runTest(dispatcher) {
        for (email in listOf("ana", "ana@", "@zarza", "ana @zarza", "ana@za@rza")) {
            val vm = viewModel()
            vm.onEmailChange(email)
            vm.onPasswordChange("secreto")

            vm.onSubmit()

            assertEquals(LoginFieldError.EmailInvalid, vm.state.value.emailError, "correo '$email'")
        }
    }

    @Test
    fun laContrasenaVaciaMuestraSuError() = runTest(dispatcher) {
        val vm = viewModel()
        vm.onEmailChange("ana@zarza.example")

        vm.onSubmit()

        assertEquals(LoginFieldError.PasswordRequired, vm.state.value.passwordError)
        assertNull(vm.state.value.emailError)
    }

    @Test
    fun unEnvioValidoRecortaElCorreoYLlamaAlLogin() = runTest(dispatcher) {
        val repository = FakeAuthRepository()
        val vm = viewModel(repository)
        vm.onEmailChange("  ana@zarza.example ")
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(listOf("ana@zarza.example" to "secreto"), repository.loginCalls)
        assertFalse(vm.state.value.submitting)
        assertNull(vm.state.value.formError)
    }

    @Test
    fun lasCredencialesMalasDejanElErrorEnElFormulario() = runTest(dispatcher) {
        val repository = FakeAuthRepository().apply {
            loginResult = LoginResult.Failure(LoginFailure.InvalidCredentials)
        }
        val vm = viewModel(repository)
        vm.onEmailChange("ana@zarza.example")
        vm.onPasswordChange("mala")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(LoginFailure.InvalidCredentials, vm.state.value.formError)
        assertFalse(vm.state.value.submitting)
    }

    @Test
    fun editarUnCampoLimpiaSuErrorYElDelFormulario() = runTest(dispatcher) {
        val repository = FakeAuthRepository().apply {
            loginResult = LoginResult.Failure(LoginFailure.Network)
        }
        val vm = viewModel(repository)
        vm.onEmailChange("ana")
        vm.onSubmit()
        assertEquals(LoginFieldError.EmailInvalid, vm.state.value.emailError)

        vm.onEmailChange("ana@zarza.example")
        assertNull(vm.state.value.emailError)

        vm.onPasswordChange("secreto")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(LoginFailure.Network, vm.state.value.formError)

        vm.onPasswordChange("otra")
        assertNull(vm.state.value.formError)
    }

    @Test
    fun unDobleEnvioSeIgnoraMientrasSeEnvia() = runTest(dispatcher) {
        val repository = FakeAuthRepository().apply { loginGate = CompletableDeferred() }
        val vm = viewModel(repository)
        vm.onEmailChange("ana@zarza.example")
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(vm.state.value.submitting)
        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(1, repository.loginCalls.size)
        repository.loginGate!!.complete(Unit)
        advanceUntilIdle()
        assertFalse(vm.state.value.submitting)
    }

    @Test
    fun unaExcepcionDelAlmacenamientoSeMuestraComoInesperada() = runTest(dispatcher) {
        val failingTokens = object : SecureTokenStorage {
            override suspend fun read(): AuthTokens? = null
            override suspend fun save(tokens: AuthTokens) = throw IllegalStateException("disco lleno")
            override suspend fun clear() = Unit
        }
        val vm = viewModel(tokens = failingTokens)
        vm.onEmailChange("ana@zarza.example")
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(LoginFailure.Unexpected, vm.state.value.formError)
        assertFalse(vm.state.value.submitting)
    }
}
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.auth.LoginViewModelTest"`
Expected: FAIL (no compila: `LoginViewModel` no existe).

- [ ] **Step 3: Implementar**

`LoginViewModel.kt`:

```kotlin
package com.rubusai.app.feature.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.core.data.auth.LoginResult
import com.rubusai.app.core.data.auth.SessionManager
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Error de un campo detectado antes de enviar. La pantalla lo convierte en texto. */
internal enum class LoginFieldError { EmailRequired, EmailInvalid, PasswordRequired }

internal data class LoginUiState(
    val email: String = "",
    val password: String = "",
    val emailError: LoginFieldError? = null,
    val passwordError: LoginFieldError? = null,
    val submitting: Boolean = false,
    val formError: LoginFailure? = null,
)

// Forma `x@y`: lo que el backend valida de verdad es el correo; esto solo evita enviar un error evidente.
private val EmailShape = Regex("""[^@\s]+@[^@\s]+""")

internal class LoginViewModel(private val sessionManager: SessionManager) : ViewModel() {
    private val _state = MutableStateFlow(LoginUiState())
    val state: StateFlow<LoginUiState> = _state.asStateFlow()

    fun onEmailChange(value: String) =
        _state.update { it.copy(email = value, emailError = null, formError = null) }

    fun onPasswordChange(value: String) =
        _state.update { it.copy(password = value, passwordError = null, formError = null) }

    fun onSubmit() {
        val current = _state.value
        if (current.submitting) return

        val email = current.email.trim()
        val emailError = when {
            email.isEmpty() -> LoginFieldError.EmailRequired
            !EmailShape.matches(email) -> LoginFieldError.EmailInvalid
            else -> null
        }
        val passwordError = if (current.password.isEmpty()) LoginFieldError.PasswordRequired else null
        if (emailError != null || passwordError != null) {
            _state.update { it.copy(emailError = emailError, passwordError = passwordError, formError = null) }
            return
        }

        _state.update { it.copy(submitting = true, formError = null, emailError = null, passwordError = null) }
        viewModelScope.launch {
            val failure = try {
                (sessionManager.login(email, current.password) as? LoginResult.Failure)?.reason
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                // El guardado de la sesión falló: no hay causa del backend que mostrar.
                LoginFailure.Unexpected
            }
            // Con un login correcto el estado de sesión cambia y la navegación sale de esta pantalla.
            _state.update { it.copy(submitting = false, formError = failure) }
        }
    }
}
```

En `AppModule.kt` añade estos imports:

```kotlin
import com.rubusai.app.feature.auth.LoginViewModel
import org.koin.core.module.dsl.viewModelOf
```

y dentro de `authModule()`, tras el `single` del `SessionManager`:

```kotlin
    viewModelOf(::LoginViewModel)
```

- [ ] **Step 4: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.auth.LoginViewModelTest"`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/feature/auth shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt shared/src/commonTest/kotlin/com/rubusai/app/feature/auth
git commit -m "feat(rubus-ai-kmp): LoginViewModel con validación y envío"
```

---

### Task 13: Splash, botones dev y pantalla de Login

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/dev/DevActions.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/splash/SplashScreen.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/auth/LoginTexts.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/auth/LoginScreen.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/feature/auth/LoginScreenTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

`LoginScreenTest.kt`:

```kotlin
package com.rubusai.app.feature.auth

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertDoesNotExist
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasContentDescription
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.dev.DevActions
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Pantalla alta (411x891 dp) a propósito: con la de Robolectric por defecto (320x470) el
// formulario desplazable deja los botones dev fuera del viewport y assertIsDisplayed falla.
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h891dp")
class LoginScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private fun render(
        state: LoginUiState = LoginUiState(),
        sessionExpired: Boolean = false,
        devActions: DevActions? = null,
        onEmailChange: (String) -> Unit = {},
        onSubmit: () -> Unit = {},
    ) {
        rule.setContent {
            RubusTheme {
                LoginScreen(
                    state = state,
                    sessionExpired = sessionExpired,
                    onEmailChange = onEmailChange,
                    onPasswordChange = {},
                    onSubmit = onSubmit,
                    devActions = devActions,
                )
            }
        }
    }

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    @Test
    fun muestraLosErroresDeCampo() {
        render(LoginUiState(emailError = LoginFieldError.EmailInvalid, passwordError = LoginFieldError.PasswordRequired))

        awaitText("Escribe un correo válido.")
        awaitText("Escribe tu contraseña.")
    }

    @Test
    fun muestraElErrorDeCredencialesBajoElFormulario() {
        render(LoginUiState(formError = LoginFailure.InvalidCredentials))

        awaitText("Correo o contraseña incorrectos.")
    }

    @Test
    fun mientrasEnviaElBotonDiceEntrandoYEstaDeshabilitado() {
        render(LoginUiState(submitting = true))

        awaitText("ENTRANDO…")
        rule.onNodeWithText("ENTRANDO…").assertIsNotEnabled()
    }

    @Test
    fun elBotonEnviaElFormulario() {
        var enviados = 0
        render(onSubmit = { enviados++ })
        awaitText("INICIAR SESIÓN")

        rule.onNodeWithText("INICIAR SESIÓN").performClick()

        assertEquals(1, enviados)
    }

    @Test
    fun escribirEnElCorreoAvisaDelCambio() {
        var recibido = ""
        render(onEmailChange = { recibido = it })
        awaitText("Correo electrónico")

        rule.onNode(hasSetTextAction() and hasContentDescription("Correo electrónico")).performTextInput("a")

        assertEquals("a", recibido)
    }

    @Test
    fun muestraElAvisoDeSesionExpirada() {
        render(sessionExpired = true)

        awaitText("Tu sesión expiró. Inicia sesión de nuevo.")
    }

    @Test
    fun sinExpiracionNoMuestraElAviso() {
        render(sessionExpired = false)
        awaitText("INICIAR SESIÓN")

        rule.onNodeWithText("Tu sesión expiró. Inicia sesión de nuevo.").assertDoesNotExist()
    }

    @Test
    fun laContrasenaSePuedeMostrarYOcultar() {
        render()
        awaitText("Mostrar")

        rule.onNodeWithText("Mostrar").performClick()

        awaitText("Ocultar")
    }

    @Test
    fun losBotonesDevSoloSalenConDevActions() {
        render(devActions = DevActions(onDiagnostico = {}, onCatalogo = {}))

        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun sinDevActionsNoHayBotonesDev() {
        render(devActions = null)
        awaitText("INICIAR SESIÓN")

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }
}
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.auth.LoginScreenTest"`
Expected: FAIL (no compila: `LoginScreen`, `DevActions` no existen).

- [ ] **Step 3: Crear `DevActions` y `DevButtons`**

`dev/DevActions.kt`:

```kotlin
package com.rubusai.app.dev

import androidx.compose.runtime.Composable
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant

/** Accesos a las pantallas de desarrollo. Solo existen en `Environment.DEV`: fuera de DEV se pasa `null`. */
class DevActions(val onDiagnostico: () -> Unit, val onCatalogo: () -> Unit)

// Texto fijo a propósito: es herramienta de desarrollo y no se traduce.
@Composable
fun DevButtons(actions: DevActions) {
    RubusButton(text = "Diagnóstico", onClick = actions.onDiagnostico, variant = RubusButtonVariant.Secondary)
    RubusButton(text = "Catálogo", onClick = actions.onCatalogo, variant = RubusButtonVariant.Outline)
}
```

- [ ] **Step 4: Crear el Splash**

`feature/splash/SplashScreen.kt`:

```kotlin
package com.rubusai.app.feature.splash

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.app_name
import com.rubusai.app.resources.logo_rubus
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource

/** Vista del estado `Loading`: solo el logo. No decide nada, la navegación sale de aquí cuando hay sesión. */
@Composable
internal fun SplashScreen(modifier: Modifier = Modifier) {
    RubusScreen(modifier = modifier) {
        Image(
            painter = painterResource(Res.drawable.logo_rubus),
            contentDescription = stringResource(Res.string.app_name),
            modifier = Modifier.size(128.dp),
        )
    }
}
```

- [ ] **Step 5: Crear la tabla causa → texto**

`feature/auth/LoginTexts.kt`:

```kotlin
package com.rubusai.app.feature.auth

import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.login_error_email_invalid
import com.rubusai.app.resources.login_error_email_required
import com.rubusai.app.resources.login_error_password_required
import com.rubusai.app.resources.login_failure_invalid_credentials
import com.rubusai.app.resources.login_failure_invalid_input
import com.rubusai.app.resources.login_failure_network
import com.rubusai.app.resources.login_failure_rate_limited
import com.rubusai.app.resources.login_failure_unexpected
import com.rubusai.app.resources.login_failure_unsupported_role
import org.jetbrains.compose.resources.StringResource

internal fun LoginFailure.messageRes(): StringResource = when (this) {
    LoginFailure.InvalidCredentials -> Res.string.login_failure_invalid_credentials
    LoginFailure.RateLimited -> Res.string.login_failure_rate_limited
    LoginFailure.Network -> Res.string.login_failure_network
    LoginFailure.InvalidInput -> Res.string.login_failure_invalid_input
    LoginFailure.UnsupportedRole -> Res.string.login_failure_unsupported_role
    LoginFailure.Unexpected -> Res.string.login_failure_unexpected
}

internal fun LoginFieldError.messageRes(): StringResource = when (this) {
    LoginFieldError.EmailRequired -> Res.string.login_error_email_required
    LoginFieldError.EmailInvalid -> Res.string.login_error_email_invalid
    LoginFieldError.PasswordRequired -> Res.string.login_error_password_required
}
```

- [ ] **Step 6: Crear `LoginScreen` y `LoginRoute`**

`feature/auth/LoginScreen.kt`:

```kotlin
package com.rubusai.app.feature.auth

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.designsystem.component.RubusTextField
import com.rubusai.app.dev.DevActions
import com.rubusai.app.dev.DevButtons
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.app_name
import com.rubusai.app.resources.login_email_label
import com.rubusai.app.resources.login_password_label
import com.rubusai.app.resources.login_session_expired
import com.rubusai.app.resources.login_submit
import com.rubusai.app.resources.login_submitting
import com.rubusai.app.resources.login_title
import com.rubusai.app.resources.logo_rubus
import com.rubusai.app.resources.password_hide
import com.rubusai.app.resources.password_show
import org.jetbrains.compose.resources.painterResource
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

/** Conecta [LoginScreen] con su `ViewModel`. [sessionExpired] lo decide el estado de sesión que observa la navegación. */
@Composable
internal fun LoginRoute(sessionExpired: Boolean, devActions: DevActions?) {
    val viewModel = koinViewModel<LoginViewModel>()
    val state by viewModel.state.collectAsStateWithLifecycle()
    LoginScreen(
        state = state,
        sessionExpired = sessionExpired,
        onEmailChange = viewModel::onEmailChange,
        onPasswordChange = viewModel::onPasswordChange,
        onSubmit = viewModel::onSubmit,
        devActions = devActions,
    )
}

@Composable
internal fun LoginScreen(
    state: LoginUiState,
    sessionExpired: Boolean,
    onEmailChange: (String) -> Unit,
    onPasswordChange: (String) -> Unit,
    onSubmit: () -> Unit,
    modifier: Modifier = Modifier,
    devActions: DevActions? = null,
) {
    // Desplazable y alineado arriba: con el teclado abierto el formulario no cabe en pantallas pequeñas.
    RubusScreen(
        modifier = modifier,
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Spacer(Modifier.height(32.dp))
        Image(
            painter = painterResource(Res.drawable.logo_rubus),
            contentDescription = stringResource(Res.string.app_name),
            modifier = Modifier.size(96.dp),
        )
        Text(text = stringResource(Res.string.login_title), style = MaterialTheme.typography.headlineLarge)

        if (sessionExpired) {
            Text(
                text = stringResource(Res.string.login_session_expired),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }

        RubusTextField(
            value = state.email,
            onValueChange = onEmailChange,
            label = stringResource(Res.string.login_email_label),
            enabled = !state.submitting,
            errorText = state.emailError?.let { stringResource(it.messageRes()) },
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
            modifier = Modifier.fillMaxWidth(),
        )
        RubusTextField(
            value = state.password,
            onValueChange = onPasswordChange,
            label = stringResource(Res.string.login_password_label),
            enabled = !state.submitting,
            errorText = state.passwordError?.let { stringResource(it.messageRes()) },
            isPassword = true,
            showPasswordLabel = stringResource(Res.string.password_show),
            hidePasswordLabel = stringResource(Res.string.password_hide),
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onSubmit() }),
            modifier = Modifier.fillMaxWidth(),
        )

        state.formError?.let { failure ->
            Text(
                text = stringResource(failure.messageRes()),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                // Se anuncia al aparecer, igual que los errores de campo.
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        }

        RubusButton(
            text = stringResource(if (state.submitting) Res.string.login_submitting else Res.string.login_submit),
            onClick = onSubmit,
            enabled = !state.submitting,
            modifier = Modifier.fillMaxWidth(),
        )

        devActions?.let { DevButtons(it) }
    }
}
```

- [ ] **Step 7: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.auth.LoginScreenTest"`
Expected: PASS (10 tests).

- [ ] **Step 8: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/dev/DevActions.kt shared/src/commonMain/kotlin/com/rubusai/app/feature shared/src/androidHostTest/kotlin/com/rubusai/app/feature
git commit -m "feat(rubus-ai-kmp): Splash con logo, botones dev y pantalla de Login"
```

---

### Task 14: Home provisional (`HomeViewModel`, `HomeScreen`, `HomeRoute`)

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/home/HomeViewModel.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/home/HomeScreen.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/feature/home/HomeViewModelTest.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/feature/home/HomeScreenTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

`HomeViewModelTest.kt`:

```kotlin
package com.rubusai.app.feature.home

import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.data.auth.TOKENS
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    @Test
    fun exponeElEstadoDeSesionDelManager() = runTest(dispatcher) {
        val manager = SessionManager(
            FakeAuthRepository(), InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana), SessionEvents(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        manager.start()

        val vm = HomeViewModel(manager)

        assertEquals(SessionState.Authenticated(ana), vm.sessionState.value)
        assertFalse(vm.loggingOut.value)
    }

    @Test
    fun alCerrarSesionMarcaCerrandoYLaSesionTermina() = runTest(dispatcher) {
        val repository = FakeAuthRepository()
        val manager = SessionManager(
            repository, InMemoryTokenStorage(TOKENS), InMemoryUserStorage(ana), SessionEvents(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        manager.start()
        advanceUntilIdle()
        val vm = HomeViewModel(manager)

        vm.onLogout()
        assertTrue(vm.loggingOut.value)
        advanceUntilIdle()

        assertEquals(SessionState.Unauthenticated(), vm.sessionState.value)
        assertEquals(listOf<String?>("refresh-old"), repository.logoutCalls)
    }
}
```

`HomeScreenTest.kt`:

```kotlin
package com.rubusai.app.feature.home

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HomeScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private val ana = User("u1", "ana@zarza.example", UserRole.AGRONOMO, "Ana", "Pérez")

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    @Test
    fun muestraNombreCorreoYRolDelUsuario() {
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = {}) } }

        awaitText("Inicio")
        awaitText("Ana")
        awaitText("ana@zarza.example")
        awaitText("Agrónomo")
    }

    @Test
    fun elBotonCierraSesion() {
        var cierres = 0
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = { cierres++ }) } }
        awaitText("CERRAR SESIÓN")

        rule.onNodeWithText("CERRAR SESIÓN").performClick()

        assertEquals(1, cierres)
    }

    @Test
    fun mientrasCierraElBotonDiceCerrandoYEstaDeshabilitado() {
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = true, onLogout = {}) } }

        awaitText("CERRANDO SESIÓN…")
        rule.onNodeWithText("CERRANDO SESIÓN…").assertIsNotEnabled()
    }
}
```

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.home.*"`
Expected: FAIL (no compila: `HomeViewModel` y `HomeScreen` no existen).

- [ ] **Step 3: Implementar el `ViewModel`**

`feature/home/HomeViewModel.kt`:

```kotlin
package com.rubusai.app.feature.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

/** Home provisional: el usuario y el cierre de sesión. La Fase 4 lo sustituye por el inicio real. */
internal class HomeViewModel(private val sessionManager: SessionManager) : ViewModel() {
    val sessionState: StateFlow<SessionState> get() = sessionManager.state

    private val _loggingOut = MutableStateFlow(false)
    val loggingOut: StateFlow<Boolean> = _loggingOut.asStateFlow()

    fun onLogout() {
        if (_loggingOut.value) return
        _loggingOut.value = true
        // El estado de sesión cambia al terminar y la navegación sale de esta pantalla.
        viewModelScope.launch { sessionManager.logout() }
    }
}
```

- [ ] **Step 4: Implementar la pantalla**

`feature/home/HomeScreen.kt`:

```kotlin
package com.rubusai.app.feature.home

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.model.User
import com.rubusai.app.dev.DevActions
import com.rubusai.app.dev.DevButtons
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.home_logging_out
import com.rubusai.app.resources.home_logout
import com.rubusai.app.resources.home_title
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun HomeRoute(devActions: DevActions?) {
    val viewModel = koinViewModel<HomeViewModel>()
    val sessionState by viewModel.sessionState.collectAsStateWithLifecycle()
    val loggingOut by viewModel.loggingOut.collectAsStateWithLifecycle()
    HomeScreen(
        user = (sessionState as? SessionState.Authenticated)?.user,
        loggingOut = loggingOut,
        onLogout = viewModel::onLogout,
        devActions = devActions,
    )
}

@Composable
internal fun HomeScreen(
    user: User?,
    loggingOut: Boolean,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    devActions: DevActions? = null,
) {
    RubusScreen(modifier = modifier) {
        Text(text = stringResource(Res.string.home_title), style = MaterialTheme.typography.headlineLarge)
        user?.let {
            Text(text = it.displayName, style = MaterialTheme.typography.titleLarge)
            Text(text = it.email, style = MaterialTheme.typography.bodyLarge)
            Text(text = it.role.displayName, style = MaterialTheme.typography.bodyLarge)
        }
        RubusButton(
            text = stringResource(if (loggingOut) Res.string.home_logging_out else Res.string.home_logout),
            onClick = onLogout,
            enabled = !loggingOut,
            variant = RubusButtonVariant.Danger,
        )
        devActions?.let { DevButtons(it) }
    }
}
```

En `AppModule.kt` añade el import `import com.rubusai.app.feature.home.HomeViewModel` y, en `authModule()` tras `viewModelOf(::LoginViewModel)`:

```kotlin
    viewModelOf(::HomeViewModel)
```

- [ ] **Step 5: Ampliar `KoinGraphTest` con los dos `ViewModel`**

En `KoinGraphTest.kt` añade estos imports:

```kotlin
import com.rubusai.app.feature.auth.LoginViewModel
import com.rubusai.app.feature.home.HomeViewModel
```

y en el test `elGrafoResuelveElSessionManagerComoUnicaInstancia`, tras `app.koin.get<AuthRepository>()`:

```kotlin
            app.koin.get<LoginViewModel>()
            app.koin.get<HomeViewModel>()
```

- [ ] **Step 6: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.feature.home.*" --tests "com.rubusai.app.core.di.KoinGraphTest"`
Expected: PASS (5 tests de Home y los de `KoinGraphTest`).

- [ ] **Step 7: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/feature/home shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt shared/src/commonTest/kotlin/com/rubusai/app/feature/home shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt shared/src/androidHostTest/kotlin/com/rubusai/app/feature/home
git commit -m "feat(rubus-ai-kmp): Home provisional con el usuario y el cierre de sesión"
```

---

### Task 15: Navegación por sesión (`RubusNavHost` y `App`)

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/navigation/RubusNavHost.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/App.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/core/navigation/RubusNavHostTest.kt`

- [ ] **Step 1: Reescribir los tests de navegación (fallan)**

`RubusNavHostTest.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.navigation

import androidx.compose.runtime.MutableState
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import androidx.navigation.NavGraph
import androidx.navigation.NavHostController
import androidx.navigation.compose.rememberNavController
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.data.auth.anaAdmin
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.feature.auth.LoginViewModel
import com.rubusai.app.feature.home.HomeViewModel
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.SupervisorJob
import org.junit.Rule
import org.junit.runner.RunWith
import org.koin.compose.KoinApplication
import org.koin.core.module.Module
import org.koin.core.module.dsl.viewModelOf
import org.koin.dsl.module
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

// Pantalla alta (411x891 dp) a propósito: con la de Robolectric por defecto (320x470) el Login
// desplazable deja los botones dev fuera del viewport y los toques no los alcanzan.
@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w411dp-h891dp")
class RubusNavHostTest {

    @get:Rule
    val rule = createComposeRule()

    // Koin acotado a la composición (no el global): Login y Home piden sus ViewModels.
    private fun testModule(): Module {
        val manager = SessionManager(
            FakeAuthRepository(), InMemoryTokenStorage(), InMemoryUserStorage(), SessionEvents(),
            scope = CoroutineScope(SupervisorJob()),
        )
        return module {
            single { manager }
            viewModelOf(::LoginViewModel)
            viewModelOf(::HomeViewModel)
        }
    }

    private fun render(
        env: Environment,
        state: MutableState<SessionState> = mutableStateOf(SessionState.Loading),
    ): NavHostController {
        lateinit var nav: NavHostController
        rule.setContent {
            KoinApplication(application = { modules(testModule()) }) {
                nav = rememberNavController()
                RubusTheme { RubusNavHost(environment = env, sessionState = state.value, navController = nav) }
            }
        }
        rule.waitForIdle()
        return nav
    }

    private fun setSession(state: MutableState<SessionState>, value: SessionState) {
        rule.runOnIdle { state.value = value }
        rule.waitForIdle()
    }

    private fun NavHostController.visibleRoutes(): List<String?> =
        currentBackStack.value.filter { it.destination !is NavGraph }.map { it.destination.route }

    private fun route(route: Route) = route::class.qualifiedName

    // Une el registro (registeredRoutes) con el grafo real: una ruta sin composable<>, o un
    // composable<> sin registrar, rompe el test.
    private fun assertGrafoIgualARegistro(env: Environment) {
        val nav = render(env)

        // El patrón puede llevar "/{arg}" o "?opt={arg}": nos quedamos con el nombre de la clase.
        val enGrafo = nav.graph.map { it.route!!.substringBefore('/').substringBefore('?') }.toSet()
        val registradas = registeredRoutes(env).map { it.qualifiedName!! }.toSet()

        assertTrue(registradas.isNotEmpty())
        assertEquals(registradas, enGrafo)
    }

    @Test
    fun grafoDevCoincideConRutasRegistradas() = assertGrafoIgualARegistro(Environment.DEV)

    @Test
    fun grafoStagingCoincideConRutasRegistradas() = assertGrafoIgualARegistro(Environment.STAGING)

    @Test
    fun grafoProdCoincideConRutasRegistradas() = assertGrafoIgualARegistro(Environment.PROD)

    @Test
    fun mientrasCargaLaSesionSeQuedaEnElSplash() {
        val nav = render(Environment.PROD)

        assertEquals(listOf(route(Route.Splash)), nav.visibleRoutes())
    }

    @Test
    fun sinSesionVaAlLogin() {
        val state = mutableStateOf<SessionState>(SessionState.Loading)
        val nav = render(Environment.PROD, state)

        setSession(state, SessionState.Unauthenticated())

        assertEquals(listOf(route(Route.Login)), nav.visibleRoutes())
    }

    @Test
    fun conSesionVaAHomeYAtrasNoVuelveAlSplashNiAlLogin() {
        val state = mutableStateOf<SessionState>(SessionState.Loading)
        val nav = render(Environment.PROD, state)
        setSession(state, SessionState.Unauthenticated())

        setSession(state, SessionState.Authenticated(ana))

        assertEquals(listOf(route(Route.Home)), nav.visibleRoutes())
    }

    @Test
    fun alExpirarLaSesionVuelveAlLoginConElAvisoYSinPilaPrevia() {
        val state = mutableStateOf<SessionState>(SessionState.Authenticated(ana))
        val nav = render(Environment.PROD, state)

        setSession(state, SessionState.Unauthenticated(expired = true))

        assertEquals(listOf(route(Route.Login)), nav.visibleRoutes())
        rule.waitUntilAtLeastOneExists(hasText("Tu sesión expiró. Inicia sesión de nuevo."), timeoutMillis = 5_000)
    }

    @Test
    fun unRefrescoDelUsuarioNoNavega() {
        val state = mutableStateOf<SessionState>(SessionState.Authenticated(ana))
        val nav = render(Environment.PROD, state)
        var cambios = 0
        rule.runOnUiThread { nav.addOnDestinationChangedListener { _, _, _ -> cambios++ } }
        val antes = cambios

        setSession(state, SessionState.Authenticated(anaAdmin))

        assertEquals(antes, cambios)
        assertEquals(listOf(route(Route.Home)), nav.visibleRoutes())
    }

    @Test
    fun enDevElLoginOfreceDiagnosticoYCatalogo() {
        render(Environment.DEV, mutableStateOf(SessionState.Unauthenticated()))

        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun enDevElHomeOfreceDiagnosticoYCatalogo() {
        render(Environment.DEV, mutableStateOf(SessionState.Authenticated(ana)))

        rule.onNodeWithText("DIAGNÓSTICO").assertIsDisplayed()
        rule.onNodeWithText("CATÁLOGO").assertIsDisplayed()
    }

    @Test
    fun undobleToqueEnCatalogoNoLoApilaDosVeces() {
        val nav = render(Environment.DEV, mutableStateOf(SessionState.Unauthenticated()))

        // Reloj parado: la transición no termina y el botón sigue en pantalla para el 2.º toque.
        rule.mainClock.autoAdvance = false
        rule.onNodeWithText("CATÁLOGO").performClick()
        rule.onNodeWithText("CATÁLOGO").performClick()
        rule.mainClock.autoAdvance = true
        rule.waitForIdle()

        val catalogos = nav.currentBackStack.value.count { it.destination.route == Route.Catalogo::class.qualifiedName }
        assertEquals(1, catalogos)
    }

    @Test
    fun enProdElLoginNoOfreceRutasDeDesarrollo() {
        render(Environment.PROD, mutableStateOf(SessionState.Unauthenticated()))
        rule.waitUntilAtLeastOneExists(hasText("INICIAR SESIÓN"), timeoutMillis = 5_000)

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }

    @Test
    fun enStagingElLoginNoOfreceRutasDeDesarrollo() {
        render(Environment.STAGING, mutableStateOf(SessionState.Unauthenticated()))
        rule.waitUntilAtLeastOneExists(hasText("INICIAR SESIÓN"), timeoutMillis = 5_000)

        rule.onNodeWithText("DIAGNÓSTICO").assertDoesNotExist()
        rule.onNodeWithText("CATÁLOGO").assertDoesNotExist()
    }
}
```

Añade el import que falta: `import androidx.compose.ui.test.assertDoesNotExist`.

- [ ] **Step 2: Ejecutar para ver que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.navigation.RubusNavHostTest"`
Expected: FAIL (no compila: `RubusNavHost` no acepta `sessionState`).

- [ ] **Step 3: Reescribir `RubusNavHost`**

`RubusNavHost.kt` (reemplazar todo):

```kotlin
package com.rubusai.app.core.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.dev.CatalogoScreen
import com.rubusai.app.dev.DevActions
import com.rubusai.app.dev.DiagnosticoScreen
import com.rubusai.app.feature.auth.LoginRoute
import com.rubusai.app.feature.home.HomeRoute
import com.rubusai.app.feature.splash.SplashScreen

/**
 * Grafo de la app. Redirige según [sessionState]: `Loading` se queda en el Splash,
 * `Authenticated` va a `Home` y `Unauthenticated` a `Login`. Cada destino todavía no migrado
 * es un marcador con el nombre de la ruta; cada fase sustituye los suyos por la pantalla real.
 * `Diagnostico` y `Catalogo` solo existen en dev.
 */
@Composable
fun RubusNavHost(
    environment: Environment,
    sessionState: SessionState,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    val enDev = remember(environment) { Route.Diagnostico::class in registeredRoutes(environment) }
    val devActions = remember(navController, enDev) {
        if (enDev) {
            // launchSingleTop: un doble toque no apila la pantalla dev dos veces.
            DevActions(
                onDiagnostico = { navController.navigate(Route.Diagnostico) { launchSingleTop = true } },
                onCatalogo = { navController.navigate(Route.Catalogo) { launchSingleTop = true } },
            )
        } else {
            null
        }
    }

    // Se compara el destino y no el estado: un refresco del usuario (mismo tipo de estado)
    // no vuelve a navegar ni recarga la pantalla.
    val destination: Route? = when (sessionState) {
        SessionState.Loading -> null
        is SessionState.Authenticated -> Route.Home
        is SessionState.Unauthenticated -> Route.Login
    }
    LaunchedEffect(destination) {
        if (destination == null) return@LaunchedEffect
        // Vacía toda la pila: "atrás" no debe volver al Splash, al login ni a la sesión anterior.
        navController.navigate(destination) { popUpTo(navController.graph.id) { inclusive = true } }
    }

    NavHost(navController = navController, startDestination = StartRoute, modifier = modifier) {
        composable<Route.Splash> { SplashScreen() }
        composable<Route.Login> {
            LoginRoute(
                sessionExpired = (sessionState as? SessionState.Unauthenticated)?.expired == true,
                devActions = devActions,
            )
        }
        composable<Route.Home> { HomeRoute(devActions = devActions) }
        composable<Route.History> { Marcador("History") }
        composable<Route.Solicitudes> { Marcador("Solicitudes") }
        composable<Route.SolicitudDetalle> { entry ->
            Marcador("Solicitud ${entry.toRoute<Route.SolicitudDetalle>().id}")
        }
        composable<Route.Notifications> { Marcador("Notifications") }
        composable<Route.Profile> { Marcador("Profile") }
        composable<Route.Capture> { Marcador("Capture") }
        composable<Route.Result> { entry ->
            Marcador("Result ${entry.toRoute<Route.Result>().id}")
        }
        composable<Route.Queue> { Marcador("Queue") }
        if (enDev) {
            composable<Route.Diagnostico> { DiagnosticoScreen() }
            composable<Route.Catalogo> { CatalogoScreen() }
        }
    }
}

// Destino vacío de una ruta que todavía no tiene pantalla.
@Composable
private fun Marcador(nombre: String, content: @Composable ColumnScope.() -> Unit = {}) {
    RubusScreen(verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
        Text(text = nombre, style = MaterialTheme.typography.headlineLarge)
        content()
    }
}
```

- [ ] **Step 4: Reescribir `App.kt`**

```kotlin
package com.rubusai.app

import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.navigation.RubusNavHost
import org.koin.compose.koinInject

@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()
    val sessionManager = koinInject<SessionManager>()
    val sessionState by sessionManager.state.collectAsStateWithLifecycle()

    // Idempotente: una rotación vuelve a componer `App` y no debe releer la sesión.
    LaunchedEffect(sessionManager) { sessionManager.start() }

    RubusTheme {
        RubusNavHost(environment = envConfig.environment, sessionState = sessionState)
    }
}
```

- [ ] **Step 5: Ejecutar para ver que pasan**

Run: `./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.navigation.*"`
Expected: PASS (14 tests de `RubusNavHostTest` + `RoutesTest`). Si `popUpTo(navController.graph.id)` no vacía la pila y falla `conSesionVaAHome...` o `alExpirar...`, **detente y repórtalo** con la salida de `visibleRoutes()`.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/navigation shared/src/commonMain/kotlin/com/rubusai/app/App.kt shared/src/androidHostTest/kotlin/com/rubusai/app/core/navigation
git commit -m "feat(rubus-ai-kmp): la navegación redirige según el estado de sesión"
```

---

### Task 16: Permiso de red local en el flavor dev

**Files:**
- Modify: `androidApp/src/main/kotlin/com/rubusai/app/MainActivity.kt`

No tiene test automático: depende del sistema operativo (Android 17) y se verifica en el emulador en la Task 17.

- [ ] **Step 1: Reescribir `MainActivity`**

```kotlin
package com.rubusai.app

import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {

    private val requestLocalNetwork =
        registerForActivityResult(ActivityResultContracts.RequestPermission()) {
            // Sin acción: si se deniega, "Probar conexión" y el login fallan a la vista.
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)
        requestLocalNetworkIfNeeded()

        setContent {
            App()
        }
    }

    // Solo en dev: Android 17 (SDK 37) bloquea en silencio las IPs privadas (10.0.2.2, la LAN)
    // si la app no tiene este permiso. staging y prod usan hosts públicos y no lo declaran.
    private fun requestLocalNetworkIfNeeded() {
        if (BuildConfig.FLAVOR != "dev" || Build.VERSION.SDK_INT < LOCAL_NETWORK_SDK) return
        if (checkSelfPermission(LOCAL_NETWORK) != PackageManager.PERMISSION_GRANTED) {
            requestLocalNetwork.launch(LOCAL_NETWORK)
        }
    }

    private companion object {
        const val LOCAL_NETWORK = "android.permission.ACCESS_LOCAL_NETWORK"
        const val LOCAL_NETWORK_SDK = 37
    }
}
```

- [ ] **Step 2: Compilar el flavor dev**

Run: `./gradlew :androidApp:assembleDevDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 3: Commit**

```bash
git add androidApp/src/main/kotlin/com/rubusai/app/MainActivity.kt
git commit -m "feat(rubus-ai-kmp): pedir ACCESS_LOCAL_NETWORK al arrancar el flavor dev en Android 17"
```

---

### Task 17: Verificación completa, documentación y cierre

**Files:**
- Modify: `rubus-ai-kmp/docs/dependencias-pendientes.md`
- Modify: `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`

- [ ] **Step 1: Suite completa y ensamblado (lo que corre la CI)**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: BUILD SUCCESSFUL, sin tests fallidos.

- [ ] **Step 2: Compilar el código común para iOS (portabilidad)**

Run: `./gradlew :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64`
Expected: BUILD SUCCESSFUL. Si falla, algo de `commonMain`/`commonTest` usa una API solo de JVM o de Android: corrígelo en el código común, no en `iosMain`.

- [ ] **Step 3: Backend local y usuario de prueba**

El backend ya corre con Docker (`docker compose ps` desde la raíz del monorepo debe mostrar `fruit-backend` publicado en 3001). Si no hay usuario, crea uno con el seed:

```bash
cd /home/san/Proyectos/zarza-workspace-kmp-fase1-auth/fruit-backend && pnpm run seed:admin
```
Las credenciales las define el script del seed (no las imprimas en logs ni en commits).

- [ ] **Step 4: Verificación manual en el emulador** (criterio de cierre del spec)

Con el emulador Android 17 abierto (`adb devices` lista `emulator-5554`):

```bash
cd /home/san/Proyectos/zarza-workspace-kmp-fase1-auth/rubus-ai-kmp
./gradlew :androidApp:installDevDebug
adb shell am start -n com.rubusai.app.dev/com.rubusai.app.MainActivity
```

Comprueba, en orden, y anota el resultado de cada uno:

1. Al abrir por primera vez aparece el diálogo de red local: acéptalo. Se ve el logo y enseguida el Login.
2. Credenciales malas muestran "Correo o contraseña incorrectos."; sin red (modo avión) muestra "Sin conexión con el servidor. Verifica tu red."
3. Un correo mal escrito (`ana`) y una contraseña vacía muestran sus errores de campo sin llamar al backend.
4. Credenciales correctas llevan al Home provisional con nombre, correo y rol.
5. Cerrar la app desde recientes y abrirla: entra directo al Home, sin pasar por el Login, también en modo avión.
6. "Cerrar sesión" lleva al Login; al reabrir la app sigue en el Login. "Atrás" no vuelve al Home.
7. Token vencido: baja `JWT_ACCESS_EXPIRES_IN` en el `.env` de `fruit-backend` (p. ej. a `30s`), reconstruye ese servicio con `docker compose up -d --build fruit-backend`, inicia sesión, espera a que venza y toca algo que pida red: la app refresca sin sacar al usuario. Restaura el valor original después.
8. Botones Diagnóstico y Catálogo visibles en Login y Home (DEV); "Probar conexión" muestra "Conectado".

Si algún punto falla, **no cierres la fase**: repórtalo con el punto y lo observado.

- [ ] **Step 5: Actualizar la documentación**

Desde `rubus-ai-kmp/`, quita de `docs/dependencias-pendientes.md` los pendientes que esta fase resuelve y añade el estado a la Fase 1 del roadmap:

```bash
python3 - <<'EOF'
import datetime, pathlib

deps = pathlib.Path("docs/dependencias-pendientes.md")
resueltos = (
    "- **`User.displayName` no recorta espacios.**",
    "- El botón mostrar/ocultar contraseña de `RubusTextField` tiene un área táctil",
    "- El layout de superficie está repetido en `Marcador`",
    "- Los botones de `dev` del marcador de `Splash`",
)
lines = deps.read_text().split("\n")
kept = [l for l in lines if not l.startswith(resueltos)]
assert len(lines) - len(kept) == 4, f"se esperaban 4 pendientes resueltos y se quitaron {len(lines) - len(kept)}"
deps.write_text("\n".join(kept))

roadmap = pathlib.Path("docs/roadmap-migracion-kmp.md")
text = roadmap.read_text()
marker = "**Terminado cuando.** Login correcto lleva a una pantalla de inicio provisional;"
start = text.index(marker)
end = text.index("\n", start)
hoy = datetime.date.today().isoformat()
estado = (
    f"\n\nEstado: hecha el {hoy}. Verificada en un emulador Android 17: login, sesión que sobrevive "
    "al reinicio (también sin red), logout y refresh con el token vencido. El flavor `dev` pide "
    "`ACCESS_LOCAL_NETWORK` al arrancar. Spec y plan en `docs/superpowers/`."
)
roadmap.write_text(text[:end] + estado + text[end:])
EOF
git diff --stat docs
```
Expected: el diff toca los dos documentos y el script no lanza `AssertionError`.

- [ ] **Step 6: Commit**

```bash
git add docs
git commit -m "docs(rubus-ai-kmp): fase 1 hecha y verificada en emulador"
```

- [ ] **Step 7: Mergear a `main` y limpiar** (regla del usuario sobre worktrees)

Solo si todo está commiteado y los pasos 1–4 pasaron. Si hay cambios sin commitear o el merge tiene conflictos, **avisa al usuario antes de mergear o borrar nada**.

```bash
cd /home/san/Proyectos/zarza-workspace-kmp-fase1-auth && git status --short
cd /home/san/Proyectos/zarza-workspace && git merge --no-ff feature/kmp-fase1-auth -m "Merge feature/kmp-fase1-auth: login, sesión persistente y redirección por sesión en KMP"
git worktree remove ../zarza-workspace-kmp-fase1-auth
git branch -d feature/kmp-fase1-auth
git log --oneline -3
```
Expected: `git status` del worktree sin salida; el merge sin conflictos; la rama y el worktree eliminados.
