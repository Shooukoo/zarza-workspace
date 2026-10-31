package com.rubusai.app.feature.aviso

import com.rubusai.app.core.model.RealtimeEvent
import com.rubusai.app.core.network.FakeRealtimeClient
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.advanceUntilIdle
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain

@OptIn(ExperimentalCoroutinesApi::class)
class AvisoViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private fun crearVm(realtime: FakeRealtimeClient) = AvisoViewModel(realtime)

    @Test
    fun alInicioNoHayAviso() = runTest(dispatcher) {
        val vm = crearVm(FakeRealtimeClient())
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun analisisListoProduceUnAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.AnalisisListo("a1", "raw/x.jpg"))
        advanceUntilIdle()

        assertEquals(Aviso(id = 1), vm.aviso.value)
    }

    @Test
    fun unEventoDesconocidoNoProduceAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.Desconocido("nueva_solicitud"))
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun dosAvisosSeguidosDejanSoloElUltimo() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a2", ""))
        advanceUntilIdle()

        assertEquals(Aviso(id = 2), vm.aviso.value)
    }

    @Test
    fun marcarMostradoLimpiaElAvisoActual() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()

        vm.onAvisoMostrado(1)

        assertNull(vm.aviso.value)
    }

    @Test
    fun marcarMostradoUnAvisoViejoNoBorraElNuevo() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime)
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a2", ""))
        advanceUntilIdle()

        vm.onAvisoMostrado(1)

        assertEquals(Aviso(id = 2), vm.aviso.value)
    }
}
