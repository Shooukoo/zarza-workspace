package com.rubusai.app.feature.aviso

import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.data.auth.TOKENS
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.model.RealtimeEvent
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.network.FakeRealtimeClient
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
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
class AvisoViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    /** Con [conSesion] el manager arranca autenticado; sin ella, sin sesión guardada. */
    private suspend fun crearManager(conSesion: Boolean = true): SessionManager {
        val manager = SessionManager(
            FakeAuthRepository(),
            if (conSesion) InMemoryTokenStorage(TOKENS) else InMemoryTokenStorage(),
            if (conSesion) InMemoryUserStorage(ana) else InMemoryUserStorage(),
            SessionEvents(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        manager.start()
        return manager
    }

    private fun crearVm(realtime: FakeRealtimeClient, manager: SessionManager) =
        AvisoViewModel(realtime, manager)

    @Test
    fun alInicioNoHayAviso() = runTest(dispatcher) {
        val vm = crearVm(FakeRealtimeClient(), crearManager())
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun analisisListoProduceUnAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime, crearManager())
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.AnalisisListo("a1", "raw/x.jpg"))
        advanceUntilIdle()

        assertEquals(Aviso(id = 1), vm.aviso.value)
    }

    @Test
    fun unEventoDesconocidoNoProduceAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime, crearManager())
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.Desconocido("nueva_solicitud"))
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun dosAvisosSeguidosDejanSoloElUltimo() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime, crearManager())
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
        val vm = crearVm(realtime, crearManager())
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()

        vm.onAvisoMostrado(1)

        assertNull(vm.aviso.value)
    }

    @Test
    fun marcarMostradoUnAvisoViejoNoBorraElNuevo() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime, crearManager())
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a2", ""))
        advanceUntilIdle()

        vm.onAvisoMostrado(1)

        assertEquals(Aviso(id = 2), vm.aviso.value)
    }

    @Test
    fun unAvisoPendienteSeLimpiaAlCerrarseLaSesion() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val manager = crearManager()
        val vm = crearVm(realtime, manager)
        advanceUntilIdle()
        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()

        manager.logout()
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }

    @Test
    fun unAnalisisListoSinSesionAutenticadaNoProduceAviso() = runTest(dispatcher) {
        val realtime = FakeRealtimeClient()
        val vm = crearVm(realtime, crearManager(conSesion = false))
        advanceUntilIdle()

        realtime.emit(RealtimeEvent.AnalisisListo("a1", ""))
        advanceUntilIdle()

        assertNull(vm.aviso.value)
    }
}
