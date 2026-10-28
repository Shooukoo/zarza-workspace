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
