package com.rubusai.app.core.network

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.toList
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.UnconfinedTestDispatcher
import kotlinx.coroutines.test.runTest

@OptIn(ExperimentalCoroutinesApi::class)
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
