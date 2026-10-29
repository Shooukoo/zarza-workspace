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
