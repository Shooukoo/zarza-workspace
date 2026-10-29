# KMP Fase 2a: captura y subida — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un usuario autenticado tome o elija una foto, elija un campo y la suba con GPS (si lo hay) desde un teléfono Android físico, con reintento manual seguro.

**Architecture:** `commonMain` define modelos, repositorios (`CamposRepository`, `IngestionRepository`), el `CaptureViewModel` y la pantalla. Lo atado a Android entra por dos vías: interfaces con implementación inyectada por Koin (`ImageCompressor`, `LocationProvider`) y `@Composable` `expect/actual` para lo que necesita la `Activity` (cámara, galería, permiso de ubicación, vista previa). Antes de nada se corrige en `TokenRefresher` la ráfaga de refrescos tras un fallo transitorio.

**Tech Stack:** Kotlin 2.4.20, Compose Multiplatform 1.12.1, Ktor 3.6.0 (multipart, `MockEngine` en tests), Koin 4.2.2, AndroidX Activity Compose 1.13.0, ExifInterface, Play Services Location.

**Spec:** `docs/superpowers/specs/2026-10-28-kmp-fase2a-captura-subida-design.md`

---

## Convenciones de este plan

- Todos los comandos `./gradlew` se ejecutan desde `rubus-ai-kmp/` (dentro del worktree de la Tarea 0).
- Verificación estándar de cada tarea: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`. Tras ella, confirmar en `shared/build/test-results/testAndroidHostTest/*.xml` que las clases nuevas se ejecutaron, con `failures="0" errors="0"`. Una tarea no se da por buena solo porque compile: los tres (tests, ensamblado y, si toca `commonMain`/`iosMain`, la compilación de iOS) deben pasar.
- Compilación de iOS (funciona en Linux): `./gradlew :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64`.
- Un test de un solo archivo: `./gradlew :shared:testAndroidHostTest --tests "*NombreDelTest*"`.
- Los mensajes de commit no llevan línea de coautoría (regla del `CLAUDE.md` del usuario).
- Fechas y horas: `kotlin.time.Clock` e `Instant`, nunca los de `kotlinx.datetime`. Si el compilador pidiera `@OptIn(ExperimentalTime::class)` o `@OptIn(ExperimentalUuidApi::class)`, añadirlo en el archivo que falle.
- Textos de interfaz en `shared/src/commonMain/composeResources/values/strings.xml`. Los botones del design system muestran el texto en mayúsculas (los tests buscan `"CERRAR SESIÓN"`, no `"Cerrar sesión"`).

## Estructura de archivos

Rutas relativas a `rubus-ai-kmp/shared/src/` salvo que se indique otra cosa. Paquete base `com.rubusai.app`.

| Archivo | Responsabilidad |
|---------|-----------------|
| `commonMain/.../core/network/TokenRefresher.kt` (modificar) | Recuerda 5 s que un refresh token falló por causa transitoria |
| `commonMain/.../core/model/Campo.kt`, `UploadResult.kt`, `UploadMetadata.kt` | Modelos |
| `commonMain/.../core/data/campos/CamposRepository.kt` | `GET campos` |
| `commonMain/.../core/data/ingestion/IngestionRepository.kt` | `POST ingestion/upload` multipart y mapeo de errores |
| `commonMain/.../core/platform/ImageCompressor.kt`, `LocationProvider.kt` (modificar) | Contratos de plataforma |
| `commonMain/.../core/platform/PhotoPicker.kt` | `expect` de cámara, galería, permiso de ubicación y vista previa |
| `commonMain/.../feature/capture/CaptureViewModel.kt` | Estado y lógica de la captura |
| `commonMain/.../feature/capture/CaptureScreen.kt` | Pantalla (sin estado) y `CaptureRoute` |
| `androidMain/.../core/platform/AndroidImageCompressor.kt` | Compresión con `BitmapFactory` y EXIF |
| `androidMain/.../core/platform/FusedLocationProvider.kt` | GPS con Play Services |
| `androidMain/.../core/platform/PhotoPicker.android.kt` | `actual`: launchers, `FileProvider`, vista previa |
| `iosMain/.../core/platform/PhotoPicker.ios.kt` | `actual` vacíos hasta la Fase 9 |
| `androidApp/src/main/AndroidManifest.xml`, `androidApp/src/main/res/xml/file_paths.xml` | Permisos de ubicación y `FileProvider` |

---

### Task 0: Worktree

El `CLAUDE.md` global del usuario prohíbe cambiar de rama en el directorio actual: el trabajo va en un worktree.

- [ ] **Step 1: Comprobar el estado**

Run (desde la raíz del monorepo): `git status --short && git branch --show-current`
Expected: rama `main`; solo aparecen `M zarza_ai/android/gradle/wrapper/gradle-wrapper.properties` y `?? zarza_ai/android/build/` (cambios ajenos que se quedan donde están).

- [ ] **Step 2: Crear el worktree**

```bash
git worktree add ../zarza-workspace-kmp-fase2a -b feature/kmp-fase2a-captura
cp rubus-ai-kmp/local.properties ../zarza-workspace-kmp-fase2a/rubus-ai-kmp/local.properties
cd ../zarza-workspace-kmp-fase2a/rubus-ai-kmp
```

`local.properties` está fuera de git (lleva `sdk.dir`), por eso se copia. Todo lo demás del plan se hace en este directorio.

- [ ] **Step 3: Comprobar que compila**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`. Anotar el total de tests (suma de `tests` en `shared/build/test-results/testAndroidHostTest/*.xml`) como línea base.

---

### Task 1: Ráfaga de refrescos en `TokenRefresher`

Con un fallo transitorio de `auth/refresh`, `refreshTokens` devuelve `null` y cada petición que esperaba vuelve a entrar y repite la llamada (límite de 5 por minuto). `TokenRefresher` recuerda unos segundos que ese refresh token acaba de fallar y responde `TransientFailure` sin llamar.

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/network/TokenRefresher.kt`
- Modify: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/TokenRefresherTest.kt`
- Create: `shared/src/commonTest/kotlin/com/rubusai/app/core/network/HttpClientRefreshBurstTest.kt`

- [ ] **Step 1: Escribir los tests que fallan**

En `TokenRefresherTest.kt`, sustituir el helper `refresher` por:

```kotlin
    private fun TestScope.refresher(
        timeSource: TimeSource = TimeSource.Monotonic,
        handler: MockRequestHandler,
    ) = TokenRefresher(createRefreshClient(mockEngine(handler), testEnvConfig), timeSource)
```

Añadir a los imports:

```kotlin
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TestTimeSource
import kotlin.time.TimeSource
```

Añadir al final de la clase `TokenRefresherTest`:

```kotlin
    @Test
    fun unFalloTransitorioNoSeRepiteDentroDeLaVentana() = runTest {
        var calls = 0
        val time = TestTimeSource()
        val refresher = refresher(time) {
            calls++
            respondError(HttpStatusCode.ServiceUnavailable)
        }

        val first = refresher.refresh("refresh-old")
        time += 4.seconds
        val second = refresher.refresh("refresh-old")

        assertEquals(RefreshResult.TransientFailure, first)
        assertEquals(RefreshResult.TransientFailure, second)
        assertEquals(1, calls)
    }

    @Test
    fun pasadaLaVentanaSeVuelveAIntentar() = runTest {
        var calls = 0
        val time = TestTimeSource()
        val refresher = refresher(time) {
            calls++
            respondError(HttpStatusCode.ServiceUnavailable)
        }

        refresher.refresh("refresh-old")
        time += 6.seconds
        refresher.refresh("refresh-old")

        assertEquals(2, calls)
    }

    @Test
    fun otroRefreshTokenNoQuedaBloqueado() = runTest {
        var calls = 0
        val refresher = refresher(TestTimeSource()) {
            calls++
            respondError(HttpStatusCode.ServiceUnavailable)
        }

        refresher.refresh("refresh-a")
        refresher.refresh("refresh-b")

        assertEquals(2, calls)
    }

    @Test
    fun unRechazoNoSeRecuerda() = runTest {
        var calls = 0
        val refresher = refresher(TestTimeSource()) {
            calls++
            respondError(HttpStatusCode.Unauthorized)
        }

        assertEquals(RefreshResult.Rejected, refresher.refresh("refresh-old"))
        assertEquals(RefreshResult.Rejected, refresher.refresh("refresh-old"))
        assertEquals(2, calls)
    }
```

Crear `HttpClientRefreshBurstTest.kt`:

```kotlin
package com.rubusai.app.core.network

import io.ktor.client.engine.mock.respondError
import io.ktor.client.plugins.ClientRequestException
import io.ktor.client.request.get
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.test.runTest

class HttpClientRefreshBurstTest {

    @Test
    fun variasPeticionesConUnRefreshTransitorioFallidoHacenUnaSolaLlamadaARefresh() = runTest {
        var refreshCalls = 0
        val fixture = clientFixture { request ->
            if (request.url.encodedPath.endsWith("/auth/refresh")) {
                refreshCalls++
                respondError(HttpStatusCode.ServiceUnavailable)
            } else {
                respondError(HttpStatusCode.Unauthorized)
            }
        }

        val results = (1..3).map { async { runCatching { fixture.client.get("analyses") } } }.awaitAll()

        assertEquals(1, refreshCalls)
        assertTrue(results.all { it.exceptionOrNull() is ClientRequestException })
        // La sesión se conserva: un fallo transitorio no la cierra.
        assertEquals(AuthTokens("access-old", "refresh-old"), fixture.storage.read())
    }
}
```

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `./gradlew :shared:testAndroidHostTest --tests "*TokenRefresherTest*" --tests "*HttpClientRefreshBurstTest*"`
Expected: error de compilación (`TokenRefresher` no acepta `timeSource`).

- [ ] **Step 3: Implementar**

En `TokenRefresher.kt`, añadir a los imports:

```kotlin
import kotlin.time.Duration.Companion.seconds
import kotlin.time.TimeMark
import kotlin.time.TimeSource
```

Sustituir la clase `TokenRefresher` (desde su comentario KDoc hasta el final del archivo) por:

```kotlin
/** Cuánto se recuerda que un refresh token acaba de fallar por una causa transitoria. */
private val FAILURE_MEMORY = 5.seconds

private class RecentFailure(val refreshToken: String, val at: TimeMark)

/**
 * Pide un par de tokens nuevo a `POST auth/refresh`. [client] debe ser el de
 * [createRefreshClient]: sin autenticación y con la misma URL base que el de la app.
 *
 * Si un refresh falla por una causa transitoria, durante [FAILURE_MEMORY] las llamadas con ese
 * mismo token responden [RefreshResult.TransientFailure] sin llegar al backend. Sin esto, N
 * peticiones en espera harían N llamadas (límite de 5 por minuto) y con timeouts la última
 * tardaría N × 30 s. A cambio, un reintento manual dentro de esa ventana falla sin intentarlo.
 */
class TokenRefresher(
    private val client: HttpClient,
    private val timeSource: TimeSource = TimeSource.Monotonic,
) {
    // `Auth` serializa las llamadas a `refreshTokens`; si dos coincidieran, lo peor es una petición de más.
    private var recentFailure: RecentFailure? = null

    suspend fun refresh(refreshToken: String): RefreshResult {
        recentFailure?.let {
            if (it.refreshToken == refreshToken && it.at.elapsedNow() < FAILURE_MEMORY) {
                return RefreshResult.TransientFailure
            }
        }
        val result = request(refreshToken)
        recentFailure = if (result == RefreshResult.TransientFailure) {
            RecentFailure(refreshToken, timeSource.markNow())
        } else {
            null
        }
        return result
    }

    private suspend fun request(refreshToken: String): RefreshResult = try {
        val response = client.post("auth/refresh") { setBody(RefreshRequest(refreshToken)) }
        when {
            response.status.isSuccess() -> {
                val body = response.body<RefreshResponse>()
                RefreshResult.Success(AuthTokens(body.token, body.refreshToken))
            }
            response.status == HttpStatusCode.Unauthorized -> RefreshResult.Rejected
            else -> RefreshResult.TransientFailure
        }
    } catch (e: Exception) {
        // Solo se propaga la cancelación de quien llama; una CancellationException
        // que venga del motor o de un cliente cerrado es un fallo más.
        currentCoroutineContext().ensureActive()
        RefreshResult.TransientFailure
    }
}
```

- [ ] **Step 3b: Actualizar el KDoc de `RefreshResult.TransientFailure`**

En el mismo archivo, añadir al final del comentario de `TransientFailure` la línea: ` * Tras un fallo así, [TokenRefresher] no vuelve a llamar con ese token durante unos segundos.`

- [ ] **Step 4: Ejecutar los tests**

Run: `./gradlew :shared:testAndroidHostTest`
Expected: PASS de toda la suite. Si algún test existente de refresh fallara porque daba por hecho que un fallo transitorio se repite de inmediato, es el comportamiento que se cambia a propósito: ajustarlo para que avance el reloj con `TestTimeSource` (o para esperar una sola llamada) y dejar constancia en el mensaje del commit.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/network/TokenRefresher.kt shared/src/commonTest/kotlin/com/rubusai/app/core/network
git commit -m "fix(rubus-ai-kmp): TokenRefresher recuerda 5 s un fallo transitorio para no repetir el refresh en ráfaga"
```

---

### Task 2: Dependencias

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `shared/build.gradle.kts`

- [ ] **Step 1: Catálogo**

En `[versions]`, tras `androidx-core = "1.19.1"`, añadir:

```toml
androidx-exifinterface = "1.4.1"
play-services-location = "21.3.0"
```

En `[libraries]`, tras `androidx-core-ktx`, añadir:

```toml
androidx-exifinterface = { module = "androidx.exifinterface:exifinterface", version.ref = "androidx-exifinterface" }
play-services-location = { module = "com.google.android.gms:play-services-location", version.ref = "play-services-location" }
```

- [ ] **Step 2: `shared/build.gradle.kts`**

En `androidMain.dependencies { ... }` añadir:

```kotlin
            implementation(libs.androidx.activity.compose)
            implementation(libs.androidx.core.ktx)
            implementation(libs.androidx.exifinterface)
            implementation(libs.play.services.location)
```

- [ ] **Step 3: Comprobar que resuelve**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`. Si una versión no resolviera, subir a la más reciente de Google Maven con más de dos semanas de antigüedad, y dejar la versión final en el mensaje del commit.

- [ ] **Step 4: Commit**

```bash
git add gradle/libs.versions.toml shared/build.gradle.kts
git commit -m "build(rubus-ai-kmp): activity-compose, exifinterface y play-services-location en androidMain"
```

---

### Task 3: Modelos y `CamposRepository`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/Campo.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/UploadResult.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/model/UploadMetadata.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/campos/CamposRepository.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/campos/CamposRepositoryTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.core.data.campos

import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.TEST_BASE_URL
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class CamposRepositoryTest {

    private fun TestScope.repository(handler: MockRequestHandler) =
        CamposRepositoryImpl(clientFixture(handler = handler).client)

    @Test
    fun devuelveLosCamposDelBackendIgnorandoLosCamposDeMas() = runTest {
        var url: String? = null
        val repository = repository { request ->
            url = request.url.toString()
            respondJson(
                """[{"id":"c1","nombre":"Norte","codigoCampo":"N-01","productorId":"p1","extra":{"a":1}},""" +
                    """{"id":"c2","nombre":"Sur"}]""",
            )
        }

        val result = repository.list()

        assertEquals("$TEST_BASE_URL/campos", url)
        assertEquals(
            CamposResult.Success(listOf(Campo("c1", "Norte", "N-01"), Campo("c2", "Sur", ""))),
            result,
        )
    }

    @Test
    fun unaListaVaciaEsExito() = runTest {
        val repository = repository { respondJson("[]") }

        assertEquals(CamposResult.Success(emptyList()), repository.list())
    }

    @Test
    fun unErrorDelServidorEsFallo() = runTest {
        val repository = repository { respondError(HttpStatusCode.InternalServerError) }

        assertEquals(CamposResult.Failure, repository.list())
    }

    @Test
    fun sinRedEsFallo() = runTest {
        val repository = repository { throw FakeNetworkException() }

        assertEquals(CamposResult.Failure, repository.list())
    }

    @Test
    fun unaRespuestaQueNoEsUnaListaEsFallo() = runTest {
        val repository = repository { respondJson("""{"data":[]}""") }

        assertEquals(CamposResult.Failure, repository.list())
    }
}
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*CamposRepositoryTest*"`
Expected: error de compilación (`CamposRepositoryImpl`, `CamposResult` y `Campo` no existen).

- [ ] **Step 3: Implementar**

`core/model/Campo.kt`:

```kotlin
package com.rubusai.app.core.model

/** Campo (finca) al que se asocia una captura. */
data class Campo(val id: String, val nombre: String, val codigoCampo: String)
```

`core/model/UploadResult.kt`:

```kotlin
package com.rubusai.app.core.model

/** Lo que el backend devuelve al aceptar una imagen (`POST ingestion/upload`, 201). */
data class UploadResult(val imageId: String, val storageKey: String)
```

`core/model/UploadMetadata.kt`:

```kotlin
package com.rubusai.app.core.model

/**
 * Datos que acompañan a la imagen en la subida. [capturedAt] es ISO-8601 (`Instant.toString()`).
 * [offlineSyncId] identifica la captura y se reenvía igual en los reintentos.
 */
data class UploadMetadata(
    val capturedAt: String,
    val offlineSyncId: String,
    val campoId: String,
    val gpsLat: Double?,
    val gpsLon: Double?,
)
```

`core/data/campos/CamposRepository.kt`:

```kotlin
package com.rubusai.app.core.data.campos

import com.rubusai.app.core.model.Campo
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.get
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.Serializable

internal sealed interface CamposResult {
    data class Success(val campos: List<Campo>) : CamposResult
    data object Failure : CamposResult
}

internal interface CamposRepository {
    /** `GET campos`. El backend filtra por rol: agrónomo, sus campos asignados; productor, los suyos; admin y monitor, todos. */
    suspend fun list(): CamposResult
}

@Serializable
internal data class CampoDto(val id: String, val nombre: String, val codigoCampo: String = "") {
    fun toCampo() = Campo(id, nombre, codigoCampo)
}

/** Usa el `HttpClient` de la app. Nada de lo que falla se registra: el mensaje de un `ResponseException` incluye el cuerpo. */
internal class CamposRepositoryImpl(private val client: HttpClient) : CamposRepository {

    override suspend fun list(): CamposResult = try {
        CamposResult.Success(client.get("campos").body<List<CampoDto>>().map { it.toCampo() })
    } catch (e: Exception) {
        // Una cancelación de quien llama se propaga; cualquier otra causa (red, 5xx, cuerpo ilegible) es un fallo.
        currentCoroutineContext().ensureActive()
        CamposResult.Failure
    }
}
```

- [ ] **Step 4: Ejecutar el test**

Run: `./gradlew :shared:testAndroidHostTest --tests "*CamposRepositoryTest*"`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/model shared/src/commonMain/kotlin/com/rubusai/app/core/data/campos shared/src/commonTest/kotlin/com/rubusai/app/core/data/campos
git commit -m "feat(rubus-ai-kmp): modelos de captura y CamposRepository"
```

---

### Task 4: `IngestionRepository`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/data/ingestion/IngestionRepository.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/core/data/ingestion/IngestionRepositoryTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.core.data.ingestion

import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.model.UploadResult
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.TEST_BASE_URL
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import com.rubusai.app.core.network.respondNewTokens
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.toByteArray
import io.ktor.client.request.HttpRequestData
import io.ktor.http.ContentType
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.coroutines.delay
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class IngestionRepositoryTest {

    private val metadata = UploadMetadata(
        capturedAt = "2026-10-28T18:00:00Z",
        offlineSyncId = "sync-1",
        campoId = "campo-1",
        gpsLat = 19.4326,
        gpsLon = -99.1332,
    )
    private val jpeg = "JPEGBYTES".encodeToByteArray()
    private val created =
        """{"image_id":"img-1","storage_key":"uploads/img-1.jpg","status":"UPLOADED","metadata":{"capturedAt":"x"}}"""

    private fun TestScope.repository(handler: MockRequestHandler) =
        IngestionRepositoryImpl(clientFixture(handler = handler).client)

    private suspend fun HttpRequestData.bodyText() = body.toByteArray().decodeToString()

    private suspend fun TestScope.failureFor(status: HttpStatusCode): UploadOutcome =
        repository { respondError(status) }.upload(jpeg, metadata)

    @Test
    fun enviaElArchivoYLosCamposComoMultipart() = runTest {
        var method: HttpMethod? = null
        var url: String? = null
        var contentType: ContentType? = null
        var text: String? = null
        val repository = repository { request ->
            method = request.method
            url = request.url.toString()
            contentType = (request.body as OutgoingContent).contentType?.withoutParameters()
            text = request.bodyText()
            respondJson(created)
        }

        repository.upload(jpeg, metadata)

        assertEquals(HttpMethod.Post, method)
        assertEquals("$TEST_BASE_URL/ingestion/upload", url)
        assertEquals(ContentType.MultiPart.FormData, contentType)
        val body = text!!
        listOf("JPEGBYTES", "image/jpeg", "sync-1.jpg", "campo-1", "2026-10-28T18:00:00Z", "sync-1", "19.4326", "-99.1332")
            .forEach { assertTrue(body.contains(it), "falta $it en el cuerpo") }
    }

    @Test
    fun sinCoordenadasNoEnviaGpsLatNiGpsLon() = runTest {
        var text: String? = null
        val repository = repository { request ->
            text = request.bodyText()
            respondJson(created)
        }

        repository.upload(jpeg, metadata.copy(gpsLat = null, gpsLon = null))

        assertFalse(text!!.contains("gpsLat"))
        assertFalse(text!!.contains("gpsLon"))
    }

    @Test
    fun un201DevuelveElResultado() = runTest {
        val repository = repository { respondJson(created, HttpStatusCode.Created) }

        assertEquals(
            UploadOutcome.Success(UploadResult("img-1", "uploads/img-1.jpg")),
            repository.upload(jpeg, metadata),
        )
    }

    @Test
    fun un409EsExitoSinResultado() = runTest {
        // El backend actual no lo devuelve; se trata como éxito por si lo hiciera (la captura ya existía).
        assertEquals(UploadOutcome.Success(null), failureFor(HttpStatusCode.Conflict))
    }

    @Test
    fun cadaCodigoSeMapeaASuFallo() = runTest {
        assertEquals(UploadOutcome.Failure(UploadFailure.InvalidImage), failureFor(HttpStatusCode.BadRequest))
        assertEquals(UploadOutcome.Failure(UploadFailure.RateLimited), failureFor(HttpStatusCode.TooManyRequests))
        assertEquals(UploadOutcome.Failure(UploadFailure.Server), failureFor(HttpStatusCode.ServiceUnavailable))
        assertEquals(UploadOutcome.Failure(UploadFailure.Unexpected), failureFor(HttpStatusCode.NotFound))
    }

    @Test
    fun sinRedEsFalloDeRed() = runTest {
        val repository = repository { throw FakeNetworkException() }

        assertEquals(UploadOutcome.Failure(UploadFailure.Network), repository.upload(jpeg, metadata))
    }

    @Test
    fun superarLos90SegundosEsFalloDeRed() = runTest {
        val repository = repository {
            delay(91_000)
            respondJson(created)
        }

        assertEquals(UploadOutcome.Failure(UploadFailure.Network), repository.upload(jpeg, metadata))
    }

    @Test
    fun unaRespuestaIlegibleEsInesperada() = runTest {
        val repository = repository { respondJson("no es json") }

        assertEquals(UploadOutcome.Failure(UploadFailure.Unexpected), repository.upload(jpeg, metadata))
    }

    @Test
    fun un401SinRemedioEsNoAutorizado() = runTest {
        // Todo da 401, también el refresh: el backend rechaza la sesión.
        assertEquals(UploadOutcome.Failure(UploadFailure.Unauthorized), failureFor(HttpStatusCode.Unauthorized))
    }

    @Test
    fun trasUnRefreshReenviaElMismoCuerpo() = runTest {
        var uploads = 0
        var retriedBody: String? = null
        val repository = repository { request ->
            when {
                request.url.encodedPath.endsWith("/auth/refresh") -> respondNewTokens()
                request.headers[HttpHeaders.Authorization] == "Bearer access-new" -> {
                    uploads++
                    retriedBody = request.bodyText()
                    respondJson(created)
                }
                else -> {
                    uploads++
                    respondError(HttpStatusCode.Unauthorized)
                }
            }
        }

        val outcome = repository.upload(jpeg, metadata)

        assertEquals(UploadOutcome.Success(UploadResult("img-1", "uploads/img-1.jpg")), outcome)
        assertEquals(2, uploads)
        assertTrue(retriedBody!!.contains("JPEGBYTES"), "el reintento perdió el archivo")
    }
}
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*IngestionRepositoryTest*"`
Expected: error de compilación (`IngestionRepositoryImpl`, `UploadOutcome` y `UploadFailure` no existen).

- [ ] **Step 3: Implementar**

`core/data/ingestion/IngestionRepository.kt`:

```kotlin
package com.rubusai.app.core.data.ingestion

import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.model.UploadResult
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ResponseException
import io.ktor.client.plugins.timeout
import io.ktor.client.request.forms.MultiPartFormDataContent
import io.ktor.client.request.forms.formData
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.Headers
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpStatusCode
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

private const val UPLOAD_TIMEOUT_MS = 90_000L

internal enum class UploadFailure { Network, InvalidImage, RateLimited, Server, Unauthorized, Unexpected }

internal sealed interface UploadOutcome {
    /** [result] es `null` si el backend respondió 409 (la captura ya existía): no hay cuerpo que leer. */
    data class Success(val result: UploadResult?) : UploadOutcome
    data class Failure(val reason: UploadFailure) : UploadOutcome
}

internal interface IngestionRepository {
    /** `POST ingestion/upload`, multipart. [jpeg] ya viene comprimido. */
    suspend fun upload(jpeg: ByteArray, metadata: UploadMetadata): UploadOutcome
}

@Serializable
internal data class UploadResponseDto(
    @SerialName("image_id") val imageId: String,
    @SerialName("storage_key") val storageKey: String,
)

/**
 * Usa el `HttpClient` de la app (con refresh de token). El cuerpo multipart se construye desde un
 * `ByteArray`, así que Ktor puede reenviarlo tras un refresh. El `Content-Type` lo fija el
 * propio multipart (con su `boundary`); no se declara a mano.
 */
internal class IngestionRepositoryImpl(private val client: HttpClient) : IngestionRepository {

    override suspend fun upload(jpeg: ByteArray, metadata: UploadMetadata): UploadOutcome {
        val response = try {
            client.post("ingestion/upload") {
                timeout { requestTimeoutMillis = UPLOAD_TIMEOUT_MS }
                setBody(
                    MultiPartFormDataContent(
                        formData {
                            append(
                                "file",
                                jpeg,
                                Headers.build {
                                    append(HttpHeaders.ContentType, ContentType.Image.JPEG.toString())
                                    append(HttpHeaders.ContentDisposition, "filename=\"${metadata.offlineSyncId}.jpg\"")
                                },
                            )
                            append("campoId", metadata.campoId)
                            append("capturedAt", metadata.capturedAt)
                            append("offlineSyncId", metadata.offlineSyncId)
                            metadata.gpsLat?.let { append("gpsLat", it.toString()) }
                            metadata.gpsLon?.let { append("gpsLon", it.toString()) }
                        },
                    ),
                )
            }
        } catch (e: ResponseException) {
            val status = e.response.status
            return if (status == HttpStatusCode.Conflict) {
                UploadOutcome.Success(null)
            } else {
                UploadOutcome.Failure(status.toUploadFailure())
            }
        } catch (e: Exception) {
            // Una cancelación de quien llama se propaga; cualquier otra excepción sin respuesta
            // del servidor (sin red, timeout) es un fallo de red.
            currentCoroutineContext().ensureActive()
            return UploadOutcome.Failure(UploadFailure.Network)
        }
        val body = try {
            response.body<UploadResponseDto>()
        } catch (e: Exception) {
            currentCoroutineContext().ensureActive()
            return UploadOutcome.Failure(UploadFailure.Unexpected)
        }
        return UploadOutcome.Success(UploadResult(body.imageId, body.storageKey))
    }
}

private fun HttpStatusCode.toUploadFailure(): UploadFailure = when {
    this == HttpStatusCode.Unauthorized -> UploadFailure.Unauthorized
    this == HttpStatusCode.TooManyRequests -> UploadFailure.RateLimited
    this == HttpStatusCode.BadRequest -> UploadFailure.InvalidImage
    value >= 500 -> UploadFailure.Server
    else -> UploadFailure.Unexpected
}
```

- [ ] **Step 4: Ejecutar el test**

Run: `./gradlew :shared:testAndroidHostTest --tests "*IngestionRepositoryTest*"`
Expected: PASS (10 tests). Si `superarLos90SegundosEsFalloDeRed` fallara por el reloj virtual, comprobar que `clientFixture` usa `mockEngine` (corre en el dispatcher del test) antes de tocar el timeout.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/data/ingestion shared/src/commonTest/kotlin/com/rubusai/app/core/data/ingestion
git commit -m "feat(rubus-ai-kmp): IngestionRepository con subida multipart y errores por código HTTP"
```

---

### Task 5: Contratos de plataforma

`ImageCompressor` y `LocationProvider` hoy son interfaces vacías. Se les da su firma, se añaden los dobles de test y las implementaciones de iOS (no disponibles hasta la Fase 9).

**Files:**
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/ImageCompressor.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/LocationProvider.kt`
- Modify: `shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt`
- Create: `shared/src/commonTest/kotlin/com/rubusai/app/feature/capture/CaptureTestSupport.kt`

- [ ] **Step 1: Contratos**

`ImageCompressor.kt` (sustituye el contenido):

```kotlin
package com.rubusai.app.core.platform

/** Lado máximo, en píxeles, de la imagen que se sube. */
const val IMAGE_MAX_SIDE_PX = 2048

/** Calidad JPEG de la imagen que se sube. */
const val IMAGE_JPEG_QUALITY = 85

/** La imagen no se pudo leer, decodificar o comprimir. */
class ImageCompressionException(message: String, cause: Throwable? = null) : Exception(message, cause)

/** Compresión de imágenes antes de subirlas. */
interface ImageCompressor {
    /**
     * Lee la imagen de [path] y devuelve un JPEG de lado máximo [IMAGE_MAX_SIDE_PX] y calidad
     * [IMAGE_JPEG_QUALITY], sin EXIF y con la orientación ya aplicada a los píxeles.
     *
     * @throws ImageCompressionException si el archivo no existe, no es una imagen o no hay memoria.
     */
    suspend fun compress(path: String): ByteArray
}
```

`LocationProvider.kt` (sustituye el contenido):

```kotlin
package com.rubusai.app.core.platform

/** Tiempo máximo que se espera una posición. */
const val LOCATION_TIMEOUT_MS = 8_000L

data class Coordinates(val latitude: Double, val longitude: Double)

/** Acceso a la ubicación GPS del dispositivo. */
interface LocationProvider {
    /**
     * Posición actual con precisión alta, o `null` si no hay permiso, no llega señal en
     * [LOCATION_TIMEOUT_MS] o el servicio falla. No lanza, salvo por cancelación.
     */
    suspend fun current(): Coordinates?
}
```

- [ ] **Step 2: iOS**

En `PlatformModule.ios.kt`, añadir a los imports:

```kotlin
import com.rubusai.app.core.platform.Coordinates
import com.rubusai.app.core.platform.ImageCompressionException
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
```

y al final de `module { ... }`, tras `single<UserStorage>`:

```kotlin
    // Sin implementación hasta la Fase 9: la captura falla con un error controlado en vez de no compilar.
    single<ImageCompressor> {
        object : ImageCompressor {
            override suspend fun compress(path: String): ByteArray =
                throw ImageCompressionException("La compresión de imágenes no está disponible en iOS todavía")
        }
    }
    single<LocationProvider> {
        object : LocationProvider {
            override suspend fun current(): Coordinates? = null
        }
    }
```

- [ ] **Step 3: Dobles de test**

`shared/src/commonTest/kotlin/com/rubusai/app/feature/capture/CaptureTestSupport.kt`:

```kotlin
package com.rubusai.app.feature.capture

import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.data.ingestion.IngestionRepository
import com.rubusai.app.core.data.ingestion.UploadOutcome
import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.model.UploadResult
import com.rubusai.app.core.platform.Coordinates
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
import kotlinx.coroutines.CompletableDeferred

internal class FakeCamposRepository(
    var result: CamposResult = CamposResult.Success(emptyList()),
) : CamposRepository {
    var calls = 0

    override suspend fun list(): CamposResult {
        calls++
        return result
    }
}

internal class FakeIngestionRepository : IngestionRepository {
    var outcome: UploadOutcome = UploadOutcome.Success(UploadResult("img-1", "uploads/img-1.jpg"))
    var gate: CompletableDeferred<Unit>? = null
    val uploads = mutableListOf<Pair<ByteArray, UploadMetadata>>()

    override suspend fun upload(jpeg: ByteArray, metadata: UploadMetadata): UploadOutcome {
        uploads += jpeg to metadata
        gate?.await()
        return outcome
    }
}

internal class FakeImageCompressor(var bytes: ByteArray = "jpeg".encodeToByteArray()) : ImageCompressor {
    var failure: Exception? = null
    val paths = mutableListOf<String>()

    override suspend fun compress(path: String): ByteArray {
        paths += path
        failure?.let { throw it }
        return bytes
    }
}

internal class FakeLocationProvider(
    var coordinates: Coordinates? = Coordinates(19.4326, -99.1332),
) : LocationProvider {
    var calls = 0

    override suspend fun current(): Coordinates? {
        calls++
        return coordinates
    }
}
```

- [ ] **Step 4: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64`
Expected: `BUILD SUCCESSFUL`. Fallará la compilación de `androidMain` si hay una clase que implementara las interfaces vacías: no debería haberla (comprobar con `grep -rn "ImageCompressor\|LocationProvider" shared/src`).

- [ ] **Step 5: Commit**

```bash
git add shared/src
git commit -m "feat(rubus-ai-kmp): contratos de ImageCompressor y LocationProvider, con implementación vacía en iOS"
```

---

### Task 6: `CaptureViewModel`

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/capture/CaptureViewModel.kt`
- Test: `shared/src/commonTest/kotlin/com/rubusai/app/feature/capture/CaptureViewModelTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.feature.capture

import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.data.ingestion.UploadFailure
import com.rubusai.app.core.data.ingestion.UploadOutcome
import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.platform.Coordinates
import com.rubusai.app.core.platform.ImageCompressionException
import com.rubusai.app.core.platform.LocationProvider
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertContentEquals
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.time.Clock
import kotlin.time.Instant
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class CaptureViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private val norte = Campo("c1", "Norte", "N-01")
    private val sur = Campo("c2", "Sur", "S-01")
    private val clock = object : Clock {
        override fun now(): Instant = Instant.parse("2026-10-28T18:00:00Z")
    }

    private fun viewModel(
        campos: FakeCamposRepository = FakeCamposRepository(CamposResult.Success(listOf(norte, sur))),
        ingestion: FakeIngestionRepository = FakeIngestionRepository(),
        compressor: FakeImageCompressor = FakeImageCompressor(),
        location: FakeLocationProvider = FakeLocationProvider(),
    ): CaptureViewModel {
        var n = 0
        return CaptureViewModel(campos, ingestion, compressor, location, clock) { "sync-${++n}" }
    }

    @Test
    fun alCrearseCargaLosCampos() = runTest(dispatcher) {
        val vm = viewModel()
        assertEquals(CamposState.Loading, vm.state.value.campos)

        advanceUntilIdle()

        assertEquals(CamposState.Loaded(listOf(norte, sur)), vm.state.value.campos)
        assertNull(vm.state.value.selectedCampoId)
    }

    @Test
    fun conUnSoloCampoQuedaSeleccionado() = runTest(dispatcher) {
        val vm = viewModel(campos = FakeCamposRepository(CamposResult.Success(listOf(norte))))

        advanceUntilIdle()

        assertEquals("c1", vm.state.value.selectedCampoId)
    }

    @Test
    fun siFallaLaCargaDeCamposSePuedeReintentar() = runTest(dispatcher) {
        val campos = FakeCamposRepository(CamposResult.Failure)
        val vm = viewModel(campos = campos)
        advanceUntilIdle()
        assertEquals(CamposState.Failed, vm.state.value.campos)

        campos.result = CamposResult.Success(listOf(norte, sur))
        vm.loadCampos()
        advanceUntilIdle()

        assertEquals(CamposState.Loaded(listOf(norte, sur)), vm.state.value.campos)
        assertEquals(2, campos.calls)
    }

    @Test
    fun alElegirUnaFotoSeGeneraSuIdYSuFecha() = runTest(dispatcher) {
        val vm = viewModel()

        vm.onPhotoChosen("/cache/a.jpg")

        assertEquals(CapturedPhoto("/cache/a.jpg", "sync-1", "2026-10-28T18:00:00Z"), vm.state.value.photo)
    }

    @Test
    fun sinFotoOSinCampoNoSePuedeSubir() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository()
        val vm = viewModel(ingestion = ingestion)
        advanceUntilIdle()
        assertFalse(vm.state.value.canUpload)

        vm.onPhotoChosen("/cache/a.jpg")
        assertFalse(vm.state.value.canUpload)
        vm.onUpload()
        advanceUntilIdle()

        assertTrue(ingestion.uploads.isEmpty())
    }

    @Test
    fun subeLaFotoComprimidaConGpsYCampo() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository()
        val compressor = FakeImageCompressor(bytes = byteArrayOf(1, 2, 3))
        val vm = viewModel(ingestion = ingestion, compressor = compressor)
        advanceUntilIdle()
        vm.onCampoSelected("c2")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        advanceUntilIdle()

        assertEquals(listOf("/cache/a.jpg"), compressor.paths)
        val (bytes, metadata) = ingestion.uploads.single()
        assertContentEquals(byteArrayOf(1, 2, 3), bytes)
        assertEquals(UploadMetadata("2026-10-28T18:00:00Z", "sync-1", "c2", 19.4326, -99.1332), metadata)
        assertTrue(vm.state.value.uploaded)
        assertFalse(vm.state.value.uploading)
        assertNull(vm.state.value.failure)
    }

    @Test
    fun sinGpsSubeIgualConCoordenadasNulas() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository()
        val vm = viewModel(ingestion = ingestion, location = FakeLocationProvider(coordinates = null))
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        advanceUntilIdle()

        val metadata = ingestion.uploads.single().second
        assertNull(metadata.gpsLat)
        assertNull(metadata.gpsLon)
        assertTrue(vm.state.value.uploaded)
    }

    @Test
    fun unFalloDeRedPermiteReintentarConElMismoIdSinRecomprimir() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository().apply { outcome = UploadOutcome.Failure(UploadFailure.Network) }
        val compressor = FakeImageCompressor()
        val location = FakeLocationProvider()
        val vm = viewModel(ingestion = ingestion, compressor = compressor, location = location)
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        advanceUntilIdle()
        assertEquals(CaptureFailure.Network, vm.state.value.failure)
        assertFalse(vm.state.value.uploaded)
        assertTrue(vm.state.value.canUpload)

        ingestion.outcome = UploadOutcome.Success(null)
        vm.onUpload()
        advanceUntilIdle()

        assertEquals(listOf("sync-1", "sync-1"), ingestion.uploads.map { it.second.offlineSyncId })
        assertEquals(1, compressor.paths.size)
        assertEquals(1, location.calls)
        assertTrue(vm.state.value.uploaded)
        assertNull(vm.state.value.failure)
    }

    @Test
    fun unaFotoNuevaGeneraOtroIdLimpiaElErrorYRecomprime() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository().apply { outcome = UploadOutcome.Failure(UploadFailure.Network) }
        val compressor = FakeImageCompressor()
        val vm = viewModel(ingestion = ingestion, compressor = compressor)
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")
        vm.onUpload()
        advanceUntilIdle()

        vm.onPhotoChosen("/cache/b.jpg")
        assertNull(vm.state.value.failure)
        assertEquals("sync-2", vm.state.value.photo?.offlineSyncId)
        vm.onUpload()
        advanceUntilIdle()

        assertEquals(listOf("/cache/a.jpg", "/cache/b.jpg"), compressor.paths)
        assertEquals("sync-2", ingestion.uploads.last().second.offlineSyncId)
    }

    @Test
    fun unFalloDeCompresionNoSeReintentaYNoSube() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository()
        val compressor = FakeImageCompressor().apply { failure = ImageCompressionException("corrupta") }
        val vm = viewModel(ingestion = ingestion, compressor = compressor)
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        advanceUntilIdle()

        assertEquals(CaptureFailure.Compression, vm.state.value.failure)
        assertFalse(vm.state.value.canUpload)
        assertTrue(ingestion.uploads.isEmpty())
    }

    @Test
    fun cadaFalloDeSubidaSeMapeaASuMensaje() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository()
        val vm = viewModel(campos = FakeCamposRepository(CamposResult.Success(listOf(norte))), ingestion = ingestion)
        advanceUntilIdle()
        val expected = mapOf(
            UploadFailure.Network to CaptureFailure.Network,
            UploadFailure.InvalidImage to CaptureFailure.InvalidImage,
            UploadFailure.RateLimited to CaptureFailure.RateLimited,
            UploadFailure.Server to CaptureFailure.Server,
            UploadFailure.Unauthorized to CaptureFailure.Session,
            UploadFailure.Unexpected to CaptureFailure.Unexpected,
        )

        for ((upload, capture) in expected) {
            ingestion.outcome = UploadOutcome.Failure(upload)
            vm.onPhotoChosen("/cache/a.jpg")
            vm.onUpload()
            advanceUntilIdle()
            assertEquals(capture, vm.state.value.failure, "para $upload")
        }
    }

    @Test
    fun unaImagenInvalidaNoSePuedeReintentarSinElegirOtra() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository().apply { outcome = UploadOutcome.Failure(UploadFailure.InvalidImage) }
        val vm = viewModel(ingestion = ingestion)
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        advanceUntilIdle()

        assertFalse(vm.state.value.canUpload)
    }

    @Test
    fun noSubeDosVecesALaVez() = runTest(dispatcher) {
        val gate = CompletableDeferred<Unit>()
        val ingestion = FakeIngestionRepository().apply { this.gate = gate }
        val vm = viewModel(ingestion = ingestion)
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        vm.onUpload()
        advanceUntilIdle()
        assertEquals(1, ingestion.uploads.size)
        assertTrue(vm.state.value.uploading)

        gate.complete(Unit)
        advanceUntilIdle()

        assertEquals(1, ingestion.uploads.size)
        assertTrue(vm.state.value.uploaded)
    }

    @Test
    fun restoreRecuperaLaFotoSinGenerarOtroId() = runTest(dispatcher) {
        val vm = viewModel()
        val photo = CapturedPhoto("/cache/a.jpg", "sync-9", "2026-10-28T17:00:00Z")

        vm.restore(photo)

        assertEquals(photo, vm.state.value.photo)
    }

    @Test
    fun restoreNoPisaUnaFotoYaElegida() = runTest(dispatcher) {
        val vm = viewModel()
        vm.onPhotoChosen("/cache/nueva.jpg")

        vm.restore(CapturedPhoto("/cache/vieja.jpg", "sync-9", "2026-10-28T17:00:00Z"))

        assertEquals("/cache/nueva.jpg", vm.state.value.photo?.path)
    }

    @Test
    fun unGpsQueLanzaNoImpideLaSubida() = runTest(dispatcher) {
        val ingestion = FakeIngestionRepository()
        val location = object : LocationProvider {
            override suspend fun current(): Coordinates? = throw IllegalStateException("servicio caído")
        }
        val vm = CaptureViewModel(
            FakeCamposRepository(CamposResult.Success(listOf(norte))), ingestion, FakeImageCompressor(), location, clock,
        ) { "sync-1" }
        advanceUntilIdle()
        vm.onCampoSelected("c1")
        vm.onPhotoChosen("/cache/a.jpg")

        vm.onUpload()
        advanceUntilIdle()

        assertNull(ingestion.uploads.single().second.gpsLat)
        assertTrue(vm.state.value.uploaded)
    }
}
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*CaptureViewModelTest*"`
Expected: error de compilación (`CaptureViewModel`, `CamposState`, `CapturedPhoto`, `CaptureFailure` no existen).

- [ ] **Step 3: Implementar**

`feature/capture/CaptureViewModel.kt`:

```kotlin
package com.rubusai.app.feature.capture

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.data.ingestion.IngestionRepository
import com.rubusai.app.core.data.ingestion.UploadFailure
import com.rubusai.app.core.data.ingestion.UploadOutcome
import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.model.UploadMetadata
import com.rubusai.app.core.platform.Coordinates
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
import kotlin.coroutines.cancellation.CancellationException
import kotlin.time.Clock
import kotlin.uuid.Uuid
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Foto elegida. [offlineSyncId] y [capturedAt] se fijan al elegirla y no cambian en los reintentos. */
internal data class CapturedPhoto(val path: String, val offlineSyncId: String, val capturedAt: String)

internal sealed interface CamposState {
    data object Loading : CamposState
    data class Loaded(val campos: List<Campo>) : CamposState
    data object Failed : CamposState
}

internal enum class CaptureFailure {
    Network, InvalidImage, RateLimited, Server, Session, Unexpected, Compression;

    /** Con una imagen inválida o ilegible reintentar no sirve: hay que elegir otra. */
    val retryable: Boolean get() = this != InvalidImage && this != Compression
}

internal data class CaptureUiState(
    val campos: CamposState = CamposState.Loading,
    val photo: CapturedPhoto? = null,
    val selectedCampoId: String? = null,
    val uploading: Boolean = false,
    val failure: CaptureFailure? = null,
    val uploaded: Boolean = false,
) {
    val canUpload: Boolean
        get() = photo != null && selectedCampoId != null && !uploading && failure?.retryable != false
}

internal class CaptureViewModel(
    private val campos: CamposRepository,
    private val ingestion: IngestionRepository,
    private val compressor: ImageCompressor,
    private val location: LocationProvider,
    private val clock: Clock = Clock.System,
    private val newId: () -> String = { Uuid.random().toString() },
) : ViewModel() {
    private val _state = MutableStateFlow(CaptureUiState())
    val state: StateFlow<CaptureUiState> = _state.asStateFlow()

    // Se conservan entre reintentos de la misma foto: comprimir y esperar al GPS es lo caro.
    private var compressed: ByteArray? = null
    private var coordinates: Coordinates? = null
    private var coordinatesResolved = false

    init {
        loadCampos()
    }

    fun loadCampos() {
        _state.update { it.copy(campos = CamposState.Loading) }
        viewModelScope.launch {
            when (val result = campos.list()) {
                is CamposResult.Success -> _state.update {
                    // Con un solo campo no hay nada que elegir; con varios se conserva la elección previa si sigue existiendo.
                    val selected = result.campos.singleOrNull()?.id
                        ?: it.selectedCampoId?.takeIf { id -> result.campos.any { c -> c.id == id } }
                    it.copy(campos = CamposState.Loaded(result.campos), selectedCampoId = selected)
                }
                CamposResult.Failure -> _state.update { it.copy(campos = CamposState.Failed) }
            }
        }
    }

    fun onCampoSelected(id: String) = _state.update { it.copy(selectedCampoId = id) }

    fun onPhotoChosen(path: String) =
        setPhoto(CapturedPhoto(path, newId(), clock.now().toString()))

    /** Recupera la foto tras la muerte del proceso. No hace nada si ya hay una elegida. */
    fun restore(photo: CapturedPhoto) {
        if (_state.value.photo == null) setPhoto(photo)
    }

    private fun setPhoto(photo: CapturedPhoto) {
        compressed = null
        coordinates = null
        coordinatesResolved = false
        _state.update { it.copy(photo = photo, failure = null, uploaded = false) }
    }

    fun onUpload() {
        val current = _state.value
        val photo = current.photo ?: return
        val campoId = current.selectedCampoId ?: return
        if (current.uploading) return
        _state.update { it.copy(uploading = true, failure = null) }

        viewModelScope.launch {
            val jpeg = try {
                compressed ?: compressor.compress(photo.path).also { compressed = it }
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                fail(CaptureFailure.Compression)
                return@launch
            }
            val position = resolveCoordinates()
            val metadata = UploadMetadata(
                capturedAt = photo.capturedAt,
                offlineSyncId = photo.offlineSyncId,
                campoId = campoId,
                gpsLat = position?.latitude,
                gpsLon = position?.longitude,
            )
            when (val outcome = ingestion.upload(jpeg, metadata)) {
                is UploadOutcome.Success -> _state.update { it.copy(uploading = false, uploaded = true) }
                is UploadOutcome.Failure -> fail(outcome.reason.toCaptureFailure())
            }
        }
    }

    // Sin permiso, sin señal o con el servicio caído, la captura sigue sin GPS.
    private suspend fun resolveCoordinates(): Coordinates? {
        if (!coordinatesResolved) {
            coordinates = try {
                location.current()
            } catch (e: CancellationException) {
                throw e
            } catch (e: Exception) {
                null
            }
            coordinatesResolved = true
        }
        return coordinates
    }

    private fun fail(failure: CaptureFailure) =
        _state.update { it.copy(uploading = false, failure = failure) }
}

private fun UploadFailure.toCaptureFailure(): CaptureFailure = when (this) {
    UploadFailure.Network -> CaptureFailure.Network
    UploadFailure.InvalidImage -> CaptureFailure.InvalidImage
    UploadFailure.RateLimited -> CaptureFailure.RateLimited
    UploadFailure.Server -> CaptureFailure.Server
    UploadFailure.Unauthorized -> CaptureFailure.Session
    UploadFailure.Unexpected -> CaptureFailure.Unexpected
}
```

- [ ] **Step 4: Ejecutar el test**

Run: `./gradlew :shared:testAndroidHostTest --tests "*CaptureViewModelTest*"`
Expected: PASS (16 tests).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/feature/capture shared/src/commonTest/kotlin/com/rubusai/app/feature/capture
git commit -m "feat(rubus-ai-kmp): CaptureViewModel con subida, reintento con el mismo offlineSyncId y GPS opcional"
```

---

### Task 7: Compresor de imágenes en Android

**Files:**
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/AndroidImageCompressor.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/core/platform/ImageSamplingTest.kt`
- Test: `shared/src/androidDeviceTest/kotlin/com/rubusai/app/core/platform/AndroidImageCompressorTest.kt`

- [ ] **Step 1: Test de host (aritmética pura) que falla**

```kotlin
package com.rubusai.app.core.platform

import kotlin.test.Test
import kotlin.test.assertEquals

class ImageSamplingTest {

    @Test
    fun unaFotoDe12MpNoSeSubmuestrea() = assertEquals(1, sampleSizeFor(4000, 3000))

    @Test
    fun unaFotoMuyGrandeSeSubmuestreaEnPotenciasDeDos() {
        assertEquals(2, sampleSizeFor(8000, 6000))
        assertEquals(4, sampleSizeFor(16000, 12000))
    }

    @Test
    fun elSubmuestreoNuncaDejaElLadoLargoPorDebajoDelMaximo() {
        for (side in listOf(2049, 3000, 4095, 4096, 4100, 8191, 8192, 20000)) {
            val sample = sampleSizeFor(side, side / 2)
            assertEquals(true, side / sample >= IMAGE_MAX_SIDE_PX || sample == 1, "side=$side sample=$sample")
        }
    }

    @Test
    fun unaImagenPequenaNoSeSubmuestrea() = assertEquals(1, sampleSizeFor(800, 600))
}
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*ImageSamplingTest*"`
Expected: error de compilación (`sampleSizeFor` no existe).

- [ ] **Step 3: Implementar**

`androidMain/.../core/platform/AndroidImageCompressor.kt`:

```kotlin
package com.rubusai.app.core.platform

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import androidx.exifinterface.media.ExifInterface
import java.io.ByteArrayOutputStream
import java.io.IOException
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Decodifica ya reducida (`inSampleSize`), aplica la orientación del EXIF a los píxeles y
 * reescala al lado máximo en un solo paso. `Bitmap.compress` no escribe EXIF, así que el
 * resultado no lleva ni la orientación ni las coordenadas de la foto original.
 */
internal class AndroidImageCompressor : ImageCompressor {

    override suspend fun compress(path: String): ByteArray = withContext(Dispatchers.Default) {
        try {
            compressBlocking(path)
        } catch (e: CancellationException) {
            throw e
        } catch (e: ImageCompressionException) {
            throw e
        } catch (e: OutOfMemoryError) {
            throw ImageCompressionException("Sin memoria para procesar la imagen", e)
        } catch (e: Exception) {
            throw ImageCompressionException("No se pudo procesar la imagen", e)
        }
    }

    private fun compressBlocking(path: String): ByteArray {
        val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
        BitmapFactory.decodeFile(path, bounds)
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
            throw ImageCompressionException("El archivo no es una imagen legible")
        }

        val options = BitmapFactory.Options().apply { inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight) }
        val decoded = BitmapFactory.decodeFile(path, options)
            ?: throw ImageCompressionException("No se pudo decodificar la imagen")

        val matrix = orientationMatrix(readOrientation(path))
        val scale = minOf(1f, IMAGE_MAX_SIDE_PX.toFloat() / maxOf(decoded.width, decoded.height))
        if (scale < 1f) matrix.postScale(scale, scale)
        val result = Bitmap.createBitmap(decoded, 0, 0, decoded.width, decoded.height, matrix, true)
        if (result !== decoded) decoded.recycle()

        return try {
            ByteArrayOutputStream().use { out ->
                result.compress(Bitmap.CompressFormat.JPEG, IMAGE_JPEG_QUALITY, out)
                out.toByteArray()
            }
        } finally {
            result.recycle()
        }
    }
}

/** Mayor potencia de dos con la que el lado largo sigue siendo al menos [maxSide]. */
internal fun sampleSizeFor(width: Int, height: Int, maxSide: Int = IMAGE_MAX_SIDE_PX): Int {
    var sample = 1
    val longest = maxOf(width, height)
    while (longest / (sample * 2) >= maxSide) sample *= 2
    return sample
}

internal fun readOrientation(path: String): Int = try {
    ExifInterface(path).getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL)
} catch (e: IOException) {
    ExifInterface.ORIENTATION_NORMAL
}

/** Matriz que lleva los píxeles guardados a la orientación en que se tomó la foto. */
internal fun orientationMatrix(orientation: Int): Matrix = Matrix().apply {
    when (orientation) {
        ExifInterface.ORIENTATION_FLIP_HORIZONTAL -> setScale(-1f, 1f)
        ExifInterface.ORIENTATION_ROTATE_180 -> setRotate(180f)
        ExifInterface.ORIENTATION_FLIP_VERTICAL -> {
            setRotate(180f)
            postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_TRANSPOSE -> {
            setRotate(90f)
            postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_ROTATE_90 -> setRotate(90f)
        ExifInterface.ORIENTATION_TRANSVERSE -> {
            setRotate(-90f)
            postScale(-1f, 1f)
        }
        ExifInterface.ORIENTATION_ROTATE_270 -> setRotate(-90f)
    }
}
```

- [ ] **Step 4: Test de dispositivo**

`androidDeviceTest/.../core/platform/AndroidImageCompressorTest.kt`:

```kotlin
package com.rubusai.app.core.platform

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import androidx.exifinterface.media.ExifInterface
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import java.io.File
import java.io.FileOutputStream
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertNull
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class AndroidImageCompressorTest {

    private val compressor = AndroidImageCompressor()
    private val cacheDir = InstrumentationRegistry.getInstrumentation().targetContext.cacheDir

    private fun writeJpeg(width: Int, height: Int, orientation: Int? = null, withGps: Boolean = false): String {
        val file = File.createTempFile("test", ".jpg", cacheDir)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).also { it.eraseColor(Color.RED) }
        FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.JPEG, 90, it) }
        bitmap.recycle()
        if (orientation != null || withGps) {
            ExifInterface(file).apply {
                orientation?.let { setAttribute(ExifInterface.TAG_ORIENTATION, it.toString()) }
                if (withGps) {
                    setAttribute(ExifInterface.TAG_GPS_LATITUDE, "19/1,25/1,0/1")
                    setAttribute(ExifInterface.TAG_GPS_LATITUDE_REF, "N")
                    setAttribute(ExifInterface.TAG_GPS_LONGITUDE, "99/1,8/1,0/1")
                    setAttribute(ExifInterface.TAG_GPS_LONGITUDE_REF, "W")
                }
                saveAttributes()
            }
        }
        return file.path
    }

    private fun decode(bytes: ByteArray) = BitmapFactory.decodeByteArray(bytes, 0, bytes.size)

    @Test
    fun reduceUnaImagenGrandeAlLadoMaximo() = runBlocking {
        val out = decode(compressor.compress(writeJpeg(4000, 3000)))

        assertEquals(2048, out.width)
        assertEquals(1536, out.height)
    }

    @Test
    fun noAgrandaUnaImagenPequena() = runBlocking {
        val out = decode(compressor.compress(writeJpeg(800, 600)))

        assertEquals(800, out.width)
        assertEquals(600, out.height)
    }

    @Test
    fun aplicaLaOrientacionExifALosPixeles() = runBlocking {
        val out = decode(compressor.compress(writeJpeg(400, 200, orientation = ExifInterface.ORIENTATION_ROTATE_90)))

        assertEquals(200, out.width)
        assertEquals(400, out.height)
    }

    @Test
    fun elResultadoNoTraeNiOrientacionNiCoordenadas() = runBlocking {
        val bytes = compressor.compress(
            writeJpeg(400, 200, orientation = ExifInterface.ORIENTATION_ROTATE_90, withGps = true),
        )
        val file = File.createTempFile("out", ".jpg", cacheDir).apply { writeBytes(bytes) }

        val exif = ExifInterface(file)

        assertEquals(0, exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, 0))
        assertNull(exif.getAttribute(ExifInterface.TAG_GPS_LATITUDE))
        assertNull(exif.getAttribute(ExifInterface.TAG_GPS_LONGITUDE))
    }

    @Test
    fun unArchivoQueNoEsUnaImagenFalla() {
        val file = File.createTempFile("texto", ".jpg", cacheDir).apply { writeText("no soy una imagen") }

        assertFailsWith<ImageCompressionException> { runBlocking { compressor.compress(file.path) } }
    }

    @Test
    fun unArchivoInexistenteFalla() {
        assertFailsWith<ImageCompressionException> { runBlocking { compressor.compress("/no/existe.jpg") } }
    }
}
```

- [ ] **Step 5: Ejecutar**

Run (host): `./gradlew :shared:testAndroidHostTest --tests "*ImageSamplingTest*"` → Expected: PASS (4 tests).
Run (emulador o teléfono conectado): `./gradlew :shared:connectedAndroidDeviceTest -Pandroid.testInstrumentationRunnerArguments.class=com.rubusai.app.core.platform.AndroidImageCompressorTest` → Expected: PASS (6 tests). Lanzarlo solo esa clase: `connectedAndroidDeviceTest` ejecuta también `commonTest` en el dispositivo (ver `dependencias-pendientes.md`).

- [ ] **Step 6: Commit**

```bash
git add shared/src/androidMain/kotlin/com/rubusai/app/core/platform/AndroidImageCompressor.kt shared/src/androidHostTest/kotlin/com/rubusai/app/core/platform/ImageSamplingTest.kt shared/src/androidDeviceTest/kotlin/com/rubusai/app/core/platform/AndroidImageCompressorTest.kt
git commit -m "feat(rubus-ai-kmp): compresor de imágenes de Android (2048 px, JPEG 85, sin EXIF, con orientación aplicada)"
```

---

### Task 8: Proveedor de GPS en Android

**Files:**
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/FusedLocationProvider.kt`
- Test: `shared/src/androidDeviceTest/kotlin/com/rubusai/app/core/platform/FusedLocationProviderTest.kt`
- Modify: `androidApp/src/main/AndroidManifest.xml`

- [ ] **Step 1: Implementar**

`FusedLocationProvider.kt`:

```kotlin
package com.rubusai.app.core.platform

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource
import kotlin.coroutines.cancellation.CancellationException
import kotlin.coroutines.resume
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull

/** Ubicación con Play Services. Sin permiso, sin señal a tiempo o con el servicio caído devuelve `null`. */
internal class FusedLocationProvider(private val context: Context) : LocationProvider {

    private val client by lazy { LocationServices.getFusedLocationProviderClient(context) }

    override suspend fun current(): Coordinates? {
        if (!hasLocationPermission(context)) return null
        return try {
            withTimeoutOrNull(LOCATION_TIMEOUT_MS) { currentLocation() }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            // SecurityException si el permiso se retiró a mitad, o servicios de Google ausentes.
            null
        }
    }

    @SuppressLint("MissingPermission") // Comprobado en `current()`.
    private suspend fun currentLocation(): Coordinates? = suspendCancellableCoroutine { continuation ->
        val cancellation = CancellationTokenSource()
        continuation.invokeOnCancellation { cancellation.cancel() }
        client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellation.token)
            .addOnSuccessListener { location ->
                continuation.resume(location?.let { Coordinates(it.latitude, it.longitude) })
            }
            .addOnFailureListener { continuation.resume(null) }
            .addOnCanceledListener { continuation.resume(null) }
    }
}

/** Con el permiso aproximado (Android 12+) Play Services devuelve una posición menos precisa; sirve igual. */
internal fun hasLocationPermission(context: Context): Boolean =
    listOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION).any {
        ContextCompat.checkSelfPermission(context, it) == PackageManager.PERMISSION_GRANTED
    }
```

- [ ] **Step 2: Declarar los permisos**

En `androidApp/src/main/AndroidManifest.xml`, bajo `<uses-permission android:name="android.permission.INTERNET" />`:

```xml
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

(No se declara `CAMERA`: la foto la hace la app de cámara del sistema y declararlo obligaría a pedirlo.)

- [ ] **Step 3: Test de dispositivo**

```kotlin
package com.rubusai.app.core.platform

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.system.measureTimeMillis
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FusedLocationProviderTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Test
    fun sinPermisoDevuelveNullAlInstante() {
        // La app de pruebas no declara ni tiene el permiso de ubicación.
        val provider = FusedLocationProvider(context)

        var result: Coordinates? = Coordinates(0.0, 0.0)
        val elapsed = measureTimeMillis { result = runBlocking { provider.current() } }

        assertNull(result)
        assertTrue(elapsed < 1_000, "tardó $elapsed ms")
    }
}
```

La prueba con permiso concedido (posición real o `null` a los 8 s) es manual, en el teléfono: Tarea 11.

- [ ] **Step 4: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`.
Run (dispositivo conectado): `./gradlew :shared:connectedAndroidDeviceTest -Pandroid.testInstrumentationRunnerArguments.class=com.rubusai.app.core.platform.FusedLocationProviderTest` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add shared/src/androidMain/kotlin/com/rubusai/app/core/platform/FusedLocationProvider.kt shared/src/androidDeviceTest/kotlin/com/rubusai/app/core/platform/FusedLocationProviderTest.kt androidApp/src/main/AndroidManifest.xml
git commit -m "feat(rubus-ai-kmp): proveedor de GPS con Play Services (8 s, sin permiso devuelve null)"
```

---

### Task 9: Cámara, galería, permiso y vista previa (`expect/actual`)

**Files:**
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/PhotoPicker.kt`
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/platform/PhotoPicker.android.kt`
- Create: `shared/src/iosMain/kotlin/com/rubusai/app/core/platform/PhotoPicker.ios.kt`
- Create: `androidApp/src/main/res/xml/file_paths.xml`
- Modify: `androidApp/src/main/AndroidManifest.xml`

Esta tarea no tiene test automático propio: depende de la `Activity` y del sistema. Se cubre en la prueba manual (Tarea 11), y la compilación de Android e iOS la valida aquí.

- [ ] **Step 1: Contrato común**

`commonMain/.../core/platform/PhotoPicker.kt`:

```kotlin
package com.rubusai.app.core.platform

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/** Cámara y galería del sistema. El resultado llega por el `onPicked` de [rememberPhotoPicker]. */
interface PhotoPicker {
    fun takePhoto()
    fun pickFromGallery()
}

/**
 * [onPicked] recibe la ruta de un archivo local con la foto, o `null` si el usuario canceló o
 * la foto no se pudo leer. Sobrevive a la rotación y a que el sistema mate la app mientras la
 * cámara está abierta.
 */
@Composable
expect fun rememberPhotoPicker(onPicked: (path: String?) -> Unit): PhotoPicker

interface LocationPermission {
    fun isGranted(): Boolean
    fun request()
}

/** [onResult] recibe `true` si se concedió alguno de los dos permisos de ubicación. */
@Composable
expect fun rememberLocationPermission(onResult: (granted: Boolean) -> Unit): LocationPermission

/** Vista previa de la foto en [path], con su orientación aplicada. No muestra nada si no se puede leer. */
@Composable
expect fun PhotoPreview(path: String, contentDescription: String, modifier: Modifier)
```

- [ ] **Step 2: Android**

`androidMain/.../core/platform/PhotoPicker.android.kt`:

```kotlin
package com.rubusai.app.core.platform

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.FileProvider
import java.io.File
import java.io.IOException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private const val CAPTURES_DIR = "captures"
private const val PREVIEW_MAX_SIDE_PX = 1024
private const val STALE_CAPTURE_MS = 24L * 60 * 60 * 1000

@Composable
actual fun rememberPhotoPicker(onPicked: (path: String?) -> Unit): PhotoPicker {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    // El objeto devuelto vive más que una composición: siempre se llama a la última lambda.
    val currentOnPicked by rememberUpdatedState(onPicked)
    // La ruta del archivo que está escribiendo la cámara se guarda: si el sistema mata la app
    // mientras la cámara está abierta, al volver el resultado llega a una instancia nueva.
    var pendingCameraPath by rememberSaveable { mutableStateOf<String?>(null) }

    val camera = rememberLauncherForActivityResult(ActivityResultContracts.TakePicture()) { taken ->
        val path = pendingCameraPath
        pendingCameraPath = null
        currentOnPicked(if (taken) path else null)
    }
    val gallery = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        if (uri == null) currentOnPicked(null) else scope.launch { currentOnPicked(copyToCache(context, uri)) }
    }

    return remember(camera, gallery, context) {
        object : PhotoPicker {
            override fun takePhoto() {
                val file = newCaptureFile(context)
                pendingCameraPath = file.path
                try {
                    camera.launch(FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file))
                } catch (e: ActivityNotFoundException) {
                    // Sin app de cámara en el dispositivo.
                    pendingCameraPath = null
                    currentOnPicked(null)
                }
            }

            override fun pickFromGallery() =
                gallery.launch(PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly))
        }
    }
}

@Composable
actual fun rememberLocationPermission(onResult: (granted: Boolean) -> Unit): LocationPermission {
    val context = LocalContext.current
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) { grants ->
        onResult(grants.values.any { it })
    }
    return remember(context, launcher) {
        object : LocationPermission {
            override fun isGranted() = hasLocationPermission(context)

            override fun request() = launcher.launch(
                arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION),
            )
        }
    }
}

@Composable
actual fun PhotoPreview(path: String, contentDescription: String, modifier: Modifier) {
    val bitmap by produceState<ImageBitmap?>(initialValue = null, path) {
        value = withContext(Dispatchers.IO) { decodePreview(path) }
    }
    bitmap?.let {
        Image(bitmap = it, contentDescription = contentDescription, modifier = modifier, contentScale = ContentScale.Fit)
    }
}

private fun decodePreview(path: String): ImageBitmap? = try {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(path, bounds)
    if (bounds.outWidth <= 0 || bounds.outHeight <= 0) {
        null
    } else {
        val options = BitmapFactory.Options().apply {
            inSampleSize = sampleSizeFor(bounds.outWidth, bounds.outHeight, PREVIEW_MAX_SIDE_PX)
        }
        BitmapFactory.decodeFile(path, options)?.let { raw ->
            Bitmap.createBitmap(raw, 0, 0, raw.width, raw.height, orientationMatrix(readOrientation(path)), true)
                .asImageBitmap()
        }
    }
} catch (e: OutOfMemoryError) {
    null
}

// Las capturas originales conservan el EXIF (con el GPS): no se dejan en la caché más de un día.
private fun capturesDir(context: Context): File = File(context.cacheDir, CAPTURES_DIR).apply {
    mkdirs()
    listFiles()?.filter { System.currentTimeMillis() - it.lastModified() > STALE_CAPTURE_MS }?.forEach { it.delete() }
}

private fun newCaptureFile(context: Context): File = File.createTempFile("captura_", ".jpg", capturesDir(context))

/** La galería devuelve un `content://`: se copia a un archivo propio para que el compresor lea una ruta. */
private suspend fun copyToCache(context: Context, uri: Uri): String? = withContext(Dispatchers.IO) {
    try {
        val file = newCaptureFile(context)
        val input = context.contentResolver.openInputStream(uri) ?: return@withContext null
        input.use { source -> file.outputStream().use { source.copyTo(it) } }
        file.path
    } catch (e: IOException) {
        null
    }
}
```

- [ ] **Step 3: iOS**

`iosMain/.../core/platform/PhotoPicker.ios.kt`:

```kotlin
package com.rubusai.app.core.platform

import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier

// Sin implementación hasta la Fase 9: la captura no hace nada en iOS, pero compila.

@Composable
actual fun rememberPhotoPicker(onPicked: (path: String?) -> Unit): PhotoPicker = remember {
    object : PhotoPicker {
        override fun takePhoto() = onPicked(null)
        override fun pickFromGallery() = onPicked(null)
    }
}

@Composable
actual fun rememberLocationPermission(onResult: (granted: Boolean) -> Unit): LocationPermission = remember {
    object : LocationPermission {
        override fun isGranted() = false
        override fun request() = onResult(false)
    }
}

@Composable
actual fun PhotoPreview(path: String, contentDescription: String, modifier: Modifier) = Unit
```

- [ ] **Step 4: `FileProvider`**

`androidApp/src/main/res/xml/file_paths.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<paths>
    <cache-path name="captures" path="captures/" />
</paths>
```

En `androidApp/src/main/AndroidManifest.xml`, dentro de `<application>`, tras `</activity>`:

```xml
        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
```

`${applicationId}` cambia por flavor (`.dev`, `.stg`); el código usa `"${context.packageName}.fileprovider"`, que coincide.

- [ ] **Step 5: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/platform/PhotoPicker.kt shared/src/androidMain/kotlin/com/rubusai/app/core/platform/PhotoPicker.android.kt shared/src/iosMain/kotlin/com/rubusai/app/core/platform/PhotoPicker.ios.kt androidApp/src/main
git commit -m "feat(rubus-ai-kmp): cámara, galería, permiso de ubicación y vista previa como expect/actual"
```

---

### Task 10: Pantalla, Home, navegación y Koin

**Files:**
- Modify: `shared/src/commonMain/composeResources/values/strings.xml`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/feature/capture/CaptureScreen.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/feature/home/HomeScreen.kt` (el archivo que contiene `HomeRoute` y `HomeScreen`)
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/navigation/RubusNavHost.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Modify: `shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt`
- Test: `shared/src/androidHostTest/kotlin/com/rubusai/app/feature/capture/CaptureScreenTest.kt`
- Modify (tests): `shared/src/androidHostTest/kotlin/com/rubusai/app/feature/home/HomeScreenTest.kt`, `shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`

- [ ] **Step 1: Textos**

En `strings.xml`, antes de `</resources>`:

```xml

    <string name="home_capture">Capturar</string>
    <string name="home_upload_notice">Imagen enviada.</string>

    <string name="capture_title">Capturar</string>
    <string name="capture_take_photo">Tomar foto</string>
    <string name="capture_pick_gallery">Elegir de la galería</string>
    <string name="capture_preview_description">Vista previa de la foto elegida</string>
    <string name="capture_field_title">Campo</string>
    <string name="capture_campos_loading">Cargando campos…</string>
    <string name="capture_campos_error">No se pudieron cargar los campos.</string>
    <string name="capture_campos_empty">No tienes campos asignados.</string>
    <string name="capture_retry">Reintentar</string>
    <string name="capture_upload">Subir</string>
    <string name="capture_uploading">Subiendo…</string>
    <string name="capture_cancel">Cancelar</string>

    <string name="capture_failure_network">Sin conexión o conexión lenta. Reintenta.</string>
    <string name="capture_failure_invalid_image">La imagen no es válida. Elige otra.</string>
    <string name="capture_failure_rate_limited">Demasiados intentos. Espera un momento.</string>
    <string name="capture_failure_server">Servidor no disponible. Reintenta en un momento.</string>
    <string name="capture_failure_session">Tu sesión expiró. Inicia sesión de nuevo.</string>
    <string name="capture_failure_unexpected">Ocurrió un error. Intenta de nuevo.</string>
    <string name="capture_failure_compression">No se pudo procesar la imagen. Elige otra.</string>
```

- [ ] **Step 2: Test de la pantalla que falla**

`androidHostTest/.../feature/capture/CaptureScreenTest.kt`:

```kotlin
package com.rubusai.app.feature.capture

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.model.Campo
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class CaptureScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private val norte = Campo("c1", "Norte", "N-01")
    private val sur = Campo("c2", "Sur", "S-01")
    private val photo = CapturedPhoto("/no/existe.jpg", "sync-1", "2026-10-28T18:00:00Z")

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    private fun show(
        state: CaptureUiState,
        onTakePhoto: () -> Unit = {},
        onPickGallery: () -> Unit = {},
        onCampoSelected: (String) -> Unit = {},
        onRetryCampos: () -> Unit = {},
        onUpload: () -> Unit = {},
        onClose: () -> Unit = {},
    ) = rule.setContent {
        RubusTheme {
            CaptureScreen(state, onTakePhoto, onPickGallery, onCampoSelected, onRetryCampos, onUpload, onClose)
        }
    }

    @Test
    fun muestraLosCamposYAvisaDelElegido() {
        var elegido: String? = null
        show(CaptureUiState(campos = CamposState.Loaded(listOf(norte, sur))), onCampoSelected = { elegido = it })
        awaitText("Norte")

        rule.onNodeWithText("Sur").performClick()

        assertEquals("c2", elegido)
    }

    @Test
    fun conCamposVaciosDiceQueNoHayCampos() {
        show(CaptureUiState(campos = CamposState.Loaded(emptyList())))

        awaitText("No tienes campos asignados.")
    }

    @Test
    fun siFallanLosCamposOfreceReintentar() {
        var reintentos = 0
        show(CaptureUiState(campos = CamposState.Failed), onRetryCampos = { reintentos++ })
        awaitText("No se pudieron cargar los campos.")

        rule.onNodeWithText("REINTENTAR").performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun subirEstaDeshabilitadoSinFoto() {
        show(CaptureUiState(campos = CamposState.Loaded(listOf(norte))))
        awaitText("SUBIR")
        rule.onNodeWithText("SUBIR").assertIsNotEnabled()
    }

    @Test
    fun conFotoYCampoSubirLlamaAlCallback() {
        var subidas = 0
        show(
            CaptureUiState(campos = CamposState.Loaded(listOf(norte)), photo = photo, selectedCampoId = "c1"),
            onUpload = { subidas++ },
        )
        awaitText("SUBIR")

        rule.onNodeWithText("SUBIR").assertIsEnabled().performClick()

        assertEquals(1, subidas)
    }

    @Test
    fun mientrasSubeElBotonDiceSubiendoYEstaDeshabilitado() {
        show(CaptureUiState(photo = photo, selectedCampoId = "c1", uploading = true))

        awaitText("SUBIENDO…")
        rule.onNodeWithText("SUBIENDO…").assertIsNotEnabled()
    }

    @Test
    fun muestraElMensajeDelFallo() {
        show(CaptureUiState(photo = photo, selectedCampoId = "c1", failure = CaptureFailure.Network))

        awaitText("Sin conexión o conexión lenta. Reintenta.")
    }

    @Test
    fun losBotonesDeFotoYCancelarLlamanASusCallbacks() {
        var camara = 0
        var galeria = 0
        var cierres = 0
        show(CaptureUiState(), onTakePhoto = { camara++ }, onPickGallery = { galeria++ }, onClose = { cierres++ })
        awaitText("TOMAR FOTO")

        rule.onNodeWithText("TOMAR FOTO").performClick()
        rule.onNodeWithText("ELEGIR DE LA GALERÍA").performClick()
        rule.onNodeWithText("CANCELAR").performClick()

        assertEquals(listOf(1, 1, 1), listOf(camara, galeria, cierres))
    }
}
```

- [ ] **Step 3: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*CaptureScreenTest*"`
Expected: error de compilación (`CaptureScreen` no existe).

- [ ] **Step 4: Pantalla**

`feature/capture/CaptureScreen.kt`:

```kotlin
package com.rubusai.app.feature.capture

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.selection.selectable
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.platform.PhotoPreview
import com.rubusai.app.core.platform.rememberLocationPermission
import com.rubusai.app.core.platform.rememberPhotoPicker
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.capture_campos_empty
import com.rubusai.app.resources.capture_campos_error
import com.rubusai.app.resources.capture_campos_loading
import com.rubusai.app.resources.capture_cancel
import com.rubusai.app.resources.capture_failure_compression
import com.rubusai.app.resources.capture_failure_invalid_image
import com.rubusai.app.resources.capture_failure_network
import com.rubusai.app.resources.capture_failure_rate_limited
import com.rubusai.app.resources.capture_failure_server
import com.rubusai.app.resources.capture_failure_session
import com.rubusai.app.resources.capture_failure_unexpected
import com.rubusai.app.resources.capture_field_title
import com.rubusai.app.resources.capture_pick_gallery
import com.rubusai.app.resources.capture_preview_description
import com.rubusai.app.resources.capture_retry
import com.rubusai.app.resources.capture_take_photo
import com.rubusai.app.resources.capture_title
import com.rubusai.app.resources.capture_upload
import com.rubusai.app.resources.capture_uploading
import org.jetbrains.compose.resources.StringResource
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun CaptureRoute(onClose: () -> Unit, onUploaded: () -> Unit) {
    val viewModel = koinViewModel<CaptureViewModel>()
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Sobreviven a la muerte del proceso; el ViewModel no. [ruta, id, fecha].
    var saved by rememberSaveable { mutableStateOf<List<String>?>(null) }
    LaunchedEffect(state.photo) {
        state.photo?.let { saved = listOf(it.path, it.offlineSyncId, it.capturedAt) }
    }
    LaunchedEffect(Unit) {
        saved?.let { (path, id, at) -> viewModel.restore(CapturedPhoto(path, id, at)) }
    }
    LaunchedEffect(state.uploaded) { if (state.uploaded) onUploaded() }

    val picker = rememberPhotoPicker { path -> path?.let(viewModel::onPhotoChosen) }

    // El permiso de ubicación se pide una vez por sesión de captura, al pulsar "Subir".
    // Concedido o no, la subida sigue: negarlo solo deja la foto sin GPS.
    var askedLocation by rememberSaveable { mutableStateOf(false) }
    val locationPermission = rememberLocationPermission { viewModel.onUpload() }

    CaptureScreen(
        state = state,
        onTakePhoto = picker::takePhoto,
        onPickGallery = picker::pickFromGallery,
        onCampoSelected = viewModel::onCampoSelected,
        onRetryCampos = viewModel::loadCampos,
        onUpload = {
            if (askedLocation || locationPermission.isGranted()) {
                viewModel.onUpload()
            } else {
                askedLocation = true
                locationPermission.request()
            }
        },
        onClose = onClose,
    )
}

@Composable
internal fun CaptureScreen(
    state: CaptureUiState,
    onTakePhoto: () -> Unit,
    onPickGallery: () -> Unit,
    onCampoSelected: (String) -> Unit,
    onRetryCampos: () -> Unit,
    onUpload: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier = Modifier,
) {
    RubusScreen(
        modifier = modifier,
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(text = stringResource(Res.string.capture_title), style = MaterialTheme.typography.headlineLarge)
        state.photo?.let {
            PhotoPreview(
                path = it.path,
                contentDescription = stringResource(Res.string.capture_preview_description),
                modifier = Modifier.fillMaxWidth().height(240.dp),
            )
        }
        RubusButton(
            text = stringResource(Res.string.capture_take_photo),
            onClick = onTakePhoto,
            enabled = !state.uploading,
            modifier = Modifier.fillMaxWidth(),
        )
        RubusButton(
            text = stringResource(Res.string.capture_pick_gallery),
            onClick = onPickGallery,
            enabled = !state.uploading,
            variant = RubusButtonVariant.Secondary,
            modifier = Modifier.fillMaxWidth(),
        )
        CamposSection(state, onCampoSelected, onRetryCampos)
        state.failure?.let {
            Text(
                text = stringResource(it.message()),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.error,
            )
        }
        RubusButton(
            text = stringResource(if (state.uploading) Res.string.capture_uploading else Res.string.capture_upload),
            onClick = onUpload,
            enabled = state.canUpload,
            modifier = Modifier.fillMaxWidth(),
        )
        RubusButton(
            text = stringResource(Res.string.capture_cancel),
            onClick = onClose,
            enabled = !state.uploading,
            variant = RubusButtonVariant.Outline,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun CamposSection(state: CaptureUiState, onSelect: (String) -> Unit, onRetry: () -> Unit) {
    when (val campos = state.campos) {
        CamposState.Loading -> Text(
            text = stringResource(Res.string.capture_campos_loading),
            style = MaterialTheme.typography.bodyLarge,
        )
        CamposState.Failed -> {
            Text(text = stringResource(Res.string.capture_campos_error), style = MaterialTheme.typography.bodyLarge)
            RubusButton(
                text = stringResource(Res.string.capture_retry),
                onClick = onRetry,
                variant = RubusButtonVariant.Outline,
            )
        }
        is CamposState.Loaded -> if (campos.campos.isEmpty()) {
            Text(text = stringResource(Res.string.capture_campos_empty), style = MaterialTheme.typography.bodyLarge)
        } else {
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(text = stringResource(Res.string.capture_field_title), style = MaterialTheme.typography.titleLarge)
                campos.campos.forEach { campo ->
                    val selected = campo.id == state.selectedCampoId
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .selectable(
                                selected = selected,
                                enabled = !state.uploading,
                                role = Role.RadioButton,
                                onClick = { onSelect(campo.id) },
                            )
                            .padding(vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(selected = selected, onClick = null)
                        Spacer(Modifier.width(12.dp))
                        Column {
                            Text(text = campo.nombre, style = MaterialTheme.typography.bodyLarge)
                            if (campo.codigoCampo.isNotBlank()) {
                                Text(text = campo.codigoCampo, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun CaptureFailure.message(): StringResource = when (this) {
    CaptureFailure.Network -> Res.string.capture_failure_network
    CaptureFailure.InvalidImage -> Res.string.capture_failure_invalid_image
    CaptureFailure.RateLimited -> Res.string.capture_failure_rate_limited
    CaptureFailure.Server -> Res.string.capture_failure_server
    CaptureFailure.Session -> Res.string.capture_failure_session
    CaptureFailure.Unexpected -> Res.string.capture_failure_unexpected
    CaptureFailure.Compression -> Res.string.capture_failure_compression
}
```

- [ ] **Step 5: Home**

En el archivo de `HomeRoute`/`HomeScreen`, añadir a los imports:

```kotlin
import com.rubusai.app.resources.home_capture
import com.rubusai.app.resources.home_upload_notice
```

y sustituir `HomeRoute` y `HomeScreen` por:

```kotlin
@Composable
internal fun HomeRoute(devActions: DevActions?, uploadNotice: Boolean, onCapture: () -> Unit) {
    val viewModel = koinViewModel<HomeViewModel>()
    val sessionState by viewModel.sessionState.collectAsStateWithLifecycle()
    val loggingOut by viewModel.loggingOut.collectAsStateWithLifecycle()
    HomeScreen(
        user = (sessionState as? SessionState.Authenticated)?.user,
        loggingOut = loggingOut,
        onLogout = viewModel::onLogout,
        devActions = devActions,
        uploadNotice = uploadNotice,
        onCapture = onCapture,
    )
}

@Composable
internal fun HomeScreen(
    user: User?,
    loggingOut: Boolean,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier,
    devActions: DevActions? = null,
    uploadNotice: Boolean = false,
    onCapture: () -> Unit = {},
) {
    RubusScreen(modifier = modifier) {
        Text(text = stringResource(Res.string.home_title), style = MaterialTheme.typography.headlineLarge)
        user?.let {
            Text(text = it.displayName, style = MaterialTheme.typography.titleLarge)
            Text(text = it.email, style = MaterialTheme.typography.bodyLarge)
            Text(text = it.role.displayName, style = MaterialTheme.typography.bodyLarge)
        }
        if (uploadNotice) {
            Text(
                text = stringResource(Res.string.home_upload_notice),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.primary,
            )
        }
        RubusButton(
            text = stringResource(Res.string.home_capture),
            onClick = onCapture,
            enabled = !loggingOut,
        )
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

Añadir al final de `HomeScreenTest` (dentro de la clase):

```kotlin
    @Test
    fun elBotonCapturarLlamaASuCallback() {
        var capturas = 0
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = {}, onCapture = { capturas++ }) } }
        awaitText("CAPTURAR")

        rule.onNodeWithText("CAPTURAR").performClick()

        assertEquals(1, capturas)
    }

    @Test
    fun muestraElAvisoDeImagenEnviadaSoloSiSeIndica() {
        rule.setContent { RubusTheme { HomeScreen(user = ana, loggingOut = false, onLogout = {}, uploadNotice = true) } }

        awaitText("Imagen enviada.")
    }
```

- [ ] **Step 6: Navegación**

En `RubusNavHost.kt`, añadir a los imports:

```kotlin
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.feature.capture.CaptureRoute
```

Declarar, bajo los imports (a nivel de archivo):

```kotlin
// Home lo lee al volver de la captura para mostrar "Imagen enviada".
private const val UPLOADED_KEY = "imagen_enviada"
```

Sustituir las líneas `composable<Route.Home> { HomeRoute(devActions = devActions) }` y `composable<Route.Capture> { Marcador("Capture") }` por:

```kotlin
        composable<Route.Home> { entry ->
            val uploaded by entry.savedStateHandle.getStateFlow(UPLOADED_KEY, false).collectAsStateWithLifecycle()
            HomeRoute(
                devActions = devActions,
                uploadNotice = uploaded,
                onCapture = {
                    entry.savedStateHandle[UPLOADED_KEY] = false
                    navController.navigate(Route.Capture) { launchSingleTop = true }
                },
            )
        }
```

```kotlin
        composable<Route.Capture> {
            CaptureRoute(
                onClose = { navController.popBackStack() },
                onUploaded = {
                    navController.previousBackStackEntry?.savedStateHandle?.set(UPLOADED_KEY, true)
                    navController.popBackStack()
                },
            )
        }
```

Actualizar el KDoc del grafo: quitar `Capture` de la lista de marcadores si aparece mencionada.

- [ ] **Step 7: Koin**

En `AppModule.kt`, añadir a los imports:

```kotlin
import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposRepositoryImpl
import com.rubusai.app.core.data.ingestion.IngestionRepository
import com.rubusai.app.core.data.ingestion.IngestionRepositoryImpl
import com.rubusai.app.feature.capture.CaptureViewModel
import org.koin.core.module.dsl.viewModel
```

añadir, tras `authModule()`:

```kotlin
/** Captura: repositorios de campos e ingestión y el `ViewModel`. El compresor y el GPS los aporta cada plataforma. */
internal fun captureModule(): Module = module {
    single<CamposRepository> { CamposRepositoryImpl(client = get()) }
    single<IngestionRepository> { IngestionRepositoryImpl(client = get()) }
    viewModel { CaptureViewModel(campos = get(), ingestion = get(), compressor = get(), location = get()) }
}
```

y en `appModules`, tras `authModule(),`: `captureModule(),`.

En `PlatformModule.android.kt`, añadir a los imports:

```kotlin
import com.rubusai.app.core.platform.AndroidImageCompressor
import com.rubusai.app.core.platform.FusedLocationProvider
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
```

y tras `single<UserStorage> { ... }`:

```kotlin
    single<ImageCompressor> { AndroidImageCompressor() }
    single<LocationProvider> { FusedLocationProvider(androidContext()) }
```

En `KoinGraphTest.kt`, añadir a los imports:

```kotlin
import com.rubusai.app.core.platform.ImageCompressor
import com.rubusai.app.core.platform.LocationProvider
import com.rubusai.app.feature.capture.CaptureViewModel
import com.rubusai.app.feature.capture.FakeImageCompressor
import com.rubusai.app.feature.capture.FakeLocationProvider
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.setMain
```

y añadir a la clase:

```kotlin
    @OptIn(ExperimentalCoroutinesApi::class)
    @Test
    fun elGrafoResuelveElViewModelDeCaptura() = runTest {
        // `CaptureViewModel` lanza en `viewModelScope` al crearse: necesita un `Main`.
        Dispatchers.setMain(StandardTestDispatcher())
        val platformModule = module {
            single<HttpClientEngine> { mockEngine { respondOk() } }
            single<Logger> { Logger.EMPTY }
            single<SecureTokenStorage> { InMemoryTokenStorage() }
            single<UserStorage> { InMemoryUserStorage() }
            single<ImageCompressor> { FakeImageCompressor() }
            single<LocationProvider> { FakeLocationProvider() }
        }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            app.koin.get<CaptureViewModel>()
        } finally {
            app.close()
            Dispatchers.resetMain()
        }
    }
```

- [ ] **Step 8: Ejecutar todo**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64`
Expected: `BUILD SUCCESSFUL`; `CaptureScreenTest` 8 tests, `HomeScreenTest` +2, `KoinGraphTest` +1, todo con `failures="0" errors="0"`.

- [ ] **Step 9: Commit**

```bash
git add shared/src androidApp
git commit -m "feat(rubus-ai-kmp): pantalla de captura, botón en Home, navegación y módulo Koin de la fase 2a"
```

---

### Task 11: Verificación manual en el teléfono

Cierra la 2a. No se puede sustituir por el emulador: la cámara real, los permisos del fabricante y la memoria al comprimir solo se validan en un teléfono.

**Preparación**

- [ ] **Step 1: Backend alcanzable desde el teléfono**

Backend y servicios levantados (`docker compose up postgres rabbitmq redis`, `fruit-backend`, `fruit-ms` e inferencia, o el stack completo). `fruit-backend` debe escuchar en `0.0.0.0:3001`. En `local.properties` del worktree: `rubus.devHost=<IP del PC en la LAN>` (solo host o IPv4, sin esquema ni puerto). Teléfono y PC en la misma red.

- [ ] **Step 2: Instalar**

Teléfono con depuración USB: `adb devices` lo lista. Run: `./gradlew :androidApp:installDevDebug`. En Android 17, conceder `ACCESS_LOCAL_NETWORK` al primer arranque (diálogo) o con `adb shell pm grant com.rubusai.app.dev android.permission.ACCESS_LOCAL_NETWORK`.

- [ ] **Step 3: Datos de prueba**

Un usuario con al menos un campo accesible (un ADMIN o MONITOR ve todos; un agrónomo solo los asignados). Anotar marca, modelo y versión de Android del teléfono.

**Pruebas** (anotar OK/FALLO y observaciones de cada una)

- [ ] **Step 4:** Home → CAPTURAR → TOMAR FOTO con la cámara del teléfono (foto real, sin reducir la resolución, de 12 MP o más) → elegir campo → SUBIR. Se concede el permiso de ubicación. Esperado: vuelve a Home con "Imagen enviada."
- [ ] **Step 5:** Repetir con ELEGIR DE LA GALERÍA.
- [ ] **Step 6:** Negar el permiso de ubicación (reinstalar o revocarlo en Ajustes antes). Esperado: la subida funciona igual, sin GPS.
- [ ] **Step 7:** Modo avión justo tras pulsar SUBIR. Esperado: "Sin conexión o conexión lenta. Reintenta." y la foto sigue en pantalla. Quitar el modo avión y pulsar SUBIR otra vez: funciona.
- [ ] **Step 8:** Muerte de proceso con la cámara abierta: activar la opción de desarrollador «No conservar actividades», pulsar TOMAR FOTO, hacer la foto. Esperado: al volver, la foto aparece en la vista previa. Desactivar la opción.
- [ ] **Step 9:** Rotar el teléfono en la pantalla de captura con foto y campo elegidos. Esperado: no se pierde nada.
- [ ] **Step 10:** En `zarza-web` (o la base de datos), el análisis aparece con el campo elegido y, en las pruebas con GPS, sus coordenadas. Anotar también cuánto tarda en aparecer.
- [ ] **Step 11:** (Opcional, si hay tiempo) Subir dos veces seguidas la misma foto tras provocar un fallo y reintentar; comprobar en la base que no se creó un análisis duplicado.

- [ ] **Step 12: Registrar el resultado**

Crear la sección «Verificación de la Fase 2a» en `docs/dependencias-pendientes.md` con la fecha, el teléfono (marca, modelo, Android) y el resultado de cada prueba. Una prueba que falle se abre como pendiente con su causa; la 2a no se da por cerrada hasta que pasen 4, 6, 7 y 8.

---

### Task 12: Documentación y cierre

**Files:**
- Modify: `rubus-ai-kmp/docs/dependencias-pendientes.md`
- Modify: `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`

- [ ] **Step 1: `dependencias-pendientes.md`**

- En «Limitaciones conocidas y decisiones abiertas de la red», sustituir el párrafo «Ráfaga de refrescos tras un fallo transitorio» por: «**Ráfaga de refrescos tras un fallo transitorio.** Resuelto el 2026-10-28 (Fase 2a): `TokenRefresher` recuerda 5 s que un refresh token falló por red, timeout o 429 y no repite la llamada. A cambio, un reintento manual del usuario dentro de esos 5 s falla sin intentarlo.»
- En la tabla de «Pendientes», quitar la fila de Play Services Location y de AndroidX Activity si existieran; la de Coil 3 se mantiene hasta la 2c.
- Añadir una sección «Pendientes de la Fase 2a» con:
  - **Backend: duplicado por `offlineSyncId`.** `POST ingestion/upload` responde 201 siempre y no devuelve 409; `fruit-ms` hace un `create` sobre `Analysis.offlineSyncId` (`@unique`). Un reintento con el mismo id no crea un análisis duplicado, pero corre otra inferencia y termina en la DLQ. Arreglo propuesto: que `fruit-ms` trate la violación de unicidad como éxito idempotente (ack sin reintentar). Corregir en la Fase 3 la línea del roadmap «un 409 del servidor cuenta como éxito».
  - **Archivos temporales.** Las fotos originales de la cámara y las copias de la galería quedan en `cacheDir/captures/` hasta que pasan 24 h (se purgan al crear la siguiente) o Android limpia la caché. Conservan el EXIF con el GPS.
  - **iOS.** `rememberPhotoPicker`, `rememberLocationPermission`, `PhotoPreview`, `ImageCompressor` y `LocationProvider` no tienen implementación real hasta la Fase 9.
  - **Elección de campo tras la muerte del proceso.** Se restaura la foto pero no el campo elegido (con varios campos hay que volver a elegirlo).

- [ ] **Step 2: `roadmap-migracion-kmp.md`**

Bajo «Fase 2 — Flujo crítico», añadir una línea de estado: «Estado: partida en tres sub-fases. 2a (captura y subida) implementada el 2026-10-28; pendiente de verificación en un teléfono Android (ver `dependencias-pendientes.md`). 2b (WebSocket y aviso `analisis_listo`) y 2c (resultados y validación) sin empezar. Spec y plan en `docs/superpowers/`.» (Si la verificación manual de la Tarea 11 ya se hizo, escribir el resultado en lugar de «pendiente».)

- [ ] **Step 3: Verificación final y commit**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64`
Expected: `BUILD SUCCESSFUL`.

```bash
git add rubus-ai-kmp/docs
git commit -m "docs(rubus-ai-kmp): fase 2a implementada, ráfaga de refrescos resuelta y pendientes de captura"
```

- [ ] **Step 4: Integrar y limpiar (solo con la Tarea 11 aprobada por el usuario)**

Según el `CLAUDE.md` global: con todo commiteado y compilando, merge a `main` y limpieza del worktree. Si hay cambios sin commitear o el merge tiene conflictos, avisar al usuario antes de mergear o borrar nada.

```bash
cd /home/san/Proyectos/zarza-workspace
git merge --no-ff feature/kmp-fase2a-captura -m "Merge feature/kmp-fase2a-captura: captura y subida de la Fase 2a en rubus-ai-kmp"
git worktree remove ../zarza-workspace-kmp-fase2a
git branch -d feature/kmp-fase2a-captura
```

(No cambiar de rama en el directorio principal: ya está en `main`.)
