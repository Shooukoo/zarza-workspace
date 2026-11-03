# KMP Fase 2c: resultados, validación y revisión de boxes — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que un agrónomo, en un teléfono Android, abra un análisis desde el aviso o desde una lista, vea la imagen con sus detecciones, lo valide o rechace con observaciones y corrija boxes con el dedo para retroalimentar al modelo.

**Architecture:** Un `AnalysesRepository` (Ktor, resultado sellado) alimenta tres ViewModels (`History`, `Result`, `Review`). La matemática de pantalla↔imagen y de arrastre de boxes vive en funciones puras (`Viewport`, `BoxGeometry`) con tests; los gestos de Compose son una capa fina encima. La imagen se carga con Coil 3 desde la URL firmada de `GET analyses/:id/image`.

**Tech Stack:** Kotlin Multiplatform, Compose Multiplatform 1.12, Koin 4, Ktor 3.6 (`MockEngine` en tests), Coil 3, Navigation Compose tipado, Robolectric para tests de UI.

**Spec:** `docs/superpowers/specs/2026-11-02-kmp-fase2c-resultados-validacion-design.md` (léela antes de empezar).

---

## Reglas de trabajo (valen para todas las tareas)

- Trabajar SOLO en el worktree `/home/san/Proyectos/zarza-workspace-kmp-fase2c` (rama `feature/kmp-fase2c-resultados`), que crea la Tarea 0. No cambiar de rama ni tocar `/home/san/Proyectos/zarza-workspace`.
- Commits en español, estilo del repo (`feat(rubus-ai-kmp): …`), **sin** línea `Co-Authored-By` y **sin** mencionar a Claude/Anthropic.
- No leer ningún `.env`. No tocar `fruit-backend` ni `zarza-web`.
- Todos los comandos de Gradle se ejecutan desde `rubus-ai-kmp/` del worktree. Abreviaturas de rutas usadas abajo:
  - `MAIN` = `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app`
  - `TEST` = `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app`
  - `HOST` = `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app`
  - `RES` = `rubus-ai-kmp/shared/src/commonMain/composeResources/values/strings.xml`
- Línea base antes de empezar: `./gradlew :shared:testAndroidHostTest --console=plain` → 354 tests, 0 fallos. Cada tarea deja la suite en verde.
- TDD donde hay lógica: ver cada test nuevo fallar antes de implementar. Si un import falta o un nombre de la API de Compose/Ktor/Coil cambió de versión, ajústalo sin cambiar el diseño.
- Ejecutar los tres a la vez al cerrar cada tarea de UI o de DI: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 --console=plain`.

## Mapa de archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `MAIN/core/model/Analysis.kt` | Modelos de dominio y enums. |
| `MAIN/core/data/analyses/AnalysesRepository.kt` | Interfaz, resultado sellado, DTO e implementación Ktor. |
| `MAIN/feature/review/Viewport.kt` | Pantalla↔imagen, zoom y desplazamiento (puro). |
| `MAIN/feature/review/BoxGeometry.kt` | Hit-test, arrastre, normalización y selección de boxes (puro). |
| `MAIN/feature/review/ViewportGestures.kt` | `Modifier.viewportGestures`: dos dedos mueven la vista, un dedo delega. |
| `MAIN/feature/review/AnnotatedImage.kt` | Imagen (Coil) + boxes dibujados con el `Viewport`. |
| `MAIN/feature/review/BoxEditGestures.kt` | Gestos de un dedo de la revisión. |
| `MAIN/feature/review/ReviewViewModel.kt` | Estado y acciones de la revisión. |
| `MAIN/feature/review/ReviewScreen.kt` | Pantalla de revisión, panel de edición, ruta. |
| `MAIN/feature/results/AnalysisLabels.kt` | Textos y colores por estado, etapa y fallo. |
| `MAIN/feature/results/ResultViewModel.kt` / `ResultScreen.kt` | Detalle, validar y rechazar. |
| `MAIN/feature/history/HistoryViewModel.kt` / `HistoryScreen.kt` | Lista con filtros y paginación. |
| `MAIN/feature/aviso/*`, `MAIN/App.kt` | Acción «Ver» del aviso. |

---

### Task 0: Worktree y dependencia de Coil

**Files:**
- Modify: `rubus-ai-kmp/gradle/libs.versions.toml`
- Modify: `rubus-ai-kmp/shared/build.gradle.kts`
- Modify: `MAIN/App.kt`

- [ ] **Step 1: Crear el worktree**

Desde `/home/san/Proyectos/zarza-workspace` (rama `main`; verifica con `git status` que solo hay los cambios ajenos de `zarza_ai/`):

```bash
git worktree add ../zarza-workspace-kmp-fase2c -b feature/kmp-fase2c-resultados
cd ../zarza-workspace-kmp-fase2c/rubus-ai-kmp
```

Si `local.properties` no existe en el worktree, cópialo del repo principal (`cp ../../zarza-workspace/rubus-ai-kmp/local.properties .`; está fuera de git).

- [ ] **Step 2: Añadir Coil al catálogo**

En `rubus-ai-kmp/gradle/libs.versions.toml`, en `[versions]` añade `coil = "3.3.0"`, y en `[libraries]`:

```toml
coil-compose = { module = "io.coil-kt.coil3:coil-compose", version.ref = "coil" }
coil-network-ktor3 = { module = "io.coil-kt.coil3:coil-network-ktor3", version.ref = "coil" }
```

En `shared/build.gradle.kts`, dentro de `commonMain.dependencies`, tras `implementation(libs.androidx.datastore.preferences)`:

```kotlin
            implementation(libs.coil.compose)
            implementation(libs.coil.network.ktor3)
```

- [ ] **Step 3: Registrar el fetcher de red en el cargador de imágenes**

En `MAIN/App.kt` añade los imports

```kotlin
import coil3.ImageLoader
import coil3.compose.setSingletonImageLoaderFactory
import coil3.network.ktor3.KtorNetworkFetcherFactory
```

y, como primera línea dentro de `fun App() {`:

```kotlin
    // Coil 3 no trae el fetcher de red en todas las plataformas: se registra una vez (usa Ktor).
    setSingletonImageLoaderFactory { context ->
        ImageLoader.Builder(context).components { add(KtorNetworkFetcherFactory()) }.build()
    }
```

- [ ] **Step 4: Verificar que resuelve y compila**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, 354 tests. Si `3.3.0` no resuelve o no compila con Kotlin 2.4.20, prueba la última 3.x estable que sí lo haga y anota la versión en el mensaje del commit.

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/gradle/libs.versions.toml rubus-ai-kmp/shared/build.gradle.kts rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/App.kt
git commit -m "chore(rubus-ai-kmp): Coil 3 vuelve al build para las imágenes de análisis"
```

---

### Task 1: Modelos de dominio

**Files:**
- Create: `MAIN/core/model/Analysis.kt`
- Test: `TEST/core/model/AnalysisModelsTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.core.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class AnalysisModelsTest {

    @Test
    fun elEstadoDelServidorSeConvierte() {
        assertEquals(ValidacionEstado.Validado, ValidacionEstado.fromApi("validado"))
        assertEquals(ValidacionEstado.Rechazado, ValidacionEstado.fromApi("rechazado"))
        assertEquals(ValidacionEstado.Pendiente, ValidacionEstado.fromApi("pendiente"))
    }

    @Test
    fun unEstadoDesconocidoCuentaComoPendiente() {
        assertEquals(ValidacionEstado.Pendiente, ValidacionEstado.fromApi("otro"))
    }

    @Test
    fun laEtapaSeBuscaPorSuNombreDeApi() {
        assertEquals(Etapa.DeteccionGen, Etapa.fromApi("deteccion_gen"))
        assertNull(Etapa.fromApi("inventada"))
    }

    @Test
    fun elBoxCalculaAnchoYAlto() {
        val box = BBox(10f, 20f, 60f, 100f)

        assertEquals(50f, box.width)
        assertEquals(80f, box.height)
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*AnalysisModelsTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: ValidacionEstado`).

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.core.model

/** Filtro de estado de la lista; [api] es el valor del query `estado`. */
enum class EstadoFiltro(val api: String) {
    Pendiente("pendiente"),
    Validado("validado"),
    Rechazado("rechazado"),
    Todos("all"),
}

enum class ValidacionEstado {
    Pendiente, Validado, Rechazado;

    companion object {
        /** Un valor que esta versión no conoce cuenta como pendiente. */
        fun fromApi(value: String): ValidacionEstado = when (value) {
            "validado" -> Validado
            "rechazado" -> Rechazado
            else -> Pendiente
        }
    }
}

/** Acción de `PATCH analyses/:id/validate`. */
enum class ValidacionAccion(val api: String) {
    Validado("validado"),
    Rechazado("rechazado"),
}

/** Etapas que el servidor acepta al crear o corregir una detección. */
enum class Etapa(val api: String) {
    Boton("boton"),
    Flor("flor"),
    Verde("verde"),
    Naranja("naranja"),
    Marron("marron"),
    Maduro("maduro"),
    DeteccionGen("deteccion_gen");

    companion object {
        fun fromApi(value: String): Etapa? = entries.firstOrNull { it.api == value }
    }
}

data class FenologiaEtapa(val etapa: String, val cantidad: Int)

data class Analysis(
    val id: String,
    val campoNombre: String?,
    /** ISO 8601 tal cual lo manda el servidor. */
    val fechaAnalisis: String?,
    val totalElementos: Int,
    val elementosSanos: Int,
    val elementosEnfermos: Int,
    val mermaPorcentaje: Double,
    val pesoSanoGramos: Double,
    val estado: ValidacionEstado,
    val observaciones: String?,
    val deteccionesRevisadas: Boolean,
    val etapas: List<FenologiaEtapa>,
)

data class AnalysisPage(val items: List<Analysis>, val page: Int, val hasMore: Boolean)

/** [url] es una URL firmada que caduca a los 15 min; [width] y [height] son los de la imagen original. */
data class AnalysisImage(val url: String, val width: Int, val height: Int)

/** Caja `[x1, y1, x2, y2]` en píxeles de la imagen original. */
data class BBox(val x1: Float, val y1: Float, val x2: Float, val y2: Float) {
    val width: Float get() = x2 - x1
    val height: Float get() = y2 - y1
}

/** [etapa] es el nombre de API tal cual llega (puede no estar en [Etapa]). */
data class Detection(
    val id: String,
    val etapa: String,
    val sano: Boolean,
    val bbox: BBox,
    val confidence: Double?,
)
```

- [ ] **Step 4: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*AnalysisModelsTest*' --console=plain`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/model/Analysis.kt rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/model/AnalysisModelsTest.kt
git commit -m "feat(rubus-ai-kmp): modelos de análisis, detección y caja"
```

---

### Task 2: `AnalysesRepository`

**Files:**
- Create: `MAIN/core/data/analyses/AnalysesRepository.kt`
- Create: `TEST/core/data/analyses/AnalysesTestSupport.kt`
- Test: `TEST/core/data/analyses/AnalysesRepositoryTest.kt`

- [ ] **Step 1: Escribir el soporte de tests (fake y datos de ejemplo)**

`TEST/core/data/analyses/AnalysesTestSupport.kt`:

```kotlin
package com.rubusai.app.core.data.analyses

import com.rubusai.app.core.model.Analysis
import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.AnalysisPage
import com.rubusai.app.core.model.BBox
import com.rubusai.app.core.model.Detection
import com.rubusai.app.core.model.EstadoFiltro
import com.rubusai.app.core.model.FenologiaEtapa
import com.rubusai.app.core.model.ValidacionAccion
import com.rubusai.app.core.model.ValidacionEstado

internal fun analisis(id: String = "a1", estado: ValidacionEstado = ValidacionEstado.Pendiente) = Analysis(
    id = id,
    campoNombre = "Norte",
    fechaAnalisis = "2026-10-30T18:00:00.000Z",
    totalElementos = 12,
    elementosSanos = 9,
    elementosEnfermos = 3,
    mermaPorcentaje = 25.0,
    pesoSanoGramos = 410.5,
    estado = estado,
    observaciones = null,
    deteccionesRevisadas = false,
    etapas = listOf(FenologiaEtapa("maduro", 4)),
)

internal fun deteccion(
    id: String = "d1",
    bbox: BBox = BBox(10f, 10f, 60f, 60f),
    etapa: String = "verde",
    sano: Boolean = true,
) = Detection(id, etapa, sano, bbox, 0.9)

internal val imagenDePrueba = AnalysisImage("https://img.example/a.jpg", 2000, 1000)

internal data class EditCall(
    val analysisId: String,
    val detectionId: String,
    val etapa: String,
    val sano: Boolean,
    val bbox: BBox,
)

internal data class AddCall(val analysisId: String, val etapa: String, val sano: Boolean, val bbox: BBox)

/** Repositorio falso: cada respuesta se configura y cada llamada de escritura queda registrada. */
internal class FakeAnalysesRepository : AnalysesRepository {
    var listHandler: (Int, EstadoFiltro, String?) -> AnalysesResult<AnalysisPage> =
        { _, _, _ -> AnalysesResult.Success(AnalysisPage(emptyList(), 1, false)) }
    val listCalls = mutableListOf<Triple<Int, EstadoFiltro, String?>>()

    var getResult: AnalysesResult<Analysis> = AnalysesResult.Success(analisis())
    var imageResult: AnalysesResult<AnalysisImage> = AnalysesResult.Success(imagenDePrueba)
    var imageCalls = 0
    var detectionsResult: AnalysesResult<List<Detection>> = AnalysesResult.Success(emptyList())
    var detectionsCalls = 0

    var validateResult: AnalysesResult<Unit> = AnalysesResult.Success(Unit)
    val validateCalls = mutableListOf<Pair<ValidacionAccion, String?>>()

    /** Respuesta de editar, eliminar, agregar y marcar revisado. */
    var writeResult: AnalysesResult<Unit> = AnalysesResult.Success(Unit)
    val edits = mutableListOf<EditCall>()
    val deletes = mutableListOf<String>()
    val adds = mutableListOf<AddCall>()
    var reviewedCalls = 0

    override suspend fun list(page: Int, limit: Int, estado: EstadoFiltro, campoId: String?): AnalysesResult<AnalysisPage> {
        listCalls += Triple(page, estado, campoId)
        return listHandler(page, estado, campoId)
    }

    override suspend fun get(id: String) = getResult

    override suspend fun imageUrl(id: String): AnalysesResult<AnalysisImage> {
        imageCalls++
        return imageResult
    }

    override suspend fun validate(id: String, action: ValidacionAccion, observaciones: String?): AnalysesResult<Unit> {
        validateCalls += action to observaciones
        return validateResult
    }

    override suspend fun detections(id: String): AnalysesResult<List<Detection>> {
        detectionsCalls++
        return detectionsResult
    }

    override suspend fun editDetection(
        analysisId: String,
        detectionId: String,
        etapa: String,
        sano: Boolean,
        bbox: BBox,
    ): AnalysesResult<Unit> {
        edits += EditCall(analysisId, detectionId, etapa, sano, bbox)
        return writeResult
    }

    override suspend fun deleteDetection(analysisId: String, detectionId: String): AnalysesResult<Unit> {
        deletes += detectionId
        return writeResult
    }

    override suspend fun addDetection(analysisId: String, etapa: String, sano: Boolean, bbox: BBox): AnalysesResult<Unit> {
        adds += AddCall(analysisId, etapa, sano, bbox)
        return writeResult
    }

    override suspend fun markReviewed(analysisId: String): AnalysesResult<Unit> {
        reviewedCalls++
        return writeResult
    }
}
```

- [ ] **Step 2: Escribir el test del repositorio (falla: no existe la interfaz)**

`TEST/core/data/analyses/AnalysesRepositoryTest.kt`:

```kotlin
package com.rubusai.app.core.data.analyses

import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.BBox
import com.rubusai.app.core.model.EstadoFiltro
import com.rubusai.app.core.model.ValidacionAccion
import com.rubusai.app.core.model.ValidacionEstado
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.client.engine.mock.toByteArray
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class AnalysesRepositoryTest {

    private fun TestScope.repository(handler: MockRequestHandler) =
        AnalysesRepositoryImpl(clientFixture(handler = handler).client)

    private val analysisJson = """
        {"id":"a1","campo":{"id":"c1","codigoCampo":"N-01","nombre":"Norte"},
         "fechaAnalisis":"2026-10-30T18:00:00.000Z","totalElementosDetectados":12,"elementosSanos":9,
         "elementosEnfermos":3,"porcentajeMermaGeneral":25.0,"pesoSanoGramos":410.5,
         "validacionEstado":"validado","validacionObservaciones":"ok","deteccionesRevisadas":true,
         "campoId":"c1","productorId":"p1",
         "fenologiaEtapas":[{"id":"e1","etapa":"maduro","cantidad":4,"cambiaA":"x","enDias":3,"diasParaCosecha":9}]}
    """.trimIndent()

    @Test
    fun listaMandaLosFiltrosYConvierteLaPagina() = runTest {
        var params: Map<String, String?> = emptyMap()
        val repository = repository { request ->
            params = request.url.parameters.names().associateWith { request.url.parameters[it] }
            respondJson("""{"data":[$analysisJson],"total":41,"page":2,"limit":20,"totalPages":3,"hasMore":true}""")
        }

        val result = repository.list(page = 2, limit = 20, estado = EstadoFiltro.Todos, campoId = "c1")

        assertEquals(mapOf("page" to "2", "limit" to "20", "estado" to "all", "campo_id" to "c1"), params)
        val page = (result as AnalysesResult.Success).value
        assertEquals(2, page.page)
        assertTrue(page.hasMore)
        val item = page.items.single()
        assertEquals("a1", item.id)
        assertEquals("Norte", item.campoNombre)
        assertEquals(ValidacionEstado.Validado, item.estado)
        assertEquals(12, item.totalElementos)
        assertEquals(listOf("maduro"), item.etapas.map { it.etapa })
        assertTrue(item.deteccionesRevisadas)
    }

    @Test
    fun listaNoMandaCampoIdSiEsNulo() = runTest {
        var tieneCampo = true
        val repository = repository { request ->
            tieneCampo = "campo_id" in request.url.parameters
            respondJson("""{"data":[],"page":1,"hasMore":false}""")
        }

        repository.list(1, 20, EstadoFiltro.Pendiente, null)

        assertEquals(false, tieneCampo)
    }

    @Test
    fun unaCarpetaProhibidaEsForbidden() = runTest {
        val repository = repository { respondError(HttpStatusCode.Forbidden) }

        assertEquals(AnalysesResult.Failure(AnalysesFailure.Forbidden), repository.list(1, 20, EstadoFiltro.Pendiente, null))
    }

    @Test
    fun getConvierteElDetalle() = runTest {
        val repository = repository { respondJson(analysisJson) }

        val result = repository.get("a1") as AnalysesResult.Success

        assertEquals(410.5, result.value.pesoSanoGramos)
        assertEquals("ok", result.value.observaciones)
    }

    @Test
    fun getInexistenteEsNotFound() = runTest {
        val repository = repository { respondError(HttpStatusCode.NotFound) }

        assertEquals(AnalysesResult.Failure(AnalysesFailure.NotFound), repository.get("x"))
    }

    @Test
    fun imageUrlConvierteLaImagen() = runTest {
        var path = ""
        val repository = repository { request ->
            path = request.url.encodedPath
            respondJson("""{"url":"https://r2.example/x.jpg?sig=1","width":4000,"height":3000}""")
        }

        val result = repository.imageUrl("a1")

        assertTrue(path.endsWith("/analyses/a1/image"))
        assertEquals(AnalysesResult.Success(AnalysisImage("https://r2.example/x.jpg?sig=1", 4000, 3000)), result)
    }

    @Test
    fun validarMandaLaAccionYLasObservaciones() = runTest {
        var method: HttpMethod? = null
        var body = ""
        val repository = repository { request ->
            method = request.method
            body = request.body.toByteArray().decodeToString()
            respondJson(analysisJson)
        }

        val result = repository.validate("a1", ValidacionAccion.Rechazado, "se ve más maduro")

        assertEquals(HttpMethod.Patch, method)
        assertTrue(""""action":"rechazado"""" in body, body)
        assertTrue(""""observaciones":"se ve más maduro"""" in body, body)
        assertEquals(AnalysesResult.Success(Unit), result)
    }

    @Test
    fun deteccionesIgnoraLasEliminadasYConvierteElBox() = runTest {
        val repository = repository {
            respondJson(
                """[{"id":"d1","origen":"MODELO","confidence":0.8,"etapa":"verde","sano":true,"bbox":[1,2,30.5,40],"eliminada":false},
                    {"id":"d2","origen":"MODELO","confidence":null,"etapa":"flor","sano":false,"bbox":[5,5,9,9],"eliminada":true}]""",
            )
        }

        val result = repository.detections("a1") as AnalysesResult.Success

        assertEquals(listOf("d1"), result.value.map { it.id })
        assertEquals(BBox(1f, 2f, 30.5f, 40f), result.value.single().bbox)
    }

    @Test
    fun unBoxQueNoTieneCuatroNumerosEsFalloInesperado() = runTest {
        val repository = repository {
            respondJson("""[{"id":"d1","etapa":"verde","sano":true,"bbox":[1,2,3],"eliminada":false}]""")
        }

        assertEquals(AnalysesResult.Failure(AnalysesFailure.Unexpected), repository.detections("a1"))
    }

    @Test
    fun editarMandaElFeedbackEditarConTodosLosCampos() = runTest {
        var path = ""
        var body = ""
        val repository = repository { request ->
            path = request.url.encodedPath
            body = request.body.toByteArray().decodeToString()
            respondJson("{}", HttpStatusCode.Created)
        }

        val result = repository.editDetection("a1", "d1", "maduro", false, BBox(1f, 2f, 3f, 4f))

        assertTrue(path.endsWith("/analyses/a1/detections/d1/feedback"))
        assertTrue(""""accion":"EDITAR"""" in body, body)
        assertTrue(""""etapaCorregida":"maduro"""" in body, body)
        assertTrue(""""saludCorregida":false""" in body, body)
        assertTrue(""""bbox":[1.0,2.0,3.0,4.0]""" in body, body)
        assertEquals(AnalysesResult.Success(Unit), result)
    }

    @Test
    fun eliminarMandaSoloLaAccionEliminar() = runTest {
        var body = ""
        val repository = repository { request ->
            body = request.body.toByteArray().decodeToString()
            respondJson("{}", HttpStatusCode.Created)
        }

        repository.deleteDetection("a1", "d1")

        assertTrue(""""accion":"ELIMINAR"""" in body, body)
        assertTrue("bbox" !in body, body)
    }

    @Test
    fun agregarMandaEtapaSaludYBox() = runTest {
        var path = ""
        var body = ""
        val repository = repository { request ->
            path = request.url.encodedPath
            body = request.body.toByteArray().decodeToString()
            respondJson("{}", HttpStatusCode.Created)
        }

        repository.addDetection("a1", "flor", true, BBox(10f, 20f, 30f, 40f))

        assertTrue(path.endsWith("/analyses/a1/detections"))
        assertTrue(""""etapa":"flor"""" in body, body)
        assertTrue(""""bbox":[10.0,20.0,30.0,40.0]""" in body, body)
    }

    @Test
    fun unBoxInvalidoEs400() = runTest {
        val repository = repository { respondError(HttpStatusCode.BadRequest) }

        assertEquals(
            AnalysesResult.Failure(AnalysesFailure.InvalidInput),
            repository.addDetection("a1", "flor", true, BBox(1f, 1f, 2f, 2f)),
        )
    }

    @Test
    fun marcarRevisadoUsaPatchReview() = runTest {
        var method: HttpMethod? = null
        var path = ""
        val repository = repository { request ->
            method = request.method
            path = request.url.encodedPath
            respondJson("{}")
        }

        val result = repository.markReviewed("a1")

        assertEquals(HttpMethod.Patch, method)
        assertTrue(path.endsWith("/analyses/a1/review"))
        assertEquals(AnalysesResult.Success(Unit), result)
    }

    @Test
    fun losCodigosDeErrorSeMapean() = runTest {
        suspend fun fallo(status: HttpStatusCode) =
            (repository { respondError(status) }.markReviewed("a1") as AnalysesResult.Failure).reason

        assertEquals(AnalysesFailure.Unauthorized, fallo(HttpStatusCode.Unauthorized))
        assertEquals(AnalysesFailure.Server, fallo(HttpStatusCode.InternalServerError))
        assertEquals(AnalysesFailure.Unexpected, fallo(HttpStatusCode.TooManyRequests))
    }

    @Test
    fun sinRedEsFalloDeRed() = runTest {
        val repository = repository { throw FakeNetworkException() }

        assertEquals(AnalysesResult.Failure(AnalysesFailure.Network), repository.get("a1"))
    }

    @Test
    fun unCuerpoQueNoEsJsonEsFalloInesperado() = runTest {
        val repository = repository { respondJson("esto no es json") }

        assertEquals(AnalysesResult.Failure(AnalysesFailure.Unexpected), repository.get("a1"))
    }
}
```

- [ ] **Step 3: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*AnalysesRepositoryTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: AnalysesRepositoryImpl`).

- [ ] **Step 4: Implementar el repositorio**

`MAIN/core/data/analyses/AnalysesRepository.kt`:

```kotlin
package com.rubusai.app.core.data.analyses

import com.rubusai.app.core.model.Analysis
import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.AnalysisPage
import com.rubusai.app.core.model.BBox
import com.rubusai.app.core.model.Detection
import com.rubusai.app.core.model.EstadoFiltro
import com.rubusai.app.core.model.FenologiaEtapa
import com.rubusai.app.core.model.ValidacionAccion
import com.rubusai.app.core.model.ValidacionEstado
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.plugins.ResponseException
import io.ktor.client.request.get
import io.ktor.client.request.parameter
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.http.ContentType
import io.ktor.http.HttpStatusCode
import io.ktor.http.contentType
import io.ktor.serialization.ContentConvertException
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.serialization.SerializationException
import kotlinx.serialization.Serializable

internal enum class AnalysesFailure { Network, Unauthorized, Forbidden, NotFound, InvalidInput, Server, Unexpected }

internal sealed interface AnalysesResult<out T> {
    data class Success<out T>(val value: T) : AnalysesResult<T>
    data class Failure(val reason: AnalysesFailure) : AnalysesResult<Nothing>
}

internal interface AnalysesRepository {
    /** `GET analyses`, paginado. El backend aplica el scope del rol. */
    suspend fun list(page: Int, limit: Int, estado: EstadoFiltro, campoId: String?): AnalysesResult<AnalysisPage>

    suspend fun get(id: String): AnalysesResult<Analysis>

    /** `GET analyses/:id/image`: solo ADMIN y AGRONOMO. La URL caduca a los 15 min. */
    suspend fun imageUrl(id: String): AnalysesResult<AnalysisImage>

    suspend fun validate(id: String, action: ValidacionAccion, observaciones: String?): AnalysesResult<Unit>

    /** Detecciones ya resueltas por el servidor; las eliminadas no se devuelven. */
    suspend fun detections(id: String): AnalysesResult<List<Detection>>

    suspend fun editDetection(analysisId: String, detectionId: String, etapa: String, sano: Boolean, bbox: BBox): AnalysesResult<Unit>

    suspend fun deleteDetection(analysisId: String, detectionId: String): AnalysesResult<Unit>

    suspend fun addDetection(analysisId: String, etapa: String, sano: Boolean, bbox: BBox): AnalysesResult<Unit>

    suspend fun markReviewed(analysisId: String): AnalysesResult<Unit>
}

@Serializable
internal data class CampoRefDto(val nombre: String = "")

@Serializable
internal data class EtapaDto(val etapa: String, val cantidad: Int = 0)

@Serializable
internal data class AnalysisDto(
    val id: String,
    val campo: CampoRefDto? = null,
    val fechaAnalisis: String? = null,
    val totalElementosDetectados: Int = 0,
    val elementosSanos: Int = 0,
    val elementosEnfermos: Int = 0,
    val porcentajeMermaGeneral: Double = 0.0,
    val pesoSanoGramos: Double = 0.0,
    val validacionEstado: String = "pendiente",
    val validacionObservaciones: String? = null,
    val deteccionesRevisadas: Boolean = false,
    val fenologiaEtapas: List<EtapaDto> = emptyList(),
) {
    fun toAnalysis() = Analysis(
        id = id,
        campoNombre = campo?.nombre,
        fechaAnalisis = fechaAnalisis,
        totalElementos = totalElementosDetectados,
        elementosSanos = elementosSanos,
        elementosEnfermos = elementosEnfermos,
        mermaPorcentaje = porcentajeMermaGeneral,
        pesoSanoGramos = pesoSanoGramos,
        estado = ValidacionEstado.fromApi(validacionEstado),
        observaciones = validacionObservaciones,
        deteccionesRevisadas = deteccionesRevisadas,
        etapas = fenologiaEtapas.map { FenologiaEtapa(it.etapa, it.cantidad) },
    )
}

@Serializable
internal data class AnalysisPageDto(val data: List<AnalysisDto>, val page: Int = 1, val hasMore: Boolean = false)

@Serializable
internal data class ImageDto(val url: String, val width: Int, val height: Int)

@Serializable
internal data class DetectionDto(
    val id: String,
    val etapa: String,
    val sano: Boolean,
    val bbox: List<Float>,
    val confidence: Double? = null,
    val eliminada: Boolean = false,
) {
    fun toDetection(): Detection {
        if (bbox.size != 4) throw SerializationException("bbox debe tener 4 números")
        return Detection(id, etapa, sano, BBox(bbox[0], bbox[1], bbox[2], bbox[3]), confidence)
    }
}

@Serializable
internal data class ValidateBody(val action: String, val observaciones: String? = null)

@Serializable
internal data class FeedbackBody(
    val accion: String,
    val etapaCorregida: String? = null,
    val saludCorregida: Boolean? = null,
    val bbox: List<Float>? = null,
)

@Serializable
internal data class CreateDetectionBody(val etapa: String, val sano: Boolean, val bbox: List<Float>)

private fun BBox.toList() = listOf(x1, y1, x2, y2)

/**
 * Usa el `HttpClient` de la app (con refresh de token y `expectSuccess`, así que un 4xx/5xx lanza
 * `ResponseException`). Nada de lo que falla se registra: el mensaje de un `ResponseException`
 * incluye el cuerpo y la URL firmada.
 */
internal class AnalysesRepositoryImpl(private val client: HttpClient) : AnalysesRepository {

    override suspend fun list(page: Int, limit: Int, estado: EstadoFiltro, campoId: String?) = call {
        val dto = client.get("analyses") {
            parameter("page", page)
            parameter("limit", limit)
            parameter("estado", estado.api)
            campoId?.let { parameter("campo_id", it) }
        }.body<AnalysisPageDto>()
        AnalysisPage(dto.data.map { it.toAnalysis() }, dto.page, dto.hasMore)
    }

    override suspend fun get(id: String) = call { client.get("analyses/$id").body<AnalysisDto>().toAnalysis() }

    override suspend fun imageUrl(id: String) = call {
        client.get("analyses/$id/image").body<ImageDto>().let { AnalysisImage(it.url, it.width, it.height) }
    }

    override suspend fun validate(id: String, action: ValidacionAccion, observaciones: String?) = call {
        client.patch("analyses/$id/validate") {
            contentType(ContentType.Application.Json)
            setBody(ValidateBody(action.api, observaciones))
        }
        Unit
    }

    override suspend fun detections(id: String) = call {
        client.get("analyses/$id/detections").body<List<DetectionDto>>()
            .filterNot { it.eliminada }
            .map { it.toDetection() }
    }

    override suspend fun editDetection(analysisId: String, detectionId: String, etapa: String, sano: Boolean, bbox: BBox) = call {
        client.post("analyses/$analysisId/detections/$detectionId/feedback") {
            contentType(ContentType.Application.Json)
            setBody(FeedbackBody("EDITAR", etapa, sano, bbox.toList()))
        }
        Unit
    }

    override suspend fun deleteDetection(analysisId: String, detectionId: String) = call {
        client.post("analyses/$analysisId/detections/$detectionId/feedback") {
            contentType(ContentType.Application.Json)
            setBody(FeedbackBody("ELIMINAR"))
        }
        Unit
    }

    override suspend fun addDetection(analysisId: String, etapa: String, sano: Boolean, bbox: BBox) = call {
        client.post("analyses/$analysisId/detections") {
            contentType(ContentType.Application.Json)
            setBody(CreateDetectionBody(etapa, sano, bbox.toList()))
        }
        Unit
    }

    override suspend fun markReviewed(analysisId: String) = call {
        client.patch("analyses/$analysisId/review")
        Unit
    }

    private suspend fun <T> call(block: suspend () -> T): AnalysesResult<T> = try {
        AnalysesResult.Success(block())
    } catch (e: ResponseException) {
        AnalysesResult.Failure(e.response.status.toFailure())
    } catch (e: SerializationException) {
        AnalysesResult.Failure(AnalysesFailure.Unexpected)
    } catch (e: ContentConvertException) {
        AnalysesResult.Failure(AnalysesFailure.Unexpected)
    } catch (e: Exception) {
        // Una cancelación de quien llama se propaga; cualquier otra causa (red, timeout) es un fallo de red.
        currentCoroutineContext().ensureActive()
        AnalysesResult.Failure(AnalysesFailure.Network)
    }
}

private fun HttpStatusCode.toFailure(): AnalysesFailure = when {
    this == HttpStatusCode.Unauthorized -> AnalysesFailure.Unauthorized
    this == HttpStatusCode.Forbidden -> AnalysesFailure.Forbidden
    this == HttpStatusCode.NotFound -> AnalysesFailure.NotFound
    this == HttpStatusCode.BadRequest || this == HttpStatusCode.UnprocessableEntity -> AnalysesFailure.InvalidInput
    value >= 500 -> AnalysesFailure.Server
    else -> AnalysesFailure.Unexpected
}
```

Nota: los cuerpos de `PATCH validate` y de los `POST` devuelven JSON que no se lee; no se parsean a propósito.

- [ ] **Step 5: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*AnalysesRepositoryTest*' --tests '*AnalysisModelsTest*' --console=plain`
Expected: PASS (16 tests). Si `request.body.toByteArray()` no existe en esta versión de `ktor-client-mock`, usa `(request.body as io.ktor.http.content.TextContent).text`.

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): AnalysesRepository con lista, detalle, imagen, validación y feedback de detecciones"
```

---

### Task 3: `Viewport` (matemática pantalla↔imagen)

**Files:**
- Create: `MAIN/feature/review/Viewport.kt`
- Test: `TEST/feature/review/ViewportTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.feature.review

import kotlin.math.abs
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ViewportTest {

    // Contenedor 1000x500, imagen 2000x1000: ajuste 0.5, la imagen llena el contenedor.
    private val vp = Viewport(containerW = 1000f, containerH = 500f, imageW = 2000f, imageH = 1000f)

    private fun assertNear(expected: Float, actual: Float, eps: Float = 0.01f) =
        assertTrue(abs(expected - actual) <= eps, "esperado $expected, real $actual")

    @Test
    fun laImagenSeAjustaAlContenedor() {
        assertNear(0f, vp.toScreenX(0f))
        assertNear(1000f, vp.toScreenX(2000f))
        assertNear(0f, vp.toScreenY(0f))
        assertNear(500f, vp.toScreenY(1000f))
    }

    @Test
    fun laImagenMasEstrechaSeCentra() {
        // Contenedor 1000x500, imagen 500x500: ajuste 1.0, márgenes laterales de 250.
        val cuadrada = Viewport(1000f, 500f, 500f, 500f)

        assertNear(250f, cuadrada.toScreenX(0f))
        assertNear(750f, cuadrada.toScreenX(500f))
    }

    @Test
    fun pantallaEImagenSonInversas() {
        val zoomed = vp.copy(zoom = 3f, panX = 40f, panY = -25f)

        assertNear(731f, zoomed.toImageX(zoomed.toScreenX(731f)))
        assertNear(123f, zoomed.toImageY(zoomed.toScreenY(123f)))
    }

    @Test
    fun elZoomDejaFijoElPuntoBajoLosDedos() {
        val antes = Offsets(vp.toImageX(300f), vp.toImageY(200f))

        val despues = vp.transform(centroidX = 300f, centroidY = 200f, factor = 2f, dx = 0f, dy = 0f)

        assertEquals(2f, despues.zoom)
        assertNear(300f, despues.toScreenX(antes.x))
        assertNear(200f, despues.toScreenY(antes.y))
    }

    @Test
    fun elZoomSeLimitaEntre1Y8() {
        assertEquals(8f, vp.transform(500f, 250f, 100f, 0f, 0f).zoom)
        assertEquals(1f, vp.transform(500f, 250f, 0.01f, 0f, 0f).zoom)
    }

    @Test
    fun alVolverAZoom1ElDesplazamientoSeReinicia() {
        val alejado = vp.copy(zoom = 2f, panX = 120f, panY = 40f).transform(500f, 250f, 0.1f, 0f, 0f)

        assertEquals(1f, alejado.zoom)
        assertEquals(0f, alejado.panX)
        assertEquals(0f, alejado.panY)
    }

    @Test
    fun conZoomLosDedosDesplazanLaVista() {
        val movido = vp.copy(zoom = 2f).transform(500f, 250f, 1f, dx = 30f, dy = -10f)

        assertNear(30f, movido.panX)
        assertNear(-10f, movido.panY)
    }

    @Test
    fun conZoom1LosDedosNoDesplazan() {
        val movido = vp.transform(500f, 250f, 1f, dx = 30f, dy = -10f)

        assertEquals(0f, movido.panX)
        assertEquals(0f, movido.panY)
    }

    @Test
    fun elDesplazamientoNoSaleDeLaImagen() {
        val movido = vp.copy(zoom = 2f).transform(500f, 250f, 1f, dx = 99_999f, dy = 0f)

        // Con zoom 2 la imagen mide 2000 de ancho en pantalla: el tope es la mitad.
        assertNear(1000f, movido.panX)
    }

    @Test
    fun alCambiarElContenedorSeConservaElZoom() {
        val nuevo = vp.copy(zoom = 3f).withContainer(800f, 400f)

        assertEquals(3f, nuevo.zoom)
        assertEquals(800f, nuevo.containerW)
    }

    private data class Offsets(val x: Float, val y: Float)
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ViewportTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: Viewport`).

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.feature.review

import com.rubusai.app.core.model.AnalysisImage

internal const val MIN_ZOOM = 1f
internal const val MAX_ZOOM = 8f

/**
 * Lleva coordenadas de la imagen original (píxeles) a la pantalla y al revés.
 * La imagen se dibuja con `ContentScale.Fit` (centrada) y encima se aplica [zoom] y un
 * desplazamiento [panX]/[panY] en píxeles de pantalla; el mismo cálculo vale para
 * `graphicsLayer` (que escala desde el centro del contenedor) y para el dibujo de los boxes.
 */
internal data class Viewport(
    val containerW: Float,
    val containerH: Float,
    val imageW: Float,
    val imageH: Float,
    val zoom: Float = 1f,
    val panX: Float = 0f,
    val panY: Float = 0f,
) {
    private val fit: Float get() = minOf(containerW / imageW, containerH / imageH)

    /** Píxeles de pantalla por píxel de imagen. */
    val scale: Float get() = fit * zoom

    fun toScreenX(x: Float): Float = containerW / 2f + (x - imageW / 2f) * scale + panX
    fun toScreenY(y: Float): Float = containerH / 2f + (y - imageH / 2f) * scale + panY
    fun toImageX(sx: Float): Float = (sx - containerW / 2f - panX) / scale + imageW / 2f
    fun toImageY(sy: Float): Float = (sy - containerH / 2f - panY) / scale + imageH / 2f

    fun withContainer(w: Float, h: Float): Viewport = copy(containerW = w, containerH = h)

    /**
     * Aplica un gesto de dos dedos: [factor] de zoom alrededor del punto (centroidX, centroidY)
     * de pantalla y un desplazamiento (dx, dy). El zoom queda entre [MIN_ZOOM] y [MAX_ZOOM];
     * con zoom 1 no hay desplazamiento y el desplazamiento no saca la imagen de la pantalla.
     */
    fun transform(centroidX: Float, centroidY: Float, factor: Float, dx: Float, dy: Float): Viewport {
        val newZoom = (zoom * factor).coerceIn(MIN_ZOOM, MAX_ZOOM)
        if (newZoom <= MIN_ZOOM) return copy(zoom = MIN_ZOOM, panX = 0f, panY = 0f)
        val f = newZoom / zoom
        val kx = centroidX - containerW / 2f
        val ky = centroidY - containerH / 2f
        val newScale = fit * newZoom
        val maxX = imageW * newScale / 2f
        val maxY = imageH * newScale / 2f
        return copy(
            zoom = newZoom,
            panX = (kx - (kx - panX) * f + dx).coerceIn(-maxX, maxX),
            panY = (ky - (ky - panY) * f + dy).coerceIn(-maxY, maxY),
        )
    }

    companion object {
        /** Estado inicial: contenedor aún sin medir (lo fija `AnnotatedImage` al conocer su tamaño). */
        fun initial(image: AnalysisImage) = Viewport(1f, 1f, image.width.toFloat(), image.height.toFloat())
    }
}
```

- [ ] **Step 4: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ViewportTest*' --console=plain`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): Viewport convierte entre pantalla e imagen con zoom y desplazamiento"
```

---

### Task 4: `BoxGeometry` (hit-test, arrastre, normalización)

**Files:**
- Create: `MAIN/feature/review/BoxGeometry.kt`
- Test: `TEST/feature/review/BoxGeometryTest.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.feature.review

import com.rubusai.app.core.data.analyses.deteccion
import com.rubusai.app.core.model.BBox
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class BoxGeometryTest {

    private val box = BBox(100f, 100f, 200f, 200f)

    @Test
    fun unaEsquinaCercanaGanaAlInterior() {
        assertEquals(DragMode.TopLeft, hitHandle(box, 102f, 98f, radius = 20f))
        assertEquals(DragMode.BottomRight, hitHandle(box, 195f, 205f, radius = 20f))
    }

    @Test
    fun elInteriorMueveElBox() {
        assertEquals(DragMode.Move, hitHandle(box, 150f, 150f, radius = 20f))
    }

    @Test
    fun elBordeExtendidoPorElRadioTambienMueve() {
        assertEquals(DragMode.Move, hitHandle(box, 205f, 150f, radius = 20f))
    }

    @Test
    fun fueraDelBoxNoHayAgarre() {
        assertNull(hitHandle(box, 300f, 300f, radius = 20f))
    }

    @Test
    fun enUnBoxMinusculoGanaLaEsquinaMasCercana() {
        val diminuto = BBox(100f, 100f, 110f, 110f)

        assertEquals(DragMode.BottomRight, hitHandle(diminuto, 111f, 111f, radius = 20f))
        assertEquals(DragMode.TopLeft, hitHandle(diminuto, 99f, 99f, radius = 20f))
    }

    @Test
    fun moverNoSacaElBoxDeLaImagen() {
        val b = BBox(10f, 10f, 60f, 60f)

        assertEquals(BBox(50f, 10f, 100f, 60f), applyDrag(b, DragMode.Move, 100f, 0f, 100f, 100f))
        assertEquals(BBox(0f, 10f, 50f, 60f), applyDrag(b, DragMode.Move, -100f, 0f, 100f, 100f))
    }

    @Test
    fun moverUnBoxQueYaSobresaleNoLanza() {
        val sobresale = BBox(0f, 0f, 110f, 50f)

        applyDrag(sobresale, DragMode.Move, 5f, 5f, 100f, 100f)
    }

    @Test
    fun laEsquinaSuperiorIzquierdaNoSaleDeLaImagen() {
        val b = BBox(10f, 10f, 60f, 60f)

        assertEquals(BBox(0f, 0f, 60f, 60f), applyDrag(b, DragMode.TopLeft, -100f, -100f, 100f, 100f))
    }

    @Test
    fun redimensionarNoPasaDelTamanioMinimo() {
        val b = BBox(10f, 10f, 60f, 60f)

        val r = applyDrag(b, DragMode.BottomRight, -100f, -100f, 100f, 100f)

        assertEquals(BBox(10f, 10f, 10f + MIN_BOX_PX, 10f + MIN_BOX_PX), r)
    }

    @Test
    fun cadaEsquinaMueveSoloSusLados() {
        val b = BBox(20f, 20f, 60f, 60f)

        assertEquals(BBox(30f, 20f, 60f, 70f), applyDrag(b, DragMode.BottomLeft, 10f, 10f, 100f, 100f))
        assertEquals(BBox(20f, 25f, 70f, 60f), applyDrag(b, DragMode.TopRight, 10f, 5f, 100f, 100f))
    }

    @Test
    fun normalizarOrdenaLosPuntosYLosLimita() {
        assertEquals(BBox(20f, 10f, 80f, 90f), normalized(80f, 90f, 20f, 10f, 100f, 100f))
        assertEquals(BBox(0f, 5f, 100f, 100f), normalized(-5f, 5f, 130f, 120f, 100f, 100f))
    }

    @Test
    fun unBoxEsValidoSiEstaEnLaImagenYNoEsDiminuto() {
        assertTrue(BBox(0f, 0f, 20f, 20f).isValid(100f, 100f))
        assertFalse(BBox(0f, 0f, 5f, 50f).isValid(100f, 100f))
        assertFalse(BBox(90f, 90f, 120f, 120f).isValid(100f, 100f))
    }

    @Test
    fun clampTrimeaAlosLimitesDeLaImagen() {
        assertEquals(BBox(0f, 5f, 100f, 100f), BBox(-3f, 5f, 130f, 140f).clampTo(100f, 100f))
    }

    @Test
    fun seEligeElBoxMasPequenoBajoElDedo() {
        val grande = deteccion("grande", BBox(0f, 0f, 100f, 100f))
        val chico = deteccion("chico", BBox(40f, 40f, 60f, 60f))

        assertEquals("chico", pickBox(listOf(grande, chico), 50f, 50f, tolerance = 0f)?.id)
        assertEquals("grande", pickBox(listOf(grande, chico), 10f, 10f, tolerance = 0f)?.id)
    }

    @Test
    fun laToleranciaPermiteTocarJustoAfuera() {
        val d = deteccion("d", BBox(40f, 40f, 60f, 60f))

        assertEquals("d", pickBox(listOf(d), 65f, 50f, tolerance = 10f)?.id)
        assertNull(pickBox(listOf(d), 90f, 50f, tolerance = 10f))
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*BoxGeometryTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: hitHandle`).

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.feature.review

import com.rubusai.app.core.model.BBox
import com.rubusai.app.core.model.Detection
import kotlin.math.hypot

/** Lado mínimo de un box, en píxeles de la imagen original. */
internal const val MIN_BOX_PX = 8f

internal enum class DragMode { Move, TopLeft, TopRight, BottomLeft, BottomRight }

// No usa coerceIn: lanza si el rango queda invertido (un box del servidor puede sobresalir de la imagen).
private fun Float.clamp(lo: Float, hi: Float): Float = coerceAtMost(hi).coerceAtLeast(lo)

/**
 * Qué parte del [box] agarra el punto (x, y) (píxeles de imagen). Las esquinas a menos de
 * [radius] ganan al interior; el interior se extiende [radius] hacia fuera para poder agarrar
 * boxes pequeños. `null` si el punto está lejos.
 */
internal fun hitHandle(box: BBox, x: Float, y: Float, radius: Float): DragMode? {
    val corners = listOf(
        Triple(DragMode.TopLeft, box.x1, box.y1),
        Triple(DragMode.TopRight, box.x2, box.y1),
        Triple(DragMode.BottomLeft, box.x1, box.y2),
        Triple(DragMode.BottomRight, box.x2, box.y2),
    )
    val nearest = corners.minBy { hypot(x - it.second, y - it.third) }
    if (hypot(x - nearest.second, y - nearest.third) <= radius) return nearest.first
    val inside = x in (box.x1 - radius)..(box.x2 + radius) && y in (box.y1 - radius)..(box.y2 + radius)
    return if (inside) DragMode.Move else null
}

/** Aplica un arrastre de (dx, dy) píxeles de imagen al [start] según [mode], dentro de la imagen w×h. */
internal fun applyDrag(start: BBox, mode: DragMode, dx: Float, dy: Float, w: Float, h: Float): BBox = when (mode) {
    DragMode.Move -> {
        val mx = dx.clamp(-start.x1, w - start.x2)
        val my = dy.clamp(-start.y1, h - start.y2)
        BBox(start.x1 + mx, start.y1 + my, start.x2 + mx, start.y2 + my)
    }
    DragMode.TopLeft -> BBox(
        (start.x1 + dx).clamp(0f, start.x2 - MIN_BOX_PX),
        (start.y1 + dy).clamp(0f, start.y2 - MIN_BOX_PX),
        start.x2,
        start.y2,
    )
    DragMode.TopRight -> BBox(
        start.x1,
        (start.y1 + dy).clamp(0f, start.y2 - MIN_BOX_PX),
        (start.x2 + dx).clamp(start.x1 + MIN_BOX_PX, w),
        start.y2,
    )
    DragMode.BottomLeft -> BBox(
        (start.x1 + dx).clamp(0f, start.x2 - MIN_BOX_PX),
        start.y1,
        start.x2,
        (start.y2 + dy).clamp(start.y1 + MIN_BOX_PX, h),
    )
    DragMode.BottomRight -> BBox(
        start.x1,
        start.y1,
        (start.x2 + dx).clamp(start.x1 + MIN_BOX_PX, w),
        (start.y2 + dy).clamp(start.y1 + MIN_BOX_PX, h),
    )
}

/** Caja entre dos puntos cualesquiera (arrastre de dibujo), ordenada y limitada a la imagen w×h. */
internal fun normalized(ax: Float, ay: Float, bx: Float, by: Float, w: Float, h: Float): BBox = BBox(
    minOf(ax, bx).clamp(0f, w),
    minOf(ay, by).clamp(0f, h),
    maxOf(ax, bx).clamp(0f, w),
    maxOf(ay, by).clamp(0f, h),
)

internal fun BBox.clampTo(w: Float, h: Float): BBox =
    BBox(x1.clamp(0f, w), y1.clamp(0f, h), x2.clamp(0f, w), y2.clamp(0f, h))

/** Dentro de la imagen w×h y con al menos [MIN_BOX_PX] de lado. */
internal fun BBox.isValid(w: Float, h: Float): Boolean =
    x1 >= 0f && y1 >= 0f && x2 <= w && y2 <= h && width >= MIN_BOX_PX && height >= MIN_BOX_PX

/** La detección bajo (x, y), con [tolerance] píxeles de imagen de margen; si hay varias, la de menor área. */
internal fun pickBox(detections: List<Detection>, x: Float, y: Float, tolerance: Float): Detection? =
    detections
        .filter {
            val b = it.bbox
            x in (b.x1 - tolerance)..(b.x2 + tolerance) && y in (b.y1 - tolerance)..(b.y2 + tolerance)
        }
        .minByOrNull { it.bbox.width * it.bbox.height }
```

- [ ] **Step 4: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*BoxGeometryTest*' --console=plain`
Expected: PASS (15 tests).

- [ ] **Step 5: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): BoxGeometry para agarrar, arrastrar y normalizar boxes"
```

---

### Task 5: Textos, etiquetas y módulo Koin de análisis

**Files:**
- Modify: `RES`
- Create: `MAIN/feature/results/AnalysisLabels.kt`
- Modify: `MAIN/core/di/AppModule.kt`
- Modify: `TEST/core/di/KoinGraphTest.kt`

- [ ] **Step 1: Añadir todos los textos de la fase**

Antes de `</resources>` en `RES`:

```xml
    <string name="common_retry">Reintentar</string>
    <string name="common_back">Volver</string>
    <string name="common_cancel">Cancelar</string>
    <string name="common_confirm">Confirmar</string>
    <string name="common_delete">Eliminar</string>

    <string name="home_history">Análisis</string>
    <string name="aviso_ver">Ver</string>

    <string name="analyses_failure_network">Sin conexión con el servidor. Reintenta.</string>
    <string name="analyses_failure_forbidden">No tienes acceso a este análisis.</string>
    <string name="analyses_failure_not_found">El análisis ya no existe.</string>
    <string name="analyses_failure_server">Servidor no disponible. Reintenta en un momento.</string>
    <string name="analyses_failure_session">Tu sesión expiró. Inicia sesión de nuevo.</string>
    <string name="analyses_failure_unexpected">Ocurrió un error. Intenta de nuevo.</string>
    <string name="analyses_failure_invalid">Los datos no son válidos.</string>

    <string name="estado_pendiente">Pendiente</string>
    <string name="estado_validado">Validado</string>
    <string name="estado_rechazado">Rechazado</string>

    <string name="etapa_boton">Botón</string>
    <string name="etapa_flor">Flor</string>
    <string name="etapa_verde">Verde</string>
    <string name="etapa_naranja">Naranja</string>
    <string name="etapa_marron">Marrón</string>
    <string name="etapa_maduro">Maduro</string>
    <string name="etapa_deteccion_gen">Detección genérica</string>

    <string name="history_title">Análisis</string>
    <string name="history_filter_pendiente">Pendientes</string>
    <string name="history_filter_validado">Validados</string>
    <string name="history_filter_rechazado">Rechazados</string>
    <string name="history_filter_todos">Todos</string>
    <string name="history_filter_campo_todos">Todos los campos</string>
    <string name="history_empty">No hay análisis con estos filtros.</string>
    <string name="history_load_more_failed">No se pudieron cargar más análisis.</string>
    <string name="history_row_total">%1$d elementos</string>

    <string name="result_title">Análisis</string>
    <string name="result_campo">Campo</string>
    <string name="result_fecha">Fecha</string>
    <string name="result_estado">Estado</string>
    <string name="result_observaciones">Observaciones</string>
    <string name="result_total">Elementos detectados</string>
    <string name="result_sanos">Sanos</string>
    <string name="result_enfermos">Enfermos</string>
    <string name="result_merma">Merma</string>
    <string name="result_peso">Peso sano (g)</string>
    <string name="result_etapas">Etapas fenológicas</string>
    <string name="result_image_description">Imagen del análisis con sus detecciones</string>
    <string name="result_image_unavailable">La imagen no está disponible para tu rol.</string>
    <string name="result_image_error">No se pudo cargar la imagen.</string>
    <string name="result_validate">Validar</string>
    <string name="result_reject">Rechazar</string>
    <string name="result_review">Revisar detecciones</string>
    <string name="result_validate_confirm_title">¿Validar este análisis?</string>
    <string name="result_reject_title">Rechazar análisis</string>
    <string name="result_reject_observaciones">Observaciones</string>
    <string name="result_reject_observaciones_required">Escribe las observaciones.</string>
    <string name="result_action_failed">No se pudo guardar. Reintenta.</string>

    <string name="review_title">Revisar detecciones</string>
    <string name="review_add">Agregar</string>
    <string name="review_stop_adding">Dejar de agregar</string>
    <string name="review_done">Marcar revisado</string>
    <string name="review_image_description">Imagen del análisis: toca un box para corregirlo</string>
    <string name="review_draw_hint">Arrastra sobre la imagen para dibujar un box.</string>
    <string name="review_stage">Etapa</string>
    <string name="review_healthy">Sano</string>
    <string name="review_save_failed">No se pudo guardar. Reintenta.</string>
    <string name="review_box_invalid">El box no es válido.</string>
    <string name="review_box_too_small">El box es demasiado pequeño.</string>
    <string name="review_reviewed_failed">No se pudo marcar como revisado. Reintenta.</string>
    <string name="review_delete_confirm">¿Eliminar esta detección?</string>
    <string name="review_discard_confirm">¿Descartar los cambios del box?</string>
    <string name="review_discard">Descartar</string>
```

- [ ] **Step 2: Escribir las etiquetas compartidas**

`MAIN/feature/results/AnalysisLabels.kt`:

```kotlin
package com.rubusai.app.feature.results

import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.model.Etapa
import com.rubusai.app.core.model.ValidacionEstado
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.analyses_failure_forbidden
import com.rubusai.app.resources.analyses_failure_invalid
import com.rubusai.app.resources.analyses_failure_network
import com.rubusai.app.resources.analyses_failure_not_found
import com.rubusai.app.resources.analyses_failure_server
import com.rubusai.app.resources.analyses_failure_session
import com.rubusai.app.resources.analyses_failure_unexpected
import com.rubusai.app.resources.estado_pendiente
import com.rubusai.app.resources.estado_rechazado
import com.rubusai.app.resources.estado_validado
import com.rubusai.app.resources.etapa_boton
import com.rubusai.app.resources.etapa_deteccion_gen
import com.rubusai.app.resources.etapa_flor
import com.rubusai.app.resources.etapa_maduro
import com.rubusai.app.resources.etapa_marron
import com.rubusai.app.resources.etapa_naranja
import com.rubusai.app.resources.etapa_verde
import org.jetbrains.compose.resources.stringResource

@Composable
internal fun ValidacionEstado.label(): String = stringResource(
    when (this) {
        ValidacionEstado.Pendiente -> Res.string.estado_pendiente
        ValidacionEstado.Validado -> Res.string.estado_validado
        ValidacionEstado.Rechazado -> Res.string.estado_rechazado
    },
)

/** Nombre legible de una etapa de API; una etapa que la app no conoce se muestra tal cual llegó. */
@Composable
internal fun etapaLabel(api: String): String = when (Etapa.fromApi(api)) {
    Etapa.Boton -> stringResource(Res.string.etapa_boton)
    Etapa.Flor -> stringResource(Res.string.etapa_flor)
    Etapa.Verde -> stringResource(Res.string.etapa_verde)
    Etapa.Naranja -> stringResource(Res.string.etapa_naranja)
    Etapa.Marron -> stringResource(Res.string.etapa_marron)
    Etapa.Maduro -> stringResource(Res.string.etapa_maduro)
    Etapa.DeteccionGen -> stringResource(Res.string.etapa_deteccion_gen)
    null -> api
}

/** Color del box por etapa; gris para una etapa desconocida. */
internal fun etapaColor(api: String): Color = when (Etapa.fromApi(api)) {
    Etapa.Boton -> Color(0xFF8E8E93)
    Etapa.Flor -> Color(0xFFE91E8C)
    Etapa.Verde -> Color(0xFF2E9E4F)
    Etapa.Naranja -> Color(0xFFFF8F00)
    Etapa.Marron -> Color(0xFF8D5524)
    Etapa.Maduro -> Color(0xFF7B1FA2)
    Etapa.DeteccionGen, null -> Color(0xFF607D8B)
}

@Composable
internal fun AnalysesFailure.message(): String = stringResource(
    when (this) {
        AnalysesFailure.Network -> Res.string.analyses_failure_network
        AnalysesFailure.Unauthorized -> Res.string.analyses_failure_session
        AnalysesFailure.Forbidden -> Res.string.analyses_failure_forbidden
        AnalysesFailure.NotFound -> Res.string.analyses_failure_not_found
        AnalysesFailure.InvalidInput -> Res.string.analyses_failure_invalid
        AnalysesFailure.Server -> Res.string.analyses_failure_server
        AnalysesFailure.Unexpected -> Res.string.analyses_failure_unexpected
    },
)
```

- [ ] **Step 3: Registrar el repositorio en Koin**

En `MAIN/core/di/AppModule.kt` añade los imports

```kotlin
import com.rubusai.app.core.data.analyses.AnalysesRepository
import com.rubusai.app.core.data.analyses.AnalysesRepositoryImpl
```

la función (tras `captureModule`)

```kotlin
/** Análisis: repositorio y ViewModels de lista, detalle y revisión (cada tarea añade el suyo). */
internal fun analysesModule(): Module = module {
    single<AnalysesRepository> { AnalysesRepositoryImpl(client = get()) }
}
```

y `analysesModule(),` en `appModules` después de `captureModule(),`.

- [ ] **Step 4: Test del grafo**

Añade a `TEST/core/di/KoinGraphTest.kt` (mismos imports que usan los otros tests; añade `com.rubusai.app.core.data.analyses.AnalysesRepository`):

```kotlin
    @Test
    fun elGrafoResuelveElRepositorioDeAnalisis() = runTest {
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
            app.koin.get<AnalysesRepository>()
        } finally {
            app.close()
        }
    }
```

- [ ] **Step 5: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, 354 + los de las tareas 1 a 4 + 1.

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): textos y etiquetas de la fase 2c y módulo Koin de análisis"
```

---

### Task 6: `HistoryViewModel`

**Files:**
- Create: `MAIN/feature/history/HistoryViewModel.kt`
- Test: `TEST/feature/history/HistoryViewModelTest.kt`
- Modify: `MAIN/core/di/AppModule.kt`

- [ ] **Step 1: Escribir el test que falla**

`FakeCamposRepository` ya existe en `TEST/feature/capture/CaptureTestSupport.kt` (constructor con un `CamposResult`).

```kotlin
package com.rubusai.app.feature.history

import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.AnalysesResult
import com.rubusai.app.core.data.analyses.FakeAnalysesRepository
import com.rubusai.app.core.data.analyses.analisis
import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.model.AnalysisPage
import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.model.EstadoFiltro
import com.rubusai.app.feature.capture.FakeCamposRepository
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class HistoryViewModelTest {

    private val dispatcher = StandardTestDispatcher()
    private val norte = Campo("c1", "Norte", "N-01")

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private fun vm(repo: FakeAnalysesRepository, campos: CamposResult = CamposResult.Success(listOf(norte))) =
        HistoryViewModel(repo, FakeCamposRepository(campos))

    private fun pagina(vararg ids: String, page: Int = 1, hasMore: Boolean = false) =
        AnalysesResult.Success(AnalysisPage(ids.map { analisis(it) }, page, hasMore))

    @Test
    fun alCrearseCargaLaPrimeraPaginaPendiente() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply { listHandler = { _, _, _ -> pagina("a1", "a2", hasMore = true) } }
        val vm = vm(repo)
        advanceUntilIdle()

        val s = vm.state.value
        assertEquals(listOf("a1", "a2"), s.items.map { it.id })
        assertFalse(s.loading)
        assertTrue(s.hasMore)
        assertEquals(listOf(norte), s.campos)
        assertEquals(Triple(1, EstadoFiltro.Pendiente, null), repo.listCalls.single())
    }

    @Test
    fun cambiarElEstadoRecargaDesdeLaPrimeraPagina() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply { listHandler = { _, _, _ -> pagina("a1") } }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onEstado(EstadoFiltro.Validado)
        advanceUntilIdle()

        assertEquals(Triple(1, EstadoFiltro.Validado, null), repo.listCalls.last())
        assertEquals(EstadoFiltro.Validado, vm.state.value.estado)
    }

    @Test
    fun elegirElMismoEstadoNoRecarga() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onEstado(EstadoFiltro.Pendiente)
        advanceUntilIdle()

        assertEquals(1, repo.listCalls.size)
    }

    @Test
    fun filtrarPorCampoMandaElIdYNullLoQuita() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onCampo("c1")
        advanceUntilIdle()
        assertEquals("c1", repo.listCalls.last().third)

        vm.onCampo(null)
        advanceUntilIdle()
        assertNull(repo.listCalls.last().third)
    }

    @Test
    fun cargarMasAgregaLaSiguientePagina() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply {
            listHandler = { page, _, _ ->
                if (page == 1) pagina("a1", hasMore = true) else pagina("a2", page = 2, hasMore = false)
            }
        }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.loadMore()
        advanceUntilIdle()

        assertEquals(listOf("a1", "a2"), vm.state.value.items.map { it.id })
        assertFalse(vm.state.value.hasMore)
        assertEquals(2, repo.listCalls.last().first)
    }

    @Test
    fun cargarMasSinMasPaginasNoLlamaAlServidor() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply { listHandler = { _, _, _ -> pagina("a1") } }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.loadMore()
        advanceUntilIdle()

        assertEquals(1, repo.listCalls.size)
    }

    @Test
    fun unFalloEnLaPrimeraCargaSeMuestraYSeReintenta() = runTest(dispatcher) {
        var falla = true
        val repo = FakeAnalysesRepository().apply {
            listHandler = { _, _, _ ->
                if (falla) AnalysesResult.Failure(AnalysesFailure.Network) else pagina("a1")
            }
        }
        val vm = vm(repo)
        advanceUntilIdle()
        assertEquals(AnalysesFailure.Network, vm.state.value.error)
        assertTrue(vm.state.value.items.isEmpty())

        falla = false
        vm.retry()
        advanceUntilIdle()

        assertNull(vm.state.value.error)
        assertEquals(listOf("a1"), vm.state.value.items.map { it.id })
    }

    @Test
    fun unFalloAlCargarMasConservaLaLista() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply {
            listHandler = { page, _, _ ->
                if (page == 1) pagina("a1", hasMore = true) else AnalysesResult.Failure(AnalysesFailure.Server)
            }
        }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.loadMore()
        advanceUntilIdle()

        assertEquals(listOf("a1"), vm.state.value.items.map { it.id })
        assertEquals(AnalysesFailure.Server, vm.state.value.error)
        assertFalse(vm.state.value.loadingMore)
    }

    @Test
    fun refrescarConservaLaListaMientrasCarga() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply { listHandler = { _, _, _ -> pagina("a1") } }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.refresh()

        assertTrue(vm.state.value.refreshing)
        assertEquals(listOf("a1"), vm.state.value.items.map { it.id })
        advanceUntilIdle()
        assertFalse(vm.state.value.refreshing)
    }

    @Test
    fun alVolverALaPantallaSoloRefrescaSiYaCargo() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)

        vm.onResumed() // aún cargando la primera página
        advanceUntilIdle()
        assertEquals(1, repo.listCalls.size)

        vm.onResumed()
        advanceUntilIdle()
        assertEquals(2, repo.listCalls.size)
    }

    @Test
    fun siLosCamposFallanLaListaSigueSinFiltroDeCampo() = runTest(dispatcher) {
        val vm = vm(FakeAnalysesRepository(), campos = CamposResult.Failure)
        advanceUntilIdle()

        assertTrue(vm.state.value.campos.isEmpty())
        assertNull(vm.state.value.error)
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*HistoryViewModelTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: HistoryViewModel`).

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.feature.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.AnalysesRepository
import com.rubusai.app.core.data.analyses.AnalysesResult
import com.rubusai.app.core.data.campos.CamposRepository
import com.rubusai.app.core.data.campos.CamposResult
import com.rubusai.app.core.model.Analysis
import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.model.EstadoFiltro
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

internal const val HISTORY_PAGE_SIZE = 20

internal data class HistoryUiState(
    val items: List<Analysis> = emptyList(),
    val estado: EstadoFiltro = EstadoFiltro.Pendiente,
    val campoId: String? = null,
    val campos: List<Campo> = emptyList(),
    /** Primera carga (o cambio de filtro): la lista aún no tiene nada que mostrar. */
    val loading: Boolean = true,
    /** Recarga con la lista anterior a la vista. */
    val refreshing: Boolean = false,
    val loadingMore: Boolean = false,
    val hasMore: Boolean = false,
    val error: AnalysesFailure? = null,
)

internal class HistoryViewModel(
    private val analyses: AnalysesRepository,
    private val campos: CamposRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(HistoryUiState())
    val state: StateFlow<HistoryUiState> = _state.asStateFlow()

    private var page = 1
    private var job: Job? = null

    init {
        loadCampos()
        reload(initial = true)
    }

    fun onEstado(estado: EstadoFiltro) {
        if (estado == _state.value.estado) return
        _state.update { it.copy(estado = estado) }
        reload(initial = true)
    }

    fun onCampo(campoId: String?) {
        if (campoId == _state.value.campoId) return
        _state.update { it.copy(campoId = campoId) }
        reload(initial = true)
    }

    fun retry() = reload(initial = true)

    fun refresh() = reload(initial = false)

    /** Al volver a la pantalla (p. ej. tras validar un análisis) la lista se refresca, salvo en la primera carga. */
    fun onResumed() {
        val s = _state.value
        if (!s.loading && !s.refreshing && job?.isActive != true) reload(initial = false)
    }

    fun loadMore() {
        val s = _state.value
        if (!s.hasMore || s.loadingMore || s.loading || s.refreshing) return
        _state.update { it.copy(loadingMore = true, error = null) }
        job = viewModelScope.launch {
            when (val r = analyses.list(page + 1, HISTORY_PAGE_SIZE, s.estado, s.campoId)) {
                is AnalysesResult.Success -> {
                    page += 1
                    _state.update {
                        it.copy(items = it.items + r.value.items, hasMore = r.value.hasMore, loadingMore = false)
                    }
                }
                is AnalysesResult.Failure -> _state.update { it.copy(loadingMore = false, error = r.reason) }
            }
        }
    }

    private fun reload(initial: Boolean) {
        job?.cancel()
        _state.update {
            it.copy(
                loading = initial,
                refreshing = !initial,
                loadingMore = false,
                error = null,
                items = if (initial) emptyList() else it.items,
            )
        }
        job = viewModelScope.launch {
            val s = _state.value
            when (val r = analyses.list(1, HISTORY_PAGE_SIZE, s.estado, s.campoId)) {
                is AnalysesResult.Success -> {
                    page = 1
                    _state.update {
                        it.copy(items = r.value.items, hasMore = r.value.hasMore, loading = false, refreshing = false)
                    }
                }
                is AnalysesResult.Failure ->
                    _state.update { it.copy(loading = false, refreshing = false, error = r.reason) }
            }
        }
    }

    // Sin campos la lista sigue funcionando, solo sin el filtro por campo.
    private fun loadCampos() {
        viewModelScope.launch {
            (campos.list() as? CamposResult.Success)?.let { r -> _state.update { it.copy(campos = r.campos) } }
        }
    }
}
```

- [ ] **Step 4: Registrar en Koin**

En `analysesModule()` añade `viewModel { HistoryViewModel(analyses = get(), campos = get()) }` y el import `com.rubusai.app.feature.history.HistoryViewModel`.

- [ ] **Step 5: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*HistoryViewModelTest*' --console=plain`
Expected: PASS (11 tests).

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): HistoryViewModel con filtros, paginación y refresco"
```

---

### Task 7: `HistoryScreen`, entrada desde Home y navegación

**Files:**
- Create: `MAIN/feature/history/HistoryScreen.kt`
- Modify: `MAIN/feature/home/HomeScreen.kt`
- Modify: `MAIN/core/navigation/RubusNavHost.kt`
- Modify: `TEST/core/di/KoinGraphTest.kt`
- Test: `HOST/feature/history/HistoryScreenTest.kt`
- Test: `HOST/feature/home/HomeScreenTest.kt` (existe; añade casos)

- [ ] **Step 1: Escribir el test de UI que falla**

`HOST/feature/history/HistoryScreenTest.kt`:

```kotlin
package com.rubusai.app.feature.history

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.analisis
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.model.EstadoFiltro
import com.rubusai.app.core.model.ValidacionEstado
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class HistoryScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    private fun show(
        state: HistoryUiState,
        onEstado: (EstadoFiltro) -> Unit = {},
        onOpen: (String) -> Unit = {},
        onRetry: () -> Unit = {},
        onLoadMore: () -> Unit = {},
    ) = rule.setContent {
        RubusTheme {
            HistoryScreen(state, onEstado, {}, onOpen, onLoadMore, {}, onRetry, onBack = {})
        }
    }

    @Test
    fun muestraCadaAnalisisConSuCampoYEstado() {
        show(HistoryUiState(items = listOf(analisis("a1", ValidacionEstado.Validado)), loading = false))

        awaitText("Norte")
        awaitText("Validado")
    }

    @Test
    fun tocarUnaFilaAvisaConElId() {
        var abierto: String? = null
        show(HistoryUiState(items = listOf(analisis("a7")), loading = false), onOpen = { abierto = it })
        awaitText("Norte")

        rule.onNodeWithText("Norte").performClick()

        assertEquals("a7", abierto)
    }

    @Test
    fun elegirUnFiltroAvisaConElEstado() {
        var estado: EstadoFiltro? = null
        show(HistoryUiState(loading = false), onEstado = { estado = it })
        awaitText("Validados")

        rule.onNodeWithText("Validados").performClick()

        assertEquals(EstadoFiltro.Validado, estado)
    }

    @Test
    fun sinResultadosDiceQueNoHayAnalisis() {
        show(HistoryUiState(loading = false))

        awaitText("No hay análisis con estos filtros.")
    }

    @Test
    fun unFalloSinListaMuestraElErrorYReintenta() {
        var reintentos = 0
        show(HistoryUiState(loading = false, error = AnalysesFailure.Network), onRetry = { reintentos++ })
        awaitText("Sin conexión con el servidor. Reintenta.")

        rule.onNodeWithText("REINTENTAR", ignoreCase = true).performClick()

        assertEquals(1, reintentos)
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*HistoryScreenTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: HistoryScreen`).

- [ ] **Step 3: Implementar la pantalla**

`MAIN/feature/history/HistoryScreen.kt`:

```kotlin
package com.rubusai.app.feature.history

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusCard
import com.rubusai.app.core.designsystem.component.RubusErrorState
import com.rubusai.app.core.designsystem.component.RubusLoadingState
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.model.Analysis
import com.rubusai.app.core.model.EstadoFiltro
import com.rubusai.app.feature.results.label
import com.rubusai.app.feature.results.message
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.common_back
import com.rubusai.app.resources.common_retry
import com.rubusai.app.resources.history_empty
import com.rubusai.app.resources.history_filter_campo_todos
import com.rubusai.app.resources.history_filter_pendiente
import com.rubusai.app.resources.history_filter_rechazado
import com.rubusai.app.resources.history_filter_todos
import com.rubusai.app.resources.history_filter_validado
import com.rubusai.app.resources.history_load_more_failed
import com.rubusai.app.resources.history_row_total
import com.rubusai.app.resources.history_title
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel

@Composable
internal fun HistoryRoute(onBack: () -> Unit, onOpen: (String) -> Unit) {
    val viewModel = koinViewModel<HistoryViewModel>()
    val state by viewModel.state.collectAsStateWithLifecycle()
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.onResumed() }
    HistoryScreen(
        state = state,
        onEstado = viewModel::onEstado,
        onCampo = viewModel::onCampo,
        onOpen = onOpen,
        onLoadMore = viewModel::loadMore,
        onRefresh = viewModel::refresh,
        onRetry = viewModel::retry,
        onBack = onBack,
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
internal fun HistoryScreen(
    state: HistoryUiState,
    onEstado: (EstadoFiltro) -> Unit,
    onCampo: (String?) -> Unit,
    onOpen: (String) -> Unit,
    onLoadMore: () -> Unit,
    onRefresh: () -> Unit,
    onRetry: () -> Unit,
    onBack: () -> Unit,
    modifier: Modifier = Modifier,
) {
    RubusScreen(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.Start,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            RubusButton(text = stringResource(Res.string.common_back), onClick = onBack, variant = RubusButtonVariant.Outline)
            Text(text = stringResource(Res.string.history_title), style = MaterialTheme.typography.headlineMedium)
        }
        EstadoChips(state.estado, onEstado)
        if (state.campos.isNotEmpty()) CampoChips(state, onCampo)

        when {
            state.loading -> RubusLoadingState(Modifier.fillMaxWidth())
            state.items.isEmpty() && state.error != null -> RubusErrorState(
                message = state.error.message(),
                modifier = Modifier.fillMaxWidth(),
                retryLabel = stringResource(Res.string.common_retry),
                onRetry = onRetry,
            )
            state.items.isEmpty() -> Text(
                text = stringResource(Res.string.history_empty),
                style = MaterialTheme.typography.bodyLarge,
            )
            else -> PullToRefreshBox(isRefreshing = state.refreshing, onRefresh = onRefresh, modifier = Modifier.fillMaxSize()) {
                AnalysisList(state, onOpen, onLoadMore)
            }
        }
    }
}

@Composable
private fun EstadoChips(selected: EstadoFiltro, onEstado: (EstadoFiltro) -> Unit) {
    val labels = mapOf(
        EstadoFiltro.Pendiente to stringResource(Res.string.history_filter_pendiente),
        EstadoFiltro.Validado to stringResource(Res.string.history_filter_validado),
        EstadoFiltro.Rechazado to stringResource(Res.string.history_filter_rechazado),
        EstadoFiltro.Todos to stringResource(Res.string.history_filter_todos),
    )
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        items(EstadoFiltro.entries) { estado ->
            FilterChip(selected = estado == selected, onClick = { onEstado(estado) }, label = { Text(labels.getValue(estado)) })
        }
    }
}

@Composable
private fun CampoChips(state: HistoryUiState, onCampo: (String?) -> Unit) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        item {
            FilterChip(
                selected = state.campoId == null,
                onClick = { onCampo(null) },
                label = { Text(stringResource(Res.string.history_filter_campo_todos)) },
            )
        }
        items(state.campos, key = { it.id }) { campo ->
            FilterChip(selected = state.campoId == campo.id, onClick = { onCampo(campo.id) }, label = { Text(campo.nombre) })
        }
    }
}

@Composable
private fun AnalysisList(state: HistoryUiState, onOpen: (String) -> Unit, onLoadMore: () -> Unit) {
    val listState = rememberLazyListState()
    // Pide la siguiente página al acercarse a los últimos elementos.
    LaunchedEffect(listState, state.items.size) {
        snapshotFlow { listState.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0 }
            .collect { last -> if (last >= state.items.size - 3) onLoadMore() }
    }
    LazyColumn(state = listState, verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxSize()) {
        items(state.items, key = { it.id }) { AnalysisRow(it, onOpen) }
        if (state.error != null) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = stringResource(Res.string.history_load_more_failed),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    RubusButton(
                        text = stringResource(Res.string.common_retry),
                        onClick = onLoadMore,
                        variant = RubusButtonVariant.Secondary,
                    )
                }
            }
        }
    }
}

@Composable
private fun AnalysisRow(analysis: Analysis, onOpen: (String) -> Unit) {
    RubusCard(modifier = Modifier.fillMaxWidth(), onClick = { onOpen(analysis.id) }) {
        Text(text = analysis.campoNombre ?: "—", style = MaterialTheme.typography.titleMedium)
        // shortcut: se muestra solo la fecha (yyyy-MM-dd) sin pasar a la zona horaria local; mejorar si se pide hora.
        Text(text = analysis.fechaAnalisis?.take(10) ?: "—", style = MaterialTheme.typography.bodyMedium)
        Text(text = analysis.estado.label(), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.primary)
        Text(
            text = stringResource(Res.string.history_row_total, analysis.totalElementos),
            style = MaterialTheme.typography.bodySmall,
        )
    }
}
```

Si `PullToRefreshBox` no existe en `material3 1.12.0-alpha03` para multiplataforma, sustituye ese bloque por `AnalysisList(...)` directo y añade junto a los chips un `RubusButton` «Actualizar» que llame a `onRefresh`; anótalo en el commit.

- [ ] **Step 4: Entrada desde Home**

En `MAIN/feature/home/HomeScreen.kt`:

1. Añade al final de `HomeRoute(...)` el parámetro `onHistory: () -> Unit` y pásalo: `onHistory = onHistory.takeIf { user?.role != null && user.role != UserRole.MONITOR }` (con `val user = (sessionState as? SessionState.Authenticated)?.user` calculado antes y reutilizado en `user = user`). Importa `com.rubusai.app.core.model.UserRole`.
2. En `HomeScreen(...)` añade el parámetro `onHistory: (() -> Unit)? = null` y, después del botón Capturar:

```kotlin
        onHistory?.let {
            RubusButton(
                text = stringResource(Res.string.home_history),
                onClick = it,
                enabled = !loggingOut,
                variant = RubusButtonVariant.Secondary,
            )
        }
```

con el import `com.rubusai.app.resources.home_history`.

- [ ] **Step 5: Navegación**

En `MAIN/core/navigation/RubusNavHost.kt` añade los imports `com.rubusai.app.feature.history.HistoryRoute`, y:

- en `composable<Route.Home>`, pasa `onHistory = { navController.navigate(Route.History) { launchSingleTop = true } }` a `HomeRoute`.
- sustituye `composable<Route.History> { Marcador("History") }` por:

```kotlin
        composable<Route.History> { entry ->
            val resumed = { entry.lifecycle.currentState == Lifecycle.State.RESUMED }
            HistoryRoute(
                onBack = { if (resumed()) navController.popBackStack() },
                onOpen = { id -> if (resumed()) navController.navigate(Route.Result(id)) { launchSingleTop = true } },
            )
        }
```

- [ ] **Step 6: Tests de Home y del grafo**

En `HOST/feature/home/HomeScreenTest.kt` añade (adapta a cómo el archivo construye `HomeScreen`; usa un `User` de prueba):

```kotlin
    @Test
    fun conOnHistoryMuestraElBotonDeAnalisisYAvisa() {
        var abierto = false
        rule.setContent {
            RubusTheme {
                HomeScreen(user = null, loggingOut = false, onLogout = {}, onHistory = { abierto = true })
            }
        }

        rule.onNodeWithText("ANÁLISIS", ignoreCase = true).performClick()

        assertTrue(abierto)
    }

    @Test
    fun sinOnHistoryNoHayBotonDeAnalisis() {
        rule.setContent { RubusTheme { HomeScreen(user = null, loggingOut = false, onLogout = {}) } }
        rule.waitForIdle()

        rule.onAllNodesWithText("ANÁLISIS", ignoreCase = true).assertCountEquals(0)
    }
```

(importa `assertCountEquals`, `onAllNodesWithText`, `performClick`, `assertTrue` si faltan.) En `KoinGraphTest` añade al test del repositorio de análisis una segunda comprobación, o un test nuevo, que resuelva el ViewModel con `Dispatchers.setMain(StandardTestDispatcher())` (igual que `elGrafoResuelveElViewModelDeAvisos`):

```kotlin
            app.koin.get<HistoryViewModel>()
```

con el import `com.rubusai.app.feature.history.HistoryViewModel`.

- [ ] **Step 7: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`. Si `RubusNavHostTest` falla porque Home ahora necesita algo, adáptalo sin cambiar lo que comprueba.

- [ ] **Step 8: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): lista de análisis con filtros, entrada desde Home y navegación"
```

---

### Task 8: `ResultViewModel`

**Files:**
- Create: `MAIN/feature/results/ResultViewModel.kt`
- Test: `TEST/feature/results/ResultViewModelTest.kt`
- Modify: `MAIN/core/di/AppModule.kt`

- [ ] **Step 1: Escribir el test que falla**

El rol sale del `SessionManager` real armado con fakes (igual que `AvisoViewModelTest`). Construye el ViewModel **antes** de cualquier `advanceUntilIdle` que no sea el propio del test: el rol se lee al crearlo.

```kotlin
package com.rubusai.app.feature.results

import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.AnalysesResult
import com.rubusai.app.core.data.analyses.FakeAnalysesRepository
import com.rubusai.app.core.data.analyses.analisis
import com.rubusai.app.core.data.analyses.deteccion
import com.rubusai.app.core.data.analyses.imagenDePrueba
import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.TOKENS
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.model.ValidacionAccion
import com.rubusai.app.core.model.ValidacionEstado
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
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
class ResultViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private suspend fun session(role: UserRole): SessionManager {
        val manager = SessionManager(
            FakeAuthRepository(),
            InMemoryTokenStorage(TOKENS),
            InMemoryUserStorage(ana.copy(role = role)),
            SessionEvents(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        manager.start()
        return manager
    }

    private suspend fun vm(repo: FakeAnalysesRepository, role: UserRole = UserRole.AGRONOMO) =
        ResultViewModel("a1", repo, session(role))

    @Test
    fun unAgronomoCargaDetalleImagenYDetecciones() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply {
            detectionsResult = AnalysesResult.Success(listOf(deteccion("d1")))
        }
        val vm = vm(repo)
        advanceUntilIdle()

        val s = vm.state.value
        assertIs<ResultLoad.Loaded>(s.load)
        assertEquals(ResultImage.Loaded(imagenDePrueba), s.image)
        assertEquals(listOf("d1"), s.detections.map { it.id })
        assertTrue(s.canReview)
    }

    @Test
    fun unProductorNoPideImagenNiDetecciones() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo, UserRole.PRODUCTOR)
        advanceUntilIdle()

        assertEquals(ResultImage.NotAllowed, vm.state.value.image)
        assertFalse(vm.state.value.canReview)
        assertEquals(0, repo.imageCalls)
        assertEquals(0, repo.detectionsCalls)
        assertIs<ResultLoad.Loaded>(vm.state.value.load)
    }

    @Test
    fun unAnalisisInexistenteEsFallo() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply { getResult = AnalysesResult.Failure(AnalysesFailure.NotFound) }
        val vm = vm(repo)
        advanceUntilIdle()

        assertEquals(ResultLoad.Failed(AnalysesFailure.NotFound), vm.state.value.load)
        assertEquals(0, repo.imageCalls)
    }

    @Test
    fun validarMandaLaAccionYActualizaElEstado() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onValidate()
        advanceUntilIdle()

        assertEquals(listOf(ValidacionAccion.Validado to null), repo.validateCalls)
        val load = vm.state.value.load as ResultLoad.Loaded
        assertEquals(ValidacionEstado.Validado, load.analysis.estado)
        assertFalse(vm.state.value.submitting)
    }

    @Test
    fun rechazarMandaLasObservacionesSinEspacios() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onReject("  más maduro de lo detectado ")
        advanceUntilIdle()

        assertEquals(listOf(ValidacionAccion.Rechazado to "más maduro de lo detectado"), repo.validateCalls)
        val load = vm.state.value.load as ResultLoad.Loaded
        assertEquals(ValidacionEstado.Rechazado, load.analysis.estado)
        assertEquals("más maduro de lo detectado", load.analysis.observaciones)
    }

    @Test
    fun rechazarSinObservacionesNoLlamaAlServidor() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onReject("   ")
        advanceUntilIdle()

        assertTrue(repo.validateCalls.isEmpty())
    }

    @Test
    fun unFalloAlValidarSeMuestraYPermiteReintentar() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply { validateResult = AnalysesResult.Failure(AnalysesFailure.Network) }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onValidate()
        advanceUntilIdle()

        assertTrue(vm.state.value.actionFailed)
        assertFalse(vm.state.value.submitting)
        assertEquals(ValidacionEstado.Pendiente, (vm.state.value.load as ResultLoad.Loaded).analysis.estado)
    }

    @Test
    fun unAnalisisYaValidadoNoSePuedeValidarDeNuevo() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository().apply {
            getResult = AnalysesResult.Success(analisis(estado = ValidacionEstado.Validado))
        }
        val vm = vm(repo)
        advanceUntilIdle()

        vm.onValidate()
        advanceUntilIdle()

        assertTrue(repo.validateCalls.isEmpty())
        assertFalse(vm.state.value.canValidate)
    }

    @Test
    fun unProductorNoPuedeValidar() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo, UserRole.PRODUCTOR)
        advanceUntilIdle()

        vm.onValidate()
        advanceUntilIdle()

        assertTrue(repo.validateCalls.isEmpty())
    }

    @Test
    fun elPrimerErrorDeImagenPideUnaUrlNuevaYElSegundoEsFallo() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()
        assertEquals(1, repo.imageCalls)

        vm.onImageError()
        advanceUntilIdle()
        assertEquals(2, repo.imageCalls)
        assertIs<ResultImage.Loaded>(vm.state.value.image)

        vm.onImageError()
        advanceUntilIdle()
        assertEquals(ResultImage.Failed, vm.state.value.image)
        assertEquals(2, repo.imageCalls)
    }

    @Test
    fun reintentarLaImagenReiniciaElContadorDeErrores() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)
        advanceUntilIdle()
        vm.onImageError()
        advanceUntilIdle()
        vm.onImageError()
        advanceUntilIdle()

        vm.retryImage()
        advanceUntilIdle()
        vm.onImageError()
        advanceUntilIdle()

        assertIs<ResultImage.Loaded>(vm.state.value.image)
    }

    @Test
    fun refrescarDeteccionesSoloSiYaSeCargaronUnaVez() = runTest(dispatcher) {
        val repo = FakeAnalysesRepository()
        val vm = vm(repo)

        vm.refreshDetections() // aún cargando
        advanceUntilIdle()
        assertEquals(1, repo.detectionsCalls)

        vm.refreshDetections()
        advanceUntilIdle()
        assertEquals(2, repo.detectionsCalls)
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ResultViewModelTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: ResultViewModel`).

- [ ] **Step 3: Implementar**

```kotlin
package com.rubusai.app.feature.results

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.AnalysesRepository
import com.rubusai.app.core.data.analyses.AnalysesResult
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.model.Analysis
import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.Detection
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.model.ValidacionAccion
import com.rubusai.app.core.model.ValidacionEstado
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

internal sealed interface ResultLoad {
    data object Loading : ResultLoad
    data class Loaded(val analysis: Analysis) : ResultLoad
    data class Failed(val reason: AnalysesFailure) : ResultLoad
}

internal sealed interface ResultImage {
    /** El rol no tiene imagen (el servidor respondería 403): ni se pide. */
    data object NotAllowed : ResultImage
    data object Loading : ResultImage
    data class Loaded(val image: AnalysisImage) : ResultImage
    data object Failed : ResultImage
}

internal data class ResultUiState(
    val load: ResultLoad = ResultLoad.Loading,
    val image: ResultImage = ResultImage.Loading,
    val detections: List<Detection> = emptyList(),
    /** ADMIN y AGRONOMO: ven imagen y boxes y pueden validar y revisar. */
    val canReview: Boolean = false,
    val submitting: Boolean = false,
    val actionFailed: Boolean = false,
) {
    /** Solo un análisis pendiente se valida o rechaza. */
    val canValidate: Boolean
        get() = canReview && !submitting && (load as? ResultLoad.Loaded)?.analysis?.estado == ValidacionEstado.Pendiente
}

internal class ResultViewModel(
    private val id: String,
    private val analyses: AnalysesRepository,
    session: SessionManager,
) : ViewModel() {
    private val role = (session.state.value as? SessionState.Authenticated)?.user?.role
    private val canReview = role == UserRole.ADMIN || role == UserRole.AGRONOMO

    private val _state = MutableStateFlow(
        ResultUiState(image = if (canReview) ResultImage.Loading else ResultImage.NotAllowed, canReview = canReview),
    )
    val state: StateFlow<ResultUiState> = _state.asStateFlow()

    private var imageRetried = false
    private var detectionsLoaded = false

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(load = ResultLoad.Loading) }
        viewModelScope.launch {
            when (val r = analyses.get(id)) {
                is AnalysesResult.Failure -> _state.update { it.copy(load = ResultLoad.Failed(r.reason)) }
                is AnalysesResult.Success -> {
                    _state.update { it.copy(load = ResultLoad.Loaded(r.value)) }
                    if (canReview) {
                        coroutineScope {
                            launch { loadImage() }
                            launch { loadDetections() }
                        }
                    }
                }
            }
        }
    }

    /** Coil no pudo con la URL (probablemente caducó): se pide una nueva una vez; si vuelve a fallar, error. */
    fun onImageError() {
        if (imageRetried) {
            _state.update { it.copy(image = ResultImage.Failed) }
            return
        }
        imageRetried = true
        viewModelScope.launch { loadImage() }
    }

    fun retryImage() {
        imageRetried = false
        viewModelScope.launch { loadImage() }
    }

    /** Al volver de la revisión de boxes: las detecciones pudieron cambiar. */
    fun refreshDetections() {
        if (detectionsLoaded) viewModelScope.launch { loadDetections() }
    }

    fun onValidate() = submit(ValidacionAccion.Validado, null)

    fun onReject(observaciones: String) {
        val texto = observaciones.trim()
        if (texto.isEmpty()) return
        submit(ValidacionAccion.Rechazado, texto)
    }

    private fun submit(action: ValidacionAccion, observaciones: String?) {
        if (!_state.value.canValidate) return
        _state.update { it.copy(submitting = true, actionFailed = false) }
        viewModelScope.launch {
            when (analyses.validate(id, action, observaciones)) {
                is AnalysesResult.Success -> _state.update { s ->
                    val actual = (s.load as? ResultLoad.Loaded)?.analysis
                    s.copy(
                        submitting = false,
                        load = actual?.let {
                            ResultLoad.Loaded(
                                it.copy(
                                    estado = if (action == ValidacionAccion.Validado) ValidacionEstado.Validado else ValidacionEstado.Rechazado,
                                    observaciones = observaciones ?: it.observaciones,
                                ),
                            )
                        } ?: s.load,
                    )
                }
                is AnalysesResult.Failure -> _state.update { it.copy(submitting = false, actionFailed = true) }
            }
        }
    }

    private suspend fun loadImage() {
        _state.update { it.copy(image = ResultImage.Loading) }
        when (val r = analyses.imageUrl(id)) {
            is AnalysesResult.Success -> _state.update { it.copy(image = ResultImage.Loaded(r.value)) }
            is AnalysesResult.Failure -> _state.update { it.copy(image = ResultImage.Failed) }
        }
    }

    // Sin detecciones la imagen se ve igual, solo sin boxes.
    private suspend fun loadDetections() {
        (analyses.detections(id) as? AnalysesResult.Success)?.let { r ->
            detectionsLoaded = true
            _state.update { it.copy(detections = r.value) }
        }
    }
}
```

- [ ] **Step 4: Registrar en Koin**

En `analysesModule()` añade `viewModel { (id: String) -> ResultViewModel(id = id, analyses = get(), session = get()) }` y el import `com.rubusai.app.feature.results.ResultViewModel`.

- [ ] **Step 5: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ResultViewModelTest*' --console=plain`
Expected: PASS (12 tests). Si algún test de rol falla porque `FakeAuthRepository` cambia el usuario tras `start()`, deja `me = null` (el valor por defecto) y construye el ViewModel antes de otro `advanceUntilIdle`.

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): ResultViewModel con detalle, imagen, detecciones y validación"
```

---

### Task 9: `AnnotatedImage` y gestos de vista

**Files:**
- Create: `MAIN/feature/review/AnnotatedImage.kt`
- Create: `MAIN/feature/review/ViewportGestures.kt`

Esta tarea no tiene tests propios: es la capa de Compose sobre `Viewport` y se ejerce en las tareas 10 y 14 (UI) y en la prueba manual del teléfono.

- [ ] **Step 1: Dibujo de boxes e imagen**

`MAIN/feature/review/AnnotatedImage.kt`:

```kotlin
package com.rubusai.app.feature.review

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.BBox

/** Un box listo para dibujar. [selected] añade las cuatro asas; [dashed] marca el que se está dibujando. */
internal data class DrawnBox(
    val bbox: BBox,
    val color: Color,
    val selected: Boolean = false,
    val dashed: Boolean = false,
)

/**
 * La imagen (Coil, desde su URL firmada) con los [boxes] encima. Ambos se colocan con [viewport];
 * al medirse, el contenedor se comunica con [onViewportChange]. Los gestos los pone quien llama
 * en [modifier].
 */
@Composable
internal fun AnnotatedImage(
    image: AnalysisImage,
    boxes: List<DrawnBox>,
    viewport: Viewport,
    onViewportChange: (Viewport) -> Unit,
    onImageError: () -> Unit,
    contentDescription: String,
    modifier: Modifier = Modifier,
) {
    val current by rememberUpdatedState(viewport)
    Box(
        modifier = modifier
            .onSizeChanged { size -> onViewportChange(current.withContainer(size.width.toFloat(), size.height.toFloat())) }
            .clipToBounds(),
    ) {
        AsyncImage(
            model = image.url,
            contentDescription = contentDescription,
            contentScale = ContentScale.Fit,
            onError = { onImageError() },
            modifier = Modifier.fillMaxSize().graphicsLayer {
                scaleX = viewport.zoom
                scaleY = viewport.zoom
                translationX = viewport.panX
                translationY = viewport.panY
            },
        )
        Canvas(Modifier.fillMaxSize()) { boxes.forEach { drawBox(it, viewport) } }
    }
}

private fun DrawScope.drawBox(box: DrawnBox, viewport: Viewport) {
    val topLeft = Offset(viewport.toScreenX(box.bbox.x1), viewport.toScreenY(box.bbox.y1))
    val bottomRight = Offset(viewport.toScreenX(box.bbox.x2), viewport.toScreenY(box.bbox.y2))
    drawRect(
        color = box.color,
        topLeft = topLeft,
        size = Size(bottomRight.x - topLeft.x, bottomRight.y - topLeft.y),
        style = Stroke(
            width = (if (box.selected) 4.dp else 2.dp).toPx(),
            pathEffect = if (box.dashed) PathEffect.dashPathEffect(floatArrayOf(16f, 10f)) else null,
        ),
    )
    if (box.selected) {
        listOf(topLeft, Offset(bottomRight.x, topLeft.y), Offset(topLeft.x, bottomRight.y), bottomRight).forEach {
            drawCircle(Color.White, radius = 10.dp.toPx(), center = it)
            drawCircle(box.color, radius = 7.dp.toPx(), center = it)
        }
    }
}
```

- [ ] **Step 2: Gestos de dos dedos (y delegación de un dedo)**

`MAIN/feature/review/ViewportGestures.kt`:

```kotlin
package com.rubusai.app.feature.review

import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.calculateCentroid
import androidx.compose.foundation.gestures.calculatePan
import androidx.compose.foundation.gestures.calculateZoom
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.input.pointer.positionChanged

/** Gesto de un dedo que la pantalla quiere manejar (editar un box). Las posiciones son de pantalla. */
internal interface SingleFingerHandler {
    /** Devuelve `true` si toma el gesto; si no, el dedo no se consume (y puede hacer scroll). */
    fun onDown(x: Float, y: Float): Boolean
    fun onDrag(x: Float, y: Float)
    fun onUp(x: Float, y: Float)

    /** Entró un segundo dedo: el gesto de un dedo se descarta y se vuelve al estado previo. */
    fun onCancel()
}

/**
 * Dos dedos hacen zoom y desplazan la vista; un dedo se delega en [singleFinger] (o se ignora si es
 * `null`, de modo que un `verticalScroll` padre siga funcionando).
 */
@Composable
internal fun Modifier.viewportGestures(
    viewport: Viewport,
    onViewportChange: (Viewport) -> Unit,
    singleFinger: SingleFingerHandler? = null,
): Modifier {
    val currentViewport by rememberUpdatedState(viewport)
    val currentChange by rememberUpdatedState(onViewportChange)
    val currentHandler by rememberUpdatedState(singleFinger)
    return pointerInput(Unit) {
        awaitEachGesture {
            val down = awaitFirstDown(requireUnconsumed = false)
            val handler = currentHandler
            var owner = handler?.onDown(down.position.x, down.position.y) == true
            var multi = false
            do {
                val event = awaitPointerEvent(PointerEventPass.Main)
                val pressed = event.changes.count { it.pressed }
                if (pressed >= 2) {
                    if (owner) {
                        handler?.onCancel()
                        owner = false
                    }
                    multi = true
                    val centroid = event.calculateCentroid()
                    currentChange(
                        currentViewport.transform(
                            centroidX = centroid.x,
                            centroidY = centroid.y,
                            factor = event.calculateZoom(),
                            dx = event.calculatePan().x,
                            dy = event.calculatePan().y,
                        ),
                    )
                    event.changes.forEach { if (it.positionChanged()) it.consume() }
                } else if (owner && !multi) {
                    val change = event.changes.first()
                    if (change.pressed) {
                        handler?.onDrag(change.position.x, change.position.y)
                        change.consume()
                    } else {
                        handler?.onUp(change.position.x, change.position.y)
                        owner = false
                    }
                }
            } while (event.changes.any { it.pressed })
        }
    }
}
```

- [ ] **Step 3: Compilar**

Run: `./gradlew :shared:compileAndroidMain :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`. Si `awaitPointerEvent` pide el scope `AwaitPointerEventScope`, está disponible dentro de `awaitEachGesture`.

- [ ] **Step 4: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): imagen anotada con zoom y gestos de dos dedos"
```

---

### Task 10: `ResultScreen` y navegación al detalle

**Files:**
- Create: `MAIN/feature/results/ResultScreen.kt`
- Modify: `MAIN/core/navigation/RubusNavHost.kt`
- Modify: `TEST/core/di/KoinGraphTest.kt`
- Test: `HOST/feature/results/ResultScreenTest.kt`

- [ ] **Step 1: Escribir el test de UI que falla**

```kotlin
package com.rubusai.app.feature.results

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.analisis
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.model.ValidacionEstado
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ResultScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    private fun loaded(
        estado: ValidacionEstado = ValidacionEstado.Pendiente,
        canReview: Boolean = true,
        image: ResultImage = ResultImage.NotAllowed,
        actionFailed: Boolean = false,
    ) = ResultUiState(
        load = ResultLoad.Loaded(analisis(estado = estado)),
        image = image,
        canReview = canReview,
        actionFailed = actionFailed,
    )

    private fun show(
        state: ResultUiState,
        onValidate: () -> Unit = {},
        onReject: (String) -> Unit = {},
        onReview: () -> Unit = {},
        onRetry: () -> Unit = {},
    ) = rule.setContent {
        RubusTheme {
            ResultScreen(
                state = state,
                onBack = {},
                onReview = onReview,
                onRetry = onRetry,
                onRetryImage = {},
                onImageError = {},
                onValidate = onValidate,
                onReject = onReject,
            )
        }
    }

    @Test
    fun muestraLasMetricasYLasEtapas() {
        show(loaded())

        awaitText("Norte")
        awaitText("410.5")
        awaitText("maduro")
    }

    @Test
    fun unAgronomoVeLosTresBotones() {
        show(loaded())

        awaitText("Norte")
        rule.onNodeWithText("VALIDAR", ignoreCase = true)
        rule.onNodeWithText("RECHAZAR", ignoreCase = true)
        rule.onNodeWithText("REVISAR DETECCIONES", ignoreCase = true)
    }

    @Test
    fun unProductorNoVeBotonesNiImagen() {
        show(loaded(canReview = false))

        awaitText("La imagen no está disponible para tu rol.")
        rule.onAllNodesWithText("VALIDAR", ignoreCase = true).assertCountEquals(0)
        rule.onAllNodesWithText("RECHAZAR", ignoreCase = true).assertCountEquals(0)
        rule.onAllNodesWithText("REVISAR DETECCIONES", ignoreCase = true).assertCountEquals(0)
    }

    @Test
    fun validarPideConfirmacionYAvisa() {
        var validado = false
        show(loaded(), onValidate = { validado = true })
        awaitText("Norte")

        rule.onNodeWithText("VALIDAR", ignoreCase = true).performClick()
        awaitText("¿Validar este análisis?")
        rule.onNodeWithText("CONFIRMAR", ignoreCase = true).performClick()

        assertEquals(true, validado)
    }

    @Test
    fun rechazarExigeObservaciones() {
        var observaciones: String? = null
        show(loaded(), onReject = { observaciones = it })
        awaitText("Norte")

        rule.onNodeWithText("RECHAZAR", ignoreCase = true).performClick()
        awaitText("Rechazar análisis")
        rule.onNodeWithText("CONFIRMAR", ignoreCase = true).performClick()
        awaitText("Escribe las observaciones.")
        assertEquals(null, observaciones)

        rule.onNodeWithText("Observaciones").performTextInput("más maduro")
        rule.onNodeWithText("CONFIRMAR", ignoreCase = true).performClick()

        assertEquals("más maduro", observaciones)
    }

    @Test
    fun conElAnalisisYaValidadoLasAccionesEstanDeshabilitadas() {
        show(loaded(estado = ValidacionEstado.Validado))
        awaitText("Norte")

        rule.onNodeWithText("VALIDAR", ignoreCase = true).assertIsNotEnabled()
        rule.onNodeWithText("RECHAZAR", ignoreCase = true).assertIsNotEnabled()
        rule.onNodeWithText("REVISAR DETECCIONES", ignoreCase = true).performClick()
    }

    @Test
    fun revisarDeteccionesAvisa() {
        var abierto = false
        show(loaded(), onReview = { abierto = true })
        awaitText("Norte")

        rule.onNodeWithText("REVISAR DETECCIONES", ignoreCase = true).performClick()

        assertEquals(true, abierto)
    }

    @Test
    fun unFalloDeCargaMuestraElMensajeYReintenta() {
        var reintentos = 0
        show(ResultUiState(load = ResultLoad.Failed(AnalysesFailure.NotFound)), onRetry = { reintentos++ })
        awaitText("El análisis ya no existe.")

        rule.onNodeWithText("REINTENTAR", ignoreCase = true).performClick()

        assertEquals(1, reintentos)
    }

    @Test
    fun unFalloAlGuardarSeAvisa() {
        show(loaded(actionFailed = true))

        awaitText("No se pudo guardar. Reintenta.")
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ResultScreenTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: ResultScreen`).

- [ ] **Step 3: Implementar la pantalla**

`MAIN/feature/results/ResultScreen.kt`:

```kotlin
package com.rubusai.app.feature.results

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusErrorState
import com.rubusai.app.core.designsystem.component.RubusLoadingState
import com.rubusai.app.core.designsystem.component.RubusScreen
import com.rubusai.app.core.designsystem.component.RubusTextField
import com.rubusai.app.core.model.Analysis
import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.Detection
import com.rubusai.app.feature.review.AnnotatedImage
import com.rubusai.app.feature.review.DrawnBox
import com.rubusai.app.feature.review.Viewport
import com.rubusai.app.feature.review.viewportGestures
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.common_back
import com.rubusai.app.resources.common_cancel
import com.rubusai.app.resources.common_confirm
import com.rubusai.app.resources.common_retry
import com.rubusai.app.resources.result_action_failed
import com.rubusai.app.resources.result_campo
import com.rubusai.app.resources.result_enfermos
import com.rubusai.app.resources.result_estado
import com.rubusai.app.resources.result_etapas
import com.rubusai.app.resources.result_fecha
import com.rubusai.app.resources.result_image_description
import com.rubusai.app.resources.result_image_error
import com.rubusai.app.resources.result_image_unavailable
import com.rubusai.app.resources.result_merma
import com.rubusai.app.resources.result_observaciones
import com.rubusai.app.resources.result_peso
import com.rubusai.app.resources.result_reject
import com.rubusai.app.resources.result_reject_observaciones
import com.rubusai.app.resources.result_reject_observaciones_required
import com.rubusai.app.resources.result_reject_title
import com.rubusai.app.resources.result_review
import com.rubusai.app.resources.result_sanos
import com.rubusai.app.resources.result_title
import com.rubusai.app.resources.result_total
import com.rubusai.app.resources.result_validate
import com.rubusai.app.resources.result_validate_confirm_title
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

@Composable
internal fun ResultRoute(id: String, onBack: () -> Unit, onReview: () -> Unit) {
    val viewModel = koinViewModel<ResultViewModel>(parameters = { parametersOf(id) })
    val state by viewModel.state.collectAsStateWithLifecycle()
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) { viewModel.refreshDetections() }
    ResultScreen(
        state = state,
        onBack = onBack,
        onReview = onReview,
        onRetry = viewModel::load,
        onRetryImage = viewModel::retryImage,
        onImageError = viewModel::onImageError,
        onValidate = viewModel::onValidate,
        onReject = viewModel::onReject,
    )
}

@Composable
internal fun ResultScreen(
    state: ResultUiState,
    onBack: () -> Unit,
    onReview: () -> Unit,
    onRetry: () -> Unit,
    onRetryImage: () -> Unit,
    onImageError: () -> Unit,
    onValidate: () -> Unit,
    onReject: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    RubusScreen(
        modifier = modifier,
        scrollable = true,
        verticalArrangement = Arrangement.spacedBy(12.dp),
        horizontalAlignment = Alignment.Start,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            RubusButton(text = stringResource(Res.string.common_back), onClick = onBack, variant = RubusButtonVariant.Outline)
            Text(text = stringResource(Res.string.result_title), style = MaterialTheme.typography.headlineMedium)
        }
        when (val load = state.load) {
            ResultLoad.Loading -> RubusLoadingState(Modifier.fillMaxWidth())
            is ResultLoad.Failed -> RubusErrorState(
                message = load.reason.message(),
                modifier = Modifier.fillMaxWidth(),
                retryLabel = stringResource(Res.string.common_retry),
                onRetry = onRetry,
            )
            is ResultLoad.Loaded -> ResultContent(load.analysis, state, onReview, onRetryImage, onImageError, onValidate, onReject)
        }
    }
}

@Composable
private fun ResultContent(
    analysis: Analysis,
    state: ResultUiState,
    onReview: () -> Unit,
    onRetryImage: () -> Unit,
    onImageError: () -> Unit,
    onValidate: () -> Unit,
    onReject: (String) -> Unit,
) {
    ImageSection(state.image, state.detections, onRetryImage, onImageError)
    Metric(stringResource(Res.string.result_campo), analysis.campoNombre ?: "—")
    // shortcut: solo la fecha (yyyy-MM-dd), sin zona horaria local.
    Metric(stringResource(Res.string.result_fecha), analysis.fechaAnalisis?.take(10) ?: "—")
    Metric(stringResource(Res.string.result_estado), analysis.estado.label())
    analysis.observaciones?.takeIf { it.isNotBlank() }?.let { Metric(stringResource(Res.string.result_observaciones), it) }
    Metric(stringResource(Res.string.result_total), analysis.totalElementos.toString())
    Metric(stringResource(Res.string.result_sanos), analysis.elementosSanos.toString())
    Metric(stringResource(Res.string.result_enfermos), analysis.elementosEnfermos.toString())
    Metric(stringResource(Res.string.result_merma), "${analysis.mermaPorcentaje}%")
    Metric(stringResource(Res.string.result_peso), analysis.pesoSanoGramos.toString())
    if (analysis.etapas.isNotEmpty()) {
        Text(text = stringResource(Res.string.result_etapas), style = MaterialTheme.typography.titleMedium)
        analysis.etapas.forEach { Metric(it.etapa, it.cantidad.toString()) }
    }

    if (state.actionFailed) {
        Text(
            text = stringResource(Res.string.result_action_failed),
            color = MaterialTheme.colorScheme.error,
            style = MaterialTheme.typography.bodyMedium,
        )
    }
    if (state.canReview) Actions(state, onReview, onValidate, onReject)
}

@Composable
private fun Metric(label: String, value: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(text = "$label:", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(text = value, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun ImageSection(image: ResultImage, detections: List<Detection>, onRetryImage: () -> Unit, onImageError: () -> Unit) {
    when (image) {
        ResultImage.NotAllowed -> Text(
            text = stringResource(Res.string.result_image_unavailable),
            style = MaterialTheme.typography.bodyMedium,
        )
        ResultImage.Loading -> RubusLoadingState(Modifier.fillMaxWidth().height(240.dp))
        ResultImage.Failed -> RubusErrorState(
            message = stringResource(Res.string.result_image_error),
            modifier = Modifier.fillMaxWidth(),
            retryLabel = stringResource(Res.string.common_retry),
            onRetry = onRetryImage,
        )
        is ResultImage.Loaded -> ReadOnlyImage(image.image, detections, onImageError)
    }
}

@Composable
private fun ReadOnlyImage(image: AnalysisImage, detections: List<Detection>, onImageError: () -> Unit) {
    var viewport by remember(image) { mutableStateOf(Viewport.initial(image)) }
    val boxes = remember(detections) { detections.map { DrawnBox(it.bbox, etapaColor(it.etapa)) } }
    AnnotatedImage(
        image = image,
        boxes = boxes,
        viewport = viewport,
        onViewportChange = { viewport = it },
        onImageError = onImageError,
        contentDescription = stringResource(Res.string.result_image_description),
        // Sin manejador de un dedo: el scroll de la pantalla sigue funcionando; el zoom es con dos dedos.
        modifier = Modifier.fillMaxWidth().height(320.dp).viewportGestures(viewport, { viewport = it }),
    )
}

@Composable
private fun Actions(state: ResultUiState, onReview: () -> Unit, onValidate: () -> Unit, onReject: (String) -> Unit) {
    var confirmValidate by rememberSaveable { mutableStateOf(false) }
    var rejecting by rememberSaveable { mutableStateOf(false) }

    RubusButton(
        text = stringResource(Res.string.result_validate),
        onClick = { confirmValidate = true },
        enabled = state.canValidate,
        modifier = Modifier.fillMaxWidth(),
    )
    RubusButton(
        text = stringResource(Res.string.result_reject),
        onClick = { rejecting = true },
        enabled = state.canValidate,
        variant = RubusButtonVariant.Danger,
        modifier = Modifier.fillMaxWidth(),
    )
    RubusButton(
        text = stringResource(Res.string.result_review),
        onClick = onReview,
        variant = RubusButtonVariant.Secondary,
        modifier = Modifier.fillMaxWidth(),
    )

    if (confirmValidate) {
        AlertDialog(
            onDismissRequest = { confirmValidate = false },
            title = { Text(stringResource(Res.string.result_validate_confirm_title)) },
            confirmButton = {
                TextButton(onClick = { confirmValidate = false; onValidate() }) {
                    Text(stringResource(Res.string.common_confirm).uppercase())
                }
            },
            dismissButton = {
                TextButton(onClick = { confirmValidate = false }) { Text(stringResource(Res.string.common_cancel).uppercase()) }
            },
        )
    }
    if (rejecting) RejectDialog(onDismiss = { rejecting = false }, onConfirm = { rejecting = false; onReject(it) })
}

@Composable
private fun RejectDialog(onDismiss: () -> Unit, onConfirm: (String) -> Unit) {
    var texto by rememberSaveable { mutableStateOf("") }
    var intento by rememberSaveable { mutableStateOf(false) }
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(Res.string.result_reject_title)) },
        text = {
            RubusTextField(
                value = texto,
                onValueChange = { texto = it },
                label = stringResource(Res.string.result_reject_observaciones),
                errorText = if (intento && texto.isBlank()) stringResource(Res.string.result_reject_observaciones_required) else null,
            )
        },
        confirmButton = {
            TextButton(onClick = {
                intento = true
                if (texto.isNotBlank()) onConfirm(texto)
            }) { Text(stringResource(Res.string.common_confirm).uppercase()) }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text(stringResource(Res.string.common_cancel).uppercase()) } },
    )
}
```

Nota: las pruebas buscan los botones con `ignoreCase = true` porque `RubusButton` muestra el texto en mayúsculas; los `TextButton` de los diálogos usan `.uppercase()` por la misma razón.

- [ ] **Step 4: Navegación**

En `MAIN/core/navigation/RubusNavHost.kt` importa `com.rubusai.app.feature.results.ResultRoute` y sustituye el destino de `Route.Result` por:

```kotlin
        composable<Route.Result> { entry ->
            val resumed = { entry.lifecycle.currentState == Lifecycle.State.RESUMED }
            val id = entry.toRoute<Route.Result>().id
            ResultRoute(
                id = id,
                onBack = { if (resumed()) navController.popBackStack() },
                onReview = { if (resumed()) navController.navigate(Route.Review(id)) { launchSingleTop = true } },
            )
        }
```

Esto no compila hasta que exista `Route.Review`: añádela ahora en `MAIN/core/navigation/Route.kt`, justo después de `Result`:

```kotlin
    @Serializable data class Review(val id: String) : Route
```

con `Route.Review::class` en `migratedRoutes` justo después de `Route.Result::class`, y el mismo orden en `migradas` de `TEST/core/navigation/RoutesTest.kt`. Añade también, de forma provisional, `composable<Route.Review> { entry -> Marcador("Review ${entry.toRoute<Route.Review>().id}") }` tras el de `Result` (la Tarea 14 lo sustituye).

- [ ] **Step 5: Grafo Koin**

En `KoinGraphTest` añade el test `elGrafoResuelveElViewModelDeResultado` (igual que el de avisos, con `Dispatchers.setMain(StandardTestDispatcher())`) que haga `app.koin.get<ResultViewModel> { parametersOf("a1") }`; imports `org.koin.core.parameter.parametersOf` y `com.rubusai.app.feature.results.ResultViewModel`.

- [ ] **Step 6: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, `ResultScreenTest` en verde. En Robolectric `AsyncImage` intentará descargar la URL de prueba y fallará en silencio: los tests de arriba no cargan imagen (`ResultImage.NotAllowed`), así que no se ve afectado.

- [ ] **Step 7: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): pantalla de detalle con imagen, validar y rechazar"
```

---

### Task 11: Acción «Ver» del aviso

**Files:**
- Modify: `MAIN/feature/aviso/AvisoViewModel.kt`
- Modify: `MAIN/feature/aviso/AvisoHost.kt`
- Modify: `MAIN/App.kt`
- Modify: `TEST/feature/aviso/AvisoViewModelTest.kt`
- Modify: `HOST/feature/aviso/AvisoSnackbarTest.kt`

- [ ] **Step 1: Actualizar los tests (fallan al compilar)**

En `TEST/feature/aviso/AvisoViewModelTest.kt`: `Aviso` pasa a llevar el id del análisis. Cambia las aserciones:
- `assertEquals(Aviso(id = 1), vm.aviso.value)` → `assertEquals(Aviso(id = 1, analisisId = "a1"), vm.aviso.value)`
- `assertEquals(Aviso(id = 2), vm.aviso.value)` (en los dos tests que lo usan) → `assertEquals(Aviso(id = 2, analisisId = "a2"), vm.aviso.value)`.

En `HOST/feature/aviso/AvisoSnackbarTest.kt`: cada `AvisoSnackbar(aviso = Aviso(n), onMostrado = …)` pasa a `AvisoSnackbar(aviso = Aviso(n, "a$n"), onVer = {}, onMostrado = …)`, y añade:

```kotlin
    @Test
    fun pulsarVerNavegaAlAnalisisDelAviso() {
        val vistos = mutableListOf<String>()
        rule.setContent {
            RubusTheme { AvisoSnackbar(aviso = Aviso(3, "analisis-9"), onVer = { vistos += it }, onMostrado = {}) }
        }
        rule.waitUntilAtLeastOneExists(hasText("¡Análisis listo!"), timeoutMillis = 5_000)

        rule.onNodeWithText("VER", ignoreCase = true).performClick()
        rule.waitForIdle()

        assertEquals(listOf("analisis-9"), vistos)
    }
```

(importa `onNodeWithText` y `performClick`.) El texto del botón del snackbar es el de `actionLabel`; si Material lo muestra tal cual («Ver») usa `onNodeWithText("Ver")`.

Run: `./gradlew :shared:testAndroidHostTest --tests '*Aviso*' --console=plain`
Expected: FAIL de compilación (`No value passed for parameter 'analisisId'`).

- [ ] **Step 2: Implementar**

`MAIN/feature/aviso/AvisoViewModel.kt`: cambia la clase y la creación del aviso:

```kotlin
/** Aviso global «¡Análisis listo!». El [id] crece con cada aviso: dos seguidos son distintos para la UI. */
internal data class Aviso(val id: Long, val analisisId: String)
```

y `_aviso.value = Aviso(++contador, evento.analisisId)`.

`MAIN/feature/aviso/AvisoHost.kt`: sustituye el contenido por

```kotlin
@Composable
internal fun AvisoHost(onVer: (String) -> Unit) {
    val viewModel = koinViewModel<AvisoViewModel>()
    val aviso by viewModel.aviso.collectAsStateWithLifecycle()
    AvisoSnackbar(aviso = aviso, onVer = onVer, onMostrado = viewModel::onAvisoMostrado)
}

/**
 * Muestra «¡Análisis listo!» con la acción «Ver» por cada [aviso] nuevo y avisa con [onMostrado] cuando
 * termina. Un aviso nuevo cancela el anterior: queda el último. La capa no captura toques salvo el botón.
 */
@Composable
internal fun AvisoSnackbar(
    aviso: Aviso?,
    onVer: (String) -> Unit,
    onMostrado: (Long) -> Unit,
    modifier: Modifier = Modifier,
) {
    val state = remember { SnackbarHostState() }
    val texto = stringResource(Res.string.aviso_analisis_listo)
    val ver = stringResource(Res.string.aviso_ver)

    LaunchedEffect(aviso?.id) {
        val actual = aviso ?: return@LaunchedEffect
        try {
            // Con acción, Material usaría Indefinite por defecto: se fija Short para que se vaya solo.
            val result = state.showSnackbar(message = texto, actionLabel = ver, duration = SnackbarDuration.Short)
            if (result == SnackbarResult.ActionPerformed) onVer(actual.analisisId)
        } finally {
            onMostrado(actual.id)
        }
    }

    Box(modifier = modifier.fillMaxSize().safeDrawingPadding()) {
        SnackbarHost(hostState = state, modifier = Modifier.align(Alignment.BottomCenter))
    }
}
```

(conserva los imports existentes y añade `SnackbarDuration`, `SnackbarResult` y `com.rubusai.app.resources.aviso_ver`.)

`MAIN/App.kt`: eleva el `NavController` para que el aviso pueda navegar. Importa `androidx.navigation.compose.rememberNavController` y `com.rubusai.app.core.navigation.Route`; dentro de `App()`, antes de `RubusTheme`, añade `val navController = rememberNavController()`; y cambia el contenido del `Box`:

```kotlin
            RubusNavHost(
                environment = envConfig.environment,
                sessionState = sessionState,
                navController = navController,
            )
            AvisoHost(onVer = { id -> navController.navigate(Route.Result(id)) { launchSingleTop = true } })
```

- [ ] **Step 3: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`. Si el aviso llega antes de que el grafo de navegación exista (`navigate` lanza `IllegalArgumentException: Navigation graph has not been set`), no puede ocurrir con sesión `Authenticated` porque `RubusNavHost` ya compuso el `NavHost`; si aun así se observa, envuelve la llamada en la comprobación `runCatching`.

- [ ] **Step 4: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): el aviso de análisis listo ofrece abrir el resultado"
```

---

### Task 12: `ReviewViewModel`

**Files:**
- Create: `MAIN/feature/review/ReviewViewModel.kt`
- Test: `TEST/feature/review/ReviewViewModelTest.kt`
- Modify: `MAIN/core/di/AppModule.kt`

- [ ] **Step 1: Escribir el test que falla**

```kotlin
package com.rubusai.app.feature.review

import com.rubusai.app.core.data.analyses.AddCall
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.AnalysesResult
import com.rubusai.app.core.data.analyses.EditCall
import com.rubusai.app.core.data.analyses.FakeAnalysesRepository
import com.rubusai.app.core.data.analyses.deteccion
import com.rubusai.app.core.data.analyses.imagenDePrueba
import com.rubusai.app.core.model.BBox
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertIs
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class ReviewViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    // Imagen de prueba: 2000x1000.
    private fun repoConDetecciones() = FakeAnalysesRepository().apply {
        detectionsResult = AnalysesResult.Success(listOf(deteccion("d1", BBox(100f, 100f, 300f, 300f), "verde", true)))
    }

    private suspend fun TestScope.listo(repo: FakeAnalysesRepository = repoConDetecciones()): ReviewViewModel {
        val vm = ReviewViewModel("a1", repo)
        advanceUntilIdle()
        return vm
    }

    @Test
    fun alCrearseCargaImagenYDetecciones() = runTest(dispatcher) {
        val vm = listo()

        val s = vm.state.value
        assertEquals(ReviewLoad.Ready, s.load)
        assertEquals(imagenDePrueba, s.image)
        assertEquals(listOf("d1"), s.detections.map { it.id })
        assertEquals(ReviewMode.Browse, s.mode)
    }

    @Test
    fun siLaImagenFallaLaRevisionFalla() = runTest(dispatcher) {
        val repo = repoConDetecciones().apply { imageResult = AnalysesResult.Failure(AnalysesFailure.Forbidden) }
        val vm = listo(repo)

        assertEquals(ReviewLoad.Failed(AnalysesFailure.Forbidden), vm.state.value.load)
    }

    @Test
    fun elegirUnBoxCreaUnBorradorDeEseBox() = runTest(dispatcher) {
        val vm = listo()

        vm.onSelect("d1")

        assertEquals(ReviewMode.Edit("d1"), vm.state.value.mode)
        val d = vm.state.value.draft!!
        assertEquals(BBox(100f, 100f, 300f, 300f), d.bbox)
        assertEquals("verde", d.etapa)
        assertFalse(d.isNew)
        assertFalse(d.dirty)
    }

    @Test
    fun mover_cambiarEtapaYSalud_marcanElBorradorComoCambiado() = runTest(dispatcher) {
        val vm = listo()
        vm.onSelect("d1")

        vm.onBoxChanged(BBox(110f, 110f, 310f, 310f))
        vm.onEtapa("maduro")
        vm.onSano(false)

        val d = vm.state.value.draft!!
        assertEquals(BBox(110f, 110f, 310f, 310f), d.bbox)
        assertEquals("maduro", d.etapa)
        assertFalse(d.sano)
        assertTrue(d.dirty)
    }

    @Test
    fun confirmarUnaEdicionMandaElFeedbackYVuelveANavegar() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onBoxChanged(BBox(110f, 120f, 310f, 320f))
        vm.onEtapa("maduro")

        vm.onConfirm()
        advanceUntilIdle()

        assertEquals(listOf(EditCall("a1", "d1", "maduro", true, BBox(110f, 120f, 310f, 320f))), repo.edits)
        assertEquals(ReviewMode.Browse, vm.state.value.mode)
        assertNull(vm.state.value.draft)
        assertEquals(2, repo.detectionsCalls)
    }

    @Test
    fun confirmarLimitaElBoxALaImagen() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onBoxChanged(BBox(-20f, 100f, 2500f, 400f))

        vm.onConfirm()
        advanceUntilIdle()

        assertEquals(BBox(0f, 100f, 2000f, 400f), repo.edits.single().bbox)
    }

    @Test
    fun unFalloAlGuardarConservaElBorradorYPermiteReintentar() = runTest(dispatcher) {
        val repo = repoConDetecciones().apply { writeResult = AnalysesResult.Failure(AnalysesFailure.Network) }
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onEtapa("maduro")

        vm.onConfirm()
        advanceUntilIdle()

        assertEquals(ReviewError.SaveFailed, vm.state.value.error)
        assertEquals("maduro", vm.state.value.draft!!.etapa)
        assertEquals(ReviewMode.Edit("d1"), vm.state.value.mode)
        assertFalse(vm.state.value.saving)

        repo.writeResult = AnalysesResult.Success(Unit)
        vm.onConfirm()
        advanceUntilIdle()

        assertNull(vm.state.value.error)
        assertEquals(ReviewMode.Browse, vm.state.value.mode)
        assertEquals(2, repo.edits.size)
    }

    @Test
    fun unBoxInvalidoSegunElServidorSeMuestraComoTal() = runTest(dispatcher) {
        val repo = repoConDetecciones().apply { writeResult = AnalysesResult.Failure(AnalysesFailure.InvalidInput) }
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onEtapa("maduro")

        vm.onConfirm()
        advanceUntilIdle()

        assertEquals(ReviewError.InvalidBox, vm.state.value.error)
        assertNotNullDraft(vm)
    }

    @Test
    fun unPermisoNegadoAlGuardarEsFalloDeLaPantalla() = runTest(dispatcher) {
        val repo = repoConDetecciones().apply { writeResult = AnalysesResult.Failure(AnalysesFailure.Forbidden) }
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onEtapa("maduro")

        vm.onConfirm()
        advanceUntilIdle()

        assertEquals(ReviewLoad.Failed(AnalysesFailure.Forbidden), vm.state.value.load)
    }

    @Test
    fun eliminarMandaElFeedbackEliminar() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)
        vm.onSelect("d1")

        vm.onDelete()
        advanceUntilIdle()

        assertEquals(listOf("d1"), repo.deletes)
        assertEquals(ReviewMode.Browse, vm.state.value.mode)
        assertNull(vm.state.value.draft)
    }

    @Test
    fun dibujarUnBoxCreaUnBorradorNuevoYConfirmarLoAgrega() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)

        vm.onStartDraw()
        assertEquals(ReviewMode.Draw, vm.state.value.mode)
        vm.onDrawn(BBox(500f, 400f, 700f, 600f))
        assertEquals(ReviewMode.Edit(NEW_BOX_ID), vm.state.value.mode)
        assertTrue(vm.state.value.draft!!.isNew)
        vm.onEtapa("flor")
        vm.onSano(false)

        vm.onConfirm()
        advanceUntilIdle()

        assertEquals(listOf(AddCall("a1", "flor", false, BBox(500f, 400f, 700f, 600f))), repo.adds)
        assertEquals(ReviewMode.Browse, vm.state.value.mode)
    }

    @Test
    fun unBoxDibujadoDemasiadoPequenoSeRechaza() = runTest(dispatcher) {
        val vm = listo()
        vm.onStartDraw()

        vm.onDrawn(BBox(500f, 400f, 503f, 402f))

        assertEquals(ReviewError.TooSmall, vm.state.value.error)
        assertNull(vm.state.value.draft)
        assertEquals(ReviewMode.Draw, vm.state.value.mode)
    }

    @Test
    fun cancelarDescartaElBorradorSinLlamarAlServidor() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onEtapa("maduro")

        vm.onCancel()

        assertEquals(ReviewMode.Browse, vm.state.value.mode)
        assertNull(vm.state.value.draft)
        assertTrue(repo.edits.isEmpty())
    }

    @Test
    fun mientrasGuardaNoSeAceptanOtrasAcciones() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)
        vm.onSelect("d1")
        vm.onEtapa("maduro")

        vm.onConfirm()
        vm.onConfirm() // segundo toque antes de terminar
        vm.onSelect("d1")
        advanceUntilIdle()

        assertEquals(1, repo.edits.size)
    }

    @Test
    fun marcarRevisadoLlamaAlServidorYAvisa() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)

        vm.onMarkReviewed()
        advanceUntilIdle()

        assertEquals(1, repo.reviewedCalls)
        assertTrue(vm.state.value.reviewed)
    }

    @Test
    fun siMarcarRevisadoFallaNoSeMarcaYSeAvisa() = runTest(dispatcher) {
        val repo = repoConDetecciones().apply { writeResult = AnalysesResult.Failure(AnalysesFailure.Server) }
        val vm = listo(repo)

        vm.onMarkReviewed()
        advanceUntilIdle()

        assertFalse(vm.state.value.reviewed)
        assertEquals(ReviewError.ReviewedFailed, vm.state.value.error)
    }

    @Test
    fun elPrimerErrorDeImagenRenuevaLaUrlYElSegundoEsFallo() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = listo(repo)

        vm.onImageError()
        advanceUntilIdle()
        assertEquals(2, repo.imageCalls)
        assertEquals(ReviewLoad.Ready, vm.state.value.load)

        vm.onImageError()
        advanceUntilIdle()
        assertIs<ReviewLoad.Failed>(vm.state.value.load)
    }

    @Test
    fun restaurarVuelveAlBoxEnEdicionTrasLaCarga() = runTest(dispatcher) {
        val repo = repoConDetecciones()
        val vm = ReviewViewModel("a1", repo)
        vm.restore(ReviewSnapshot.Edit("d1", Draft(BBox(120f, 120f, 320f, 320f), "flor", false, isNew = false, dirty = true)))
        advanceUntilIdle()

        assertEquals(ReviewMode.Edit("d1"), vm.state.value.mode)
        assertEquals("flor", vm.state.value.draft!!.etapa)
    }

    @Test
    fun restaurarUnBoxQueYaNoExisteVuelveANavegar() = runTest(dispatcher) {
        val vm = ReviewViewModel("a1", repoConDetecciones())
        vm.restore(ReviewSnapshot.Edit("otro", Draft(BBox(1f, 1f, 50f, 50f), "flor", true, isNew = false, dirty = true)))
        advanceUntilIdle()

        assertEquals(ReviewMode.Browse, vm.state.value.mode)
        assertNull(vm.state.value.draft)
    }

    @Test
    fun laInstantaneaSeCodificaYSeDecodifica() {
        val edit = ReviewSnapshot.Edit("d1", Draft(BBox(1.5f, 2f, 30f, 40f), "maduro", false, isNew = false, dirty = true))
        assertEquals(edit, ReviewSnapshot.decode(edit.encode()))
        assertEquals(ReviewSnapshot.Draw, ReviewSnapshot.decode(ReviewSnapshot.Draw.encode()))
        assertEquals(ReviewSnapshot.Browse, ReviewSnapshot.decode(ReviewSnapshot.Browse.encode()))
        assertEquals(ReviewSnapshot.Browse, ReviewSnapshot.decode("basura"))
        assertEquals(ReviewSnapshot.Browse, ReviewSnapshot.decode(""))
    }

    private fun assertNotNullDraft(vm: ReviewViewModel) = assertTrue(vm.state.value.draft != null)
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ReviewViewModelTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: ReviewViewModel`).

- [ ] **Step 3: Implementar**

`MAIN/feature/review/ReviewViewModel.kt`:

```kotlin
package com.rubusai.app.feature.review

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.AnalysesRepository
import com.rubusai.app.core.data.analyses.AnalysesResult
import com.rubusai.app.core.model.AnalysisImage
import com.rubusai.app.core.model.BBox
import com.rubusai.app.core.model.Detection
import com.rubusai.app.core.model.Etapa
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/** Id del borrador de un box recién dibujado (aún no existe en el servidor). */
internal const val NEW_BOX_ID = "__nuevo__"

internal sealed interface ReviewMode {
    data object Browse : ReviewMode
    data class Edit(val id: String) : ReviewMode
    data object Draw : ReviewMode
}

/** Cambios locales de un box, sin enviar. [dirty] es `true` en cuanto algo cambió. */
internal data class Draft(
    val bbox: BBox,
    val etapa: String,
    val sano: Boolean,
    val isNew: Boolean,
    val dirty: Boolean,
)

internal enum class ReviewError { SaveFailed, InvalidBox, TooSmall, ReviewedFailed }

internal sealed interface ReviewLoad {
    data object Loading : ReviewLoad
    data object Ready : ReviewLoad
    data class Failed(val reason: AnalysesFailure) : ReviewLoad
}

internal data class ReviewUiState(
    val load: ReviewLoad = ReviewLoad.Loading,
    val image: AnalysisImage? = null,
    val detections: List<Detection> = emptyList(),
    val mode: ReviewMode = ReviewMode.Browse,
    val draft: Draft? = null,
    val saving: Boolean = false,
    val error: ReviewError? = null,
    val reviewed: Boolean = false,
)

/** Lo que sobrevive a la muerte del proceso: el modo y el borrador (no lo ya guardado). */
internal sealed interface ReviewSnapshot {
    data object Browse : ReviewSnapshot
    data object Draw : ReviewSnapshot
    data class Edit(val id: String, val draft: Draft) : ReviewSnapshot

    /** Texto para `rememberSaveable`. */
    fun encode(): String = when (this) {
        Browse -> "browse"
        Draw -> "draw"
        is Edit -> listOf(
            "edit", id, draft.bbox.x1, draft.bbox.y1, draft.bbox.x2, draft.bbox.y2,
            draft.etapa, draft.sano, draft.isNew, draft.dirty,
        ).joinToString("|")
    }

    companion object {
        fun decode(text: String): ReviewSnapshot {
            val p = text.split("|")
            return when {
                p.firstOrNull() == "draw" -> Draw
                p.firstOrNull() == "edit" && p.size == 10 -> runCatching {
                    Edit(
                        p[1],
                        Draft(
                            BBox(p[2].toFloat(), p[3].toFloat(), p[4].toFloat(), p[5].toFloat()),
                            p[6], p[7].toBooleanStrict(), p[8].toBooleanStrict(), p[9].toBooleanStrict(),
                        ),
                    )
                }.getOrDefault(Browse)
                else -> Browse
            }
        }
    }
}

internal class ReviewViewModel(
    private val analysisId: String,
    private val analyses: AnalysesRepository,
) : ViewModel() {
    private val _state = MutableStateFlow(ReviewUiState())
    val state: StateFlow<ReviewUiState> = _state.asStateFlow()

    private var imageRetried = false
    private var pendingRestore: ReviewSnapshot? = null

    init {
        load()
    }

    fun load() {
        _state.update { it.copy(load = ReviewLoad.Loading) }
        viewModelScope.launch {
            var failure: AnalysesFailure? = null
            coroutineScope {
                launch {
                    when (val r = analyses.imageUrl(analysisId)) {
                        is AnalysesResult.Success -> _state.update { it.copy(image = r.value) }
                        is AnalysesResult.Failure -> failure = r.reason
                    }
                }
                launch {
                    when (val r = analyses.detections(analysisId)) {
                        is AnalysesResult.Success -> _state.update { it.copy(detections = r.value) }
                        is AnalysesResult.Failure -> failure = failure ?: r.reason
                    }
                }
            }
            failure?.let { reason ->
                _state.update { it.copy(load = ReviewLoad.Failed(reason)) }
                return@launch
            }
            _state.update { it.copy(load = ReviewLoad.Ready) }
            applyPendingRestore()
        }
    }

    /** Coil no pudo con la URL (probablemente caducó): se pide una nueva una vez; si vuelve a fallar, error. */
    fun onImageError() {
        if (imageRetried) {
            _state.update { it.copy(load = ReviewLoad.Failed(AnalysesFailure.Network)) }
            return
        }
        imageRetried = true
        viewModelScope.launch {
            when (val r = analyses.imageUrl(analysisId)) {
                is AnalysesResult.Success -> _state.update { it.copy(image = r.value) }
                is AnalysesResult.Failure -> _state.update { it.copy(load = ReviewLoad.Failed(r.reason)) }
            }
        }
    }

    fun onSelect(id: String) {
        val s = _state.value
        if (s.saving || s.load != ReviewLoad.Ready) return
        val d = s.detections.firstOrNull { it.id == id } ?: return
        _state.update {
            it.copy(
                mode = ReviewMode.Edit(id),
                draft = Draft(d.bbox, d.etapa, d.sano, isNew = false, dirty = false),
                error = null,
            )
        }
    }

    fun onBoxChanged(bbox: BBox) = updateDraft { it.copy(bbox = bbox, dirty = true) }

    fun onEtapa(etapa: String) = updateDraft { it.copy(etapa = etapa, dirty = true) }

    fun onSano(sano: Boolean) = updateDraft { it.copy(sano = sano, dirty = true) }

    fun onStartDraw() {
        if (_state.value.saving) return
        _state.update { it.copy(mode = ReviewMode.Draw, draft = null, error = null) }
    }

    /** Termina un arrastre de dibujo: un box diminuto se rechaza; si no, queda como borrador nuevo editable. */
    fun onDrawn(bbox: BBox) {
        val image = _state.value.image ?: return
        val box = bbox.clampTo(image.width.toFloat(), image.height.toFloat())
        if (!box.isValid(image.width.toFloat(), image.height.toFloat())) {
            _state.update { it.copy(error = ReviewError.TooSmall) }
            return
        }
        _state.update {
            it.copy(
                mode = ReviewMode.Edit(NEW_BOX_ID),
                draft = Draft(box, Etapa.DeteccionGen.api, sano = true, isNew = true, dirty = true),
                error = null,
            )
        }
    }

    fun onCancel() {
        if (_state.value.saving) return
        _state.update { it.copy(mode = ReviewMode.Browse, draft = null, error = null) }
    }

    fun onConfirm() {
        val s = _state.value
        val draft = s.draft ?: return
        val image = s.image ?: return
        val mode = s.mode as? ReviewMode.Edit ?: return
        if (s.saving) return
        val box = draft.bbox.clampTo(image.width.toFloat(), image.height.toFloat())
        if (!box.isValid(image.width.toFloat(), image.height.toFloat())) {
            _state.update { it.copy(error = ReviewError.TooSmall) }
            return
        }
        save {
            if (draft.isNew) analyses.addDetection(analysisId, draft.etapa, draft.sano, box)
            else analyses.editDetection(analysisId, mode.id, draft.etapa, draft.sano, box)
        }
    }

    fun onDelete() {
        val s = _state.value
        val mode = s.mode as? ReviewMode.Edit ?: return
        if (s.saving || s.draft?.isNew != false) return
        save { analyses.deleteDetection(analysisId, mode.id) }
    }

    fun onMarkReviewed() {
        if (_state.value.saving) return
        _state.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            when (val r = analyses.markReviewed(analysisId)) {
                is AnalysesResult.Success -> _state.update { it.copy(saving = false, reviewed = true) }
                is AnalysesResult.Failure -> {
                    if (r.reason.isFatal()) fail(r.reason)
                    else _state.update { it.copy(saving = false, error = ReviewError.ReviewedFailed) }
                }
            }
        }
    }

    fun clearError() = _state.update { it.copy(error = null) }

    /** Tras morir el proceso: devuelve el modo y el borrador cuando las detecciones ya cargaron. */
    fun restore(snapshot: ReviewSnapshot) {
        pendingRestore = snapshot
        if (_state.value.load == ReviewLoad.Ready) applyPendingRestore()
    }

    private fun applyPendingRestore() {
        val snapshot = pendingRestore ?: return
        pendingRestore = null
        val s = _state.value
        if (s.mode != ReviewMode.Browse || s.draft != null) return
        _state.update {
            when (snapshot) {
                ReviewSnapshot.Browse -> it
                ReviewSnapshot.Draw -> it.copy(mode = ReviewMode.Draw)
                is ReviewSnapshot.Edit ->
                    if (snapshot.draft.isNew || it.detections.any { d -> d.id == snapshot.id }) {
                        it.copy(mode = ReviewMode.Edit(snapshot.id), draft = snapshot.draft)
                    } else {
                        it
                    }
            }
        }
    }

    private fun updateDraft(change: (Draft) -> Draft) {
        if (_state.value.saving) return
        _state.update { s -> s.draft?.let { s.copy(draft = change(it), error = null) } ?: s }
    }

    /** Ejecuta un guardado y, si sale bien, vuelve a pedir las detecciones y a `Browse`; si no, conserva el borrador. */
    private fun save(call: suspend () -> AnalysesResult<Unit>) {
        _state.update { it.copy(saving = true, error = null) }
        viewModelScope.launch {
            when (val r = call()) {
                is AnalysesResult.Success -> {
                    (analyses.detections(analysisId) as? AnalysesResult.Success)?.let { d ->
                        _state.update { it.copy(detections = d.value) }
                    }
                    _state.update { it.copy(saving = false, mode = ReviewMode.Browse, draft = null) }
                }
                is AnalysesResult.Failure -> {
                    if (r.reason.isFatal()) {
                        fail(r.reason)
                    } else {
                        val error = if (r.reason == AnalysesFailure.InvalidInput) ReviewError.InvalidBox else ReviewError.SaveFailed
                        _state.update { it.copy(saving = false, error = error) }
                    }
                }
            }
        }
    }

    private fun fail(reason: AnalysesFailure) = _state.update { it.copy(saving = false, load = ReviewLoad.Failed(reason)) }

    // Sin permiso, sin sesión o sin análisis, reintentar no sirve: es un fallo de la pantalla.
    private fun AnalysesFailure.isFatal() =
        this == AnalysesFailure.Forbidden || this == AnalysesFailure.NotFound || this == AnalysesFailure.Unauthorized
}
```

- [ ] **Step 4: Registrar en Koin**

En `analysesModule()` añade `viewModel { (id: String) -> ReviewViewModel(analysisId = id, analyses = get()) }` y el import `com.rubusai.app.feature.review.ReviewViewModel`.

- [ ] **Step 5: Verlo pasar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ReviewViewModelTest*' --console=plain`
Expected: PASS (21 tests).

- [ ] **Step 6: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): ReviewViewModel con edición, alta, baja y revisado de detecciones"
```

---

### Task 13: Gestos de un dedo de la revisión

**Files:**
- Create: `MAIN/feature/review/BoxEditGestures.kt`

Es la capa fina entre `SingleFingerHandler` y las funciones puras. No tiene test unitario (los gestos reales se verifican en el teléfono, Tarea 16); toda la lógica con números ya está probada en `BoxGeometryTest` y `Viewport`.

- [ ] **Step 1: Implementar**

```kotlin
package com.rubusai.app.feature.review

import com.rubusai.app.core.model.BBox

/** Acciones que los gestos de la revisión pueden disparar. */
internal data class BoxGestureActions(
    val onSelect: (String) -> Unit,
    val onBoxChanged: (BBox) -> Unit,
    val onDrawn: (BBox) -> Unit,
    /** Toque fuera del box en edición: la pantalla decide si cambia de box, cancela o pide confirmar. */
    val onTapOutside: (imageX: Float, imageY: Float) -> Unit,
)

/**
 * Interpreta un dedo sobre la imagen según el modo de la revisión:
 * `Browse` elige un box, `Edit` mueve o redimensiona el borrador, `Draw` dibuja uno nuevo.
 * Los campos se actualizan en cada recomposición; la instancia se conserva entre ellas.
 */
internal class BoxEditGestures : SingleFingerHandler {
    var viewport: Viewport = Viewport(1f, 1f, 1f, 1f)
    var state: ReviewUiState = ReviewUiState()
    var actions: BoxGestureActions = BoxGestureActions({}, {}, {}, { _, _ -> })

    /** Radio de las asas en píxeles de pantalla (24 dp). */
    var handleRadiusPx: Float = 0f

    /** Vista previa del box que se está dibujando; `null` al soltar. */
    var onPreview: (BBox?) -> Unit = {}

    private var target: DragMode? = null
    private var startBox: BBox? = null
    private var startX = 0f
    private var startY = 0f
    private var moved = false
    private var drawing = false

    private val imageW get() = viewport.imageW
    private val imageH get() = viewport.imageH

    override fun onDown(x: Float, y: Float): Boolean {
        reset()
        if (state.saving || state.load != ReviewLoad.Ready) return false
        val ix = viewport.toImageX(x)
        val iy = viewport.toImageY(y)
        val radiusImg = handleRadiusPx / viewport.scale
        startX = ix
        startY = iy
        return when (state.mode) {
            ReviewMode.Browse -> {
                pickBox(state.detections, ix, iy, radiusImg)?.let { actions.onSelect(it.id) }
                false
            }
            is ReviewMode.Edit -> {
                val draft = state.draft ?: return false
                startBox = draft.bbox
                target = hitHandle(draft.bbox, ix, iy, radiusImg)
                true
            }
            ReviewMode.Draw -> {
                drawing = true
                true
            }
        }
    }

    override fun onDrag(x: Float, y: Float) {
        val ix = viewport.toImageX(x)
        val iy = viewport.toImageY(y)
        // Umbral de 6 px de pantalla para distinguir un toque de un arrastre.
        if (!moved && kotlin.math.hypot(ix - startX, iy - startY) * viewport.scale < 6f) return
        moved = true
        when {
            drawing -> onPreview(normalized(startX, startY, ix, iy, imageW, imageH))
            target != null -> startBox?.let {
                actions.onBoxChanged(applyDrag(it, target!!, ix - startX, iy - startY, imageW, imageH))
            }
        }
    }

    override fun onUp(x: Float, y: Float) {
        val ix = viewport.toImageX(x)
        val iy = viewport.toImageY(y)
        when {
            drawing -> {
                onPreview(null)
                if (moved) actions.onDrawn(normalized(startX, startY, ix, iy, imageW, imageH))
            }
            target == null && !moved -> actions.onTapOutside(ix, iy)
        }
        reset()
    }

    override fun onCancel() {
        // Un segundo dedo cancela el arrastre: el box vuelve a donde estaba al empezar.
        startBox?.takeIf { moved && target != null }?.let(actions.onBoxChanged)
        onPreview(null)
        reset()
    }

    private fun reset() {
        target = null
        startBox = null
        moved = false
        drawing = false
    }
}
```

- [ ] **Step 2: Compilar**

Run: `./gradlew :shared:compileAndroidMain :shared:compileKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 3: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): gestos de un dedo para elegir, mover, redimensionar y dibujar boxes"
```

---

### Task 14: `ReviewScreen` y ruta

**Files:**
- Create: `MAIN/feature/review/ReviewScreen.kt`
- Modify: `MAIN/core/navigation/RubusNavHost.kt`
- Modify: `TEST/core/di/KoinGraphTest.kt`
- Test: `HOST/feature/review/ReviewScreenTest.kt`

- [ ] **Step 1: Escribir el test de UI que falla**

Los gestos de arrastre no se prueban aquí (ver Tarea 16); sí el panel de edición, los errores y los botones.

```kotlin
package com.rubusai.app.feature.review

import androidx.compose.ui.test.ExperimentalTestApi
import androidx.compose.ui.test.assertCountEquals
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.waitUntilAtLeastOneExists
import com.rubusai.app.core.data.analyses.AnalysesFailure
import com.rubusai.app.core.data.analyses.deteccion
import com.rubusai.app.core.data.analyses.imagenDePrueba
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.model.BBox
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@OptIn(ExperimentalTestApi::class)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class ReviewScreenTest {

    @get:Rule
    val rule = createComposeRule()

    private fun awaitText(text: String) = rule.waitUntilAtLeastOneExists(hasText(text), timeoutMillis = 5_000)

    private val ready = ReviewUiState(
        load = ReviewLoad.Ready,
        image = imagenDePrueba,
        detections = listOf(deteccion("d1")),
    )

    private val editing = ready.copy(
        mode = ReviewMode.Edit("d1"),
        draft = Draft(BBox(10f, 10f, 60f, 60f), "verde", sano = true, isNew = false, dirty = false),
    )

    private class Calls {
        val log = mutableListOf<String>()
    }

    private fun show(state: ReviewUiState, calls: Calls = Calls()) = rule.setContent {
        RubusTheme {
            ReviewScreen(
                state = state,
                actions = ReviewActions(
                    onBack = { calls.log += "back" },
                    onRetry = { calls.log += "retry" },
                    onAdd = { calls.log += "add" },
                    onSelect = { calls.log += "select:$it" },
                    onBoxChanged = {},
                    onDrawn = {},
                    onTapOutside = { _, _ -> },
                    onEtapa = { calls.log += "etapa:$it" },
                    onSano = { calls.log += "sano:$it" },
                    onConfirm = { calls.log += "confirm" },
                    onDelete = { calls.log += "delete" },
                    onCancel = { calls.log += "cancel" },
                    onMarkReviewed = { calls.log += "reviewed" },
                    onImageError = {},
                    onClearError = {},
                ),
            )
        }
    }

    @Test
    fun navegandoSeVenAgregarYMarcarRevisado() {
        show(ready)

        awaitText("Revisar detecciones")
        rule.onNodeWithText("AGREGAR", ignoreCase = true)
        rule.onNodeWithText("MARCAR REVISADO", ignoreCase = true)
        rule.onAllNodesWithText("Etapa").assertCountEquals(0)
    }

    @Test
    fun agregarYMarcarRevisadoAvisan() {
        val calls = Calls()
        show(ready, calls)
        awaitText("Revisar detecciones")

        rule.onNodeWithText("AGREGAR", ignoreCase = true).performClick()
        rule.onNodeWithText("MARCAR REVISADO", ignoreCase = true).performClick()

        assertEquals(listOf("add", "reviewed"), calls.log)
    }

    @Test
    fun conUnBoxElegidoApareceElPanelConSuEtapa() {
        show(editing)

        awaitText("Etapa")
        awaitText("Sano")
        rule.onNodeWithText("CONFIRMAR", ignoreCase = true)
        rule.onNodeWithText("ELIMINAR", ignoreCase = true)
    }

    @Test
    fun elegirOtraEtapaAvisa() {
        val calls = Calls()
        show(editing, calls)
        awaitText("Etapa")

        rule.onNodeWithText("Maduro").performClick()

        assertEquals(listOf("etapa:maduro"), calls.log)
    }

    @Test
    fun confirmarAvisa() {
        val calls = Calls()
        show(editing, calls)
        awaitText("Etapa")

        rule.onNodeWithText("CONFIRMAR", ignoreCase = true).performClick()

        assertEquals(listOf("confirm"), calls.log)
    }

    @Test
    fun eliminarPideConfirmacion() {
        val calls = Calls()
        show(editing, calls)
        awaitText("Etapa")

        rule.onNodeWithText("ELIMINAR", ignoreCase = true).performClick()
        awaitText("¿Eliminar esta detección?")
        assertEquals(emptyList<String>(), calls.log)
        rule.onNodeWithText("ELIMINAR", ignoreCase = true).performClick()

        assertEquals(listOf("delete"), calls.log)
    }

    @Test
    fun cancelarConCambiosPideConfirmarElDescarte() {
        val calls = Calls()
        val sucio = editing.copy(draft = editing.draft!!.copy(dirty = true))
        show(sucio, calls)
        awaitText("Etapa")

        rule.onNodeWithText("CANCELAR", ignoreCase = true).performClick()
        awaitText("¿Descartar los cambios del box?")
        rule.onNodeWithText("DESCARTAR", ignoreCase = true).performClick()

        assertEquals(listOf("cancel"), calls.log)
    }

    @Test
    fun cancelarSinCambiosDescartaDeInmediato() {
        val calls = Calls()
        show(editing, calls)
        awaitText("Etapa")

        rule.onNodeWithText("CANCELAR", ignoreCase = true).performClick()

        assertEquals(listOf("cancel"), calls.log)
    }

    @Test
    fun enModoDibujoSeMuestraLaAyuda() {
        show(ready.copy(mode = ReviewMode.Draw))

        awaitText("Arrastra sobre la imagen para dibujar un box.")
    }

    @Test
    fun losErroresDeGuardadoSeMuestran() {
        show(editing.copy(error = ReviewError.SaveFailed))
        awaitText("No se pudo guardar. Reintenta.")
    }

    @Test
    fun unBoxInvalidoYUnoDemasiadoPequenoTienenSuMensaje() {
        show(editing.copy(error = ReviewError.InvalidBox))
        awaitText("El box no es válido.")
    }

    @Test
    fun unFalloDeCargaMuestraElMensajeYReintenta() {
        val calls = Calls()
        show(ReviewUiState(load = ReviewLoad.Failed(AnalysesFailure.Forbidden)), calls)
        awaitText("No tienes acceso a este análisis.")

        rule.onNodeWithText("VOLVER", ignoreCase = true).performClick()

        assertEquals(listOf("back"), calls.log)
    }
}
```

- [ ] **Step 2: Verlo fallar**

Run: `./gradlew :shared:testAndroidHostTest --tests '*ReviewScreenTest*' --console=plain`
Expected: FAIL de compilación (`Unresolved reference: ReviewScreen`).

- [ ] **Step 3: Implementar la pantalla**

`MAIN/feature/review/ReviewScreen.kt`:

```kotlin
package com.rubusai.app.feature.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusErrorState
import com.rubusai.app.core.designsystem.component.RubusLoadingState
import com.rubusai.app.core.model.BBox
import com.rubusai.app.core.model.Etapa
import com.rubusai.app.feature.results.etapaColor
import com.rubusai.app.feature.results.etapaLabel
import com.rubusai.app.feature.results.message
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.common_back
import com.rubusai.app.resources.common_cancel
import com.rubusai.app.resources.common_confirm
import com.rubusai.app.resources.common_delete
import com.rubusai.app.resources.common_retry
import com.rubusai.app.resources.review_add
import com.rubusai.app.resources.review_box_invalid
import com.rubusai.app.resources.review_box_too_small
import com.rubusai.app.resources.review_delete_confirm
import com.rubusai.app.resources.review_discard
import com.rubusai.app.resources.review_discard_confirm
import com.rubusai.app.resources.review_done
import com.rubusai.app.resources.review_draw_hint
import com.rubusai.app.resources.review_healthy
import com.rubusai.app.resources.review_image_description
import com.rubusai.app.resources.review_reviewed_failed
import com.rubusai.app.resources.review_save_failed
import com.rubusai.app.resources.review_stage
import com.rubusai.app.resources.review_stop_adding
import com.rubusai.app.resources.review_title
import org.jetbrains.compose.resources.stringResource
import org.koin.compose.viewmodel.koinViewModel
import org.koin.core.parameter.parametersOf

/** Todo lo que la pantalla puede pedirle al ViewModel; agrupado para no arrastrar quince parámetros. */
internal data class ReviewActions(
    val onBack: () -> Unit,
    val onRetry: () -> Unit,
    val onAdd: () -> Unit,
    val onSelect: (String) -> Unit,
    val onBoxChanged: (BBox) -> Unit,
    val onDrawn: (BBox) -> Unit,
    val onTapOutside: (imageX: Float, imageY: Float) -> Unit,
    val onEtapa: (String) -> Unit,
    val onSano: (Boolean) -> Unit,
    val onConfirm: () -> Unit,
    val onDelete: () -> Unit,
    val onCancel: () -> Unit,
    val onMarkReviewed: () -> Unit,
    val onImageError: () -> Unit,
    val onClearError: () -> Unit,
)

@Composable
internal fun ReviewRoute(id: String, onClose: () -> Unit) {
    val viewModel = koinViewModel<ReviewViewModel>(parameters = { parametersOf(id) })
    val state by viewModel.state.collectAsStateWithLifecycle()

    // Sobrevive a la muerte del proceso: el modo y el borrador (lo ya guardado se vuelve a pedir).
    var saved by rememberSaveable { mutableStateOf("") }
    LaunchedEffect(Unit) { if (saved.isNotEmpty()) viewModel.restore(ReviewSnapshot.decode(saved)) }
    LaunchedEffect(state.mode, state.draft) {
        saved = when (val mode = state.mode) {
            ReviewMode.Browse -> ReviewSnapshot.Browse
            ReviewMode.Draw -> ReviewSnapshot.Draw
            is ReviewMode.Edit -> state.draft?.let { ReviewSnapshot.Edit(mode.id, it) } ?: ReviewSnapshot.Browse
        }.encode()
    }
    LaunchedEffect(state.reviewed) { if (state.reviewed) onClose() }

    // Lo que se elige al tocar fuera de un box en edición depende del estado vigente.
    val actions = remember(viewModel, onClose) {
        ReviewActions(
            onBack = onClose,
            onRetry = viewModel::load,
            onAdd = viewModel::onStartDraw,
            onSelect = viewModel::onSelect,
            onBoxChanged = viewModel::onBoxChanged,
            onDrawn = viewModel::onDrawn,
            onTapOutside = { _, _ -> },
            onEtapa = viewModel::onEtapa,
            onSano = viewModel::onSano,
            onConfirm = viewModel::onConfirm,
            onDelete = viewModel::onDelete,
            onCancel = viewModel::onCancel,
            onMarkReviewed = viewModel::onMarkReviewed,
            onImageError = viewModel::onImageError,
            onClearError = viewModel::clearError,
        )
    }
    ReviewScreen(state, actions)
}

@Composable
internal fun ReviewScreen(state: ReviewUiState, actions: ReviewActions, modifier: Modifier = Modifier) {
    Surface(modifier = modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(Modifier.fillMaxSize().safeDrawingPadding().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            when (val load = state.load) {
                ReviewLoad.Loading -> RubusLoadingState(Modifier.fillMaxSize())
                is ReviewLoad.Failed -> Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally) {
                    RubusErrorState(
                        message = load.reason.message(),
                        retryLabel = stringResource(Res.string.common_retry),
                        onRetry = actions.onRetry,
                    )
                    RubusButton(text = stringResource(Res.string.common_back), onClick = actions.onBack, variant = RubusButtonVariant.Outline)
                }
                ReviewLoad.Ready -> ReviewContent(state, actions)
            }
        }
    }
}

@Composable
private fun ReviewContent(state: ReviewUiState, actions: ReviewActions) {
    val image = state.image ?: return
    var viewport by remember(image) { mutableStateOf(Viewport.initial(image)) }
    var preview by remember { mutableStateOf<BBox?>(null) }
    var confirmDelete by remember { mutableStateOf(false) }
    var confirmDiscard by remember { mutableStateOf(false) }

    val radiusPx = with(LocalDensity.current) { 24.dp.toPx() }
    val editingId = (state.mode as? ReviewMode.Edit)?.id

    // Toque fuera del box en edición: cambiar a otro box, cancelar, o pedir confirmación si hay cambios.
    val onTapOutside: (Float, Float) -> Unit = { ix, iy ->
        val other = pickBox(state.detections, ix, iy, radiusPx / viewport.scale)?.takeIf { it.id != editingId }
        when {
            state.draft?.dirty == true -> confirmDiscard = true
            other != null -> actions.onSelect(other.id)
            else -> actions.onCancel()
        }
    }

    val handler = remember { BoxEditGestures() }
    handler.viewport = viewport
    handler.state = state
    handler.actions = BoxGestureActions(actions.onSelect, actions.onBoxChanged, actions.onDrawn, onTapOutside)
    handler.handleRadiusPx = radiusPx
    handler.onPreview = { preview = it }

    val boxes = buildList {
        state.detections.forEach { d ->
            if (d.id == editingId && state.draft != null) return@forEach // el borrador lo reemplaza
            add(DrawnBox(d.bbox, etapaColor(d.etapa)))
        }
        state.draft?.let { add(DrawnBox(it.bbox, etapaColor(it.etapa), selected = true)) }
        preview?.let { add(DrawnBox(it, MaterialTheme.colorScheme.primary, dashed = true)) }
    }

    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        RubusButton(text = stringResource(Res.string.common_back), onClick = actions.onBack, variant = RubusButtonVariant.Outline)
        Text(
            text = stringResource(Res.string.review_title),
            style = MaterialTheme.typography.titleLarge,
            modifier = Modifier.weight(1f),
        )
    }
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        RubusButton(
            text = stringResource(if (state.mode == ReviewMode.Draw) Res.string.review_stop_adding else Res.string.review_add),
            onClick = if (state.mode == ReviewMode.Draw) actions.onCancel else actions.onAdd,
            enabled = !state.saving,
            variant = RubusButtonVariant.Secondary,
        )
        RubusButton(text = stringResource(Res.string.review_done), onClick = actions.onMarkReviewed, enabled = !state.saving)
    }

    AnnotatedImage(
        image = image,
        boxes = boxes,
        viewport = viewport,
        onViewportChange = { viewport = it },
        onImageError = actions.onImageError,
        contentDescription = stringResource(Res.string.review_image_description),
        modifier = Modifier.weight(1f).fillMaxWidth().viewportGestures(viewport, { viewport = it }, handler),
    )

    if (state.mode == ReviewMode.Draw && state.draft == null) {
        Text(text = stringResource(Res.string.review_draw_hint), style = MaterialTheme.typography.bodyMedium)
    }
    state.error?.let { Text(text = it.message(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium) }
    state.draft?.let { draft ->
        EditPanel(
            draft = draft,
            saving = state.saving,
            actions = actions,
            onAskDelete = { confirmDelete = true },
            onAskDiscard = { if (draft.dirty) confirmDiscard = true else actions.onCancel() },
        )
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(stringResource(Res.string.review_delete_confirm)) },
            confirmButton = {
                TextButton(onClick = { confirmDelete = false; actions.onDelete() }) {
                    Text(stringResource(Res.string.common_delete).uppercase())
                }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text(stringResource(Res.string.common_cancel).uppercase()) } },
        )
    }
    if (confirmDiscard) {
        AlertDialog(
            onDismissRequest = { confirmDiscard = false },
            title = { Text(stringResource(Res.string.review_discard_confirm)) },
            confirmButton = {
                TextButton(onClick = { confirmDiscard = false; actions.onCancel() }) {
                    Text(stringResource(Res.string.review_discard).uppercase())
                }
            },
            dismissButton = { TextButton(onClick = { confirmDiscard = false }) { Text(stringResource(Res.string.common_cancel).uppercase()) } },
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EditPanel(
    draft: Draft,
    saving: Boolean,
    actions: ReviewActions,
    onAskDelete: () -> Unit,
    onAskDiscard: () -> Unit,
) {
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(text = stringResource(Res.string.review_stage), style = MaterialTheme.typography.titleSmall)
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Etapa.entries.forEach { etapa ->
                FilterChip(
                    selected = draft.etapa == etapa.api,
                    onClick = { actions.onEtapa(etapa.api) },
                    enabled = !saving,
                    label = { Text(etapaLabel(etapa.api)) },
                )
            }
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(text = stringResource(Res.string.review_healthy), style = MaterialTheme.typography.bodyLarge)
            Switch(checked = draft.sano, onCheckedChange = actions.onSano, enabled = !saving)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            RubusButton(text = stringResource(Res.string.common_confirm), onClick = actions.onConfirm, enabled = !saving)
            if (!draft.isNew) {
                RubusButton(
                    text = stringResource(Res.string.common_delete),
                    onClick = onAskDelete,
                    enabled = !saving,
                    variant = RubusButtonVariant.Danger,
                )
            }
            RubusButton(
                text = stringResource(Res.string.common_cancel),
                onClick = onAskDiscard,
                enabled = !saving,
                variant = RubusButtonVariant.Outline,
            )
        }
    }
}

@Composable
private fun ReviewError.message(): String = stringResource(
    when (this) {
        ReviewError.SaveFailed -> Res.string.review_save_failed
        ReviewError.InvalidBox -> Res.string.review_box_invalid
        ReviewError.TooSmall -> Res.string.review_box_too_small
        ReviewError.ReviewedFailed -> Res.string.review_reviewed_failed
    },
)
```

Nota: el `onTapOutside` real vive en `ReviewContent` (necesita `viewport` y el estado); el de `ReviewRoute` es solo un valor para `ReviewActions` que `ReviewContent` sustituye al construir `BoxGestureActions`. Si prefieres evitar la duplicación, quita `onTapOutside` de `ReviewActions` y de los dos sitios que lo construyen (el test usa `onTapOutside = { _, _ -> }`; ajústalo igual).

- [ ] **Step 4: Navegación**

En `RubusNavHost.kt` importa `com.rubusai.app.feature.review.ReviewRoute` y sustituye el marcador provisional de `Route.Review` por:

```kotlin
        composable<Route.Review> { entry ->
            val resumed = { entry.lifecycle.currentState == Lifecycle.State.RESUMED }
            ReviewRoute(
                id = entry.toRoute<Route.Review>().id,
                onClose = { if (resumed()) navController.popBackStack() },
            )
        }
```

- [ ] **Step 5: Grafo Koin**

En `KoinGraphTest` añade `elGrafoResuelveElViewModelDeRevision` (igual que el de resultado, con `Dispatchers.setMain`) que haga `app.koin.get<ReviewViewModel> { parametersOf("a1") }`; import `com.rubusai.app.feature.review.ReviewViewModel`.

- [ ] **Step 6: Verificar**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain`
Expected: `BUILD SUCCESSFUL`, todos los tests en verde. Si `ReviewScreenTest` no encuentra «Maduro» porque un `FilterChip` deshabilitado/seleccionado duplica el texto, usa `onAllNodesWithText("Maduro").onFirst()`.

- [ ] **Step 7: Commit**

```bash
git add rubus-ai-kmp/shared/src
git commit -m "feat(rubus-ai-kmp): pantalla de revisión de boxes con edición, alta y baja"
```

---

### Task 15: Documentación

**Files:**
- Modify: `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`
- Modify: `rubus-ai-kmp/docs/dependencias-pendientes.md`

Lee ambos archivos completos antes de editar y respeta su estilo.

- [ ] **Step 1: Roadmap**

En la línea «Estado: partida en tres sub-fases…» de la Fase 2, sustituye «2c (resultados y validación) sin empezar.» por «2c (lista, detalle, validación y revisión de boxes) implementada el 2026-11-XX; pendiente de verificación en un teléfono Android.» (usa la fecha real del día de cierre). No toques otras fases.

- [ ] **Step 2: Dependencias pendientes**

1. Donde esté la entrada de Coil 3 como «quitada del build / se añade en la Fase 2», márcala resuelta con la fecha y la versión usada (la de la Tarea 0).
2. Añade una sección **«Pendientes de la Fase 2c»** con estos puntos (conserva solo los que sigan siendo ciertos tras la implementación):
   - Los gestos con el dedo (mover, asas, dibujar, pellizco) se verifican solo a mano en un teléfono; no hay prueba automática.
   - `POST detections` no es idempotente: un reintento tras una respuesta perdida crea un box duplicado.
   - Cada guardado vuelve a pedir `GET detections`; si esa recarga falla tras guardar bien, la lista queda desactualizada hasta volver a entrar.
   - La fecha se muestra como `yyyy-MM-dd` sin pasar a la zona horaria local.
   - Sin deshacer ni historial de feedback por box.
   - El detalle de PRODUCTOR no tiene imagen ni boxes (el backend responde 403 a `/image` y `/detections`).
   - La imagen del detalle usa la variante de despliegue (hasta 2048 px) y el zoom no pide una resolución mayor.
   - Menores que la implementación deje sin cambiar (anótalos aquí con el archivo).
3. Si el `PullToRefreshBox` se sustituyó por un botón (Tarea 7), anótalo.

- [ ] **Step 3: Commit**

```bash
git add rubus-ai-kmp/docs
git commit -m "docs(rubus-ai-kmp): fase 2c implementada y sus pendientes"
```

---

### Task 16: Verificación final y prueba en el teléfono

- [ ] **Step 1: Suite completa, ensamblado e iOS**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble :shared:compileKotlinIosSimulatorArm64 :shared:compileKotlinIosArm64 :shared:compileTestKotlinIosSimulatorArm64 --console=plain --rerun-tasks`
Expected: `BUILD SUCCESSFUL`; suma los tests reales del reporte (`shared/build/test-results/testAndroidHostTest/*.xml`) y anótala: 354 de base + los nuevos, 0 fallos.

- [ ] **Step 2: Preparar el teléfono**

Backend alcanzable (`fruit-backend` en `0.0.0.0:3001`), `rubus.devHost=<IP del PC>` en `local.properties` del worktree, un usuario AGRONOMO (o ADMIN) y uno PRODUCTOR de pruebas, y al menos un análisis con detecciones. Instalar: `./gradlew :androidApp:installDevDebug`. Esta parte la hace el usuario: pídele que la ejecute y no la des por hecha.

- [ ] **Step 3: Lista de comprobación en el teléfono**

Marca cada punto con el resultado real (OK / falla + qué se vio):

1. Home muestra «Análisis» para AGRONOMO/ADMIN/PRODUCTOR y no para MONITOR.
2. La lista carga, los filtros de estado y de campo cambian los resultados, el scroll pide más páginas y tirar hacia abajo refresca.
3. Subir una foto y, al llegar «¡Análisis listo!», pulsar «Ver» abre el detalle de ese análisis.
4. El detalle (AGRONOMO) muestra imagen con boxes de colores por etapa; pellizcar hace zoom y dos dedos mueven la imagen sin romper el scroll de la pantalla.
5. PRODUCTOR: detalle sin imagen, sin boxes y sin botones.
6. Validar (con confirmación) y Rechazar (observaciones obligatorias) cambian el estado; al volver a la lista el análisis ya no está en «Pendientes».
7. Revisión: tocar un box lo selecciona con sus 4 asas; arrastrar dentro lo mueve; arrastrar una esquina lo redimensiona; no sale de la imagen ni baja de ~8 px.
8. Cambiar etapa y sano y Confirmar guarda (el box cambia de color al volver); Eliminar con confirmación lo quita.
9. «Agregar», arrastrar sobre la imagen, elegir etapa/sano y Confirmar crea un box; uno diminuto muestra «El box es demasiado pequeño».
10. Con cambios sin confirmar, tocar fuera o Cancelar pide «¿Descartar los cambios del box?».
11. Modo avión al Confirmar: error visible, el borrador se conserva y reintentar funciona al volver la red.
12. «Marcar revisado» cierra la revisión y el detalle refresca sus boxes.
13. Rotar la pantalla y matar el proceso («No conservar actividades») con un box en edición conserva el borrador.
14. Un segundo dedo durante un arrastre de box lo cancela y devuelve el box a su sitio.
15. La imagen sigue viéndose tras unos 15 min en pantalla (URL renovada) o muestra el error con «Reintentar».

Anota en `dependencias-pendientes.md` («Pendientes de la Fase 2c») todo lo que falle o resulte incómodo, con modelo y versión de Android del teléfono.

- [ ] **Step 4: Commit de la verificación**

```bash
git add rubus-ai-kmp/docs
git commit -m "docs(rubus-ai-kmp): fase 2c verificada en un teléfono Android"
```

(Solo si el usuario confirma la prueba; si algo falla, corrige primero y repite.)

---

### Task 17: Integración y limpieza

**Solo con la Tarea 16 aprobada por el usuario y todo commiteado.**

- [ ] **Step 1: Comprobar el estado**

En el worktree: `git status --short` vacío y `git log --oneline main..HEAD` con los commits de la 2c. En `/home/san/Proyectos/zarza-workspace` (`main`) hay cambios ajenos sin commitear en `zarza_ai/`: no los toques; si el merge los afectara o hay conflictos, avisa al usuario antes de seguir.

- [ ] **Step 2: Merge y limpieza**

```bash
cd /home/san/Proyectos/zarza-workspace
git merge --no-ff feature/kmp-fase2c-resultados -m "Merge feature/kmp-fase2c-resultados: lista, detalle, validación y revisión de boxes de la Fase 2c en rubus-ai-kmp"
git worktree remove ../zarza-workspace-kmp-fase2c
git branch -d feature/kmp-fase2c-resultados
```

- [ ] **Step 3: Reconstruir backend si hace falta**

La 2c no toca el backend, pero la reconstrucción de la imagen de `fruit-backend` (ping del gateway, Redis, `@SkipThrottle` de `auth/me`) sigue pendiente desde la 2b; recuérdaselo al usuario.
