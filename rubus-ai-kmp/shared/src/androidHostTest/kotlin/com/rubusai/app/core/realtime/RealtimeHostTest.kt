package com.rubusai.app.core.realtime

import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.LifecycleRegistry
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.rubusai.app.core.data.auth.SessionState
import com.rubusai.app.core.data.auth.ana
import com.rubusai.app.core.data.auth.anaAdmin
import com.rubusai.app.core.network.FakeRealtimeClient
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RealtimeHostTest {

    @get:Rule
    val rule = createComposeRule()

    private val client = FakeRealtimeClient()
    private val sesion = mutableStateOf<SessionState>(SessionState.Unauthenticated())
    private val owner = object : LifecycleOwner {
        val registry = LifecycleRegistry.createUnsafe(this)
        override val lifecycle: Lifecycle get() = registry
    }

    private fun render(estado: Lifecycle.State = Lifecycle.State.RESUMED) {
        rule.runOnUiThread { owner.registry.currentState = estado }
        rule.setContent {
            CompositionLocalProvider(LocalLifecycleOwner provides owner) {
                RealtimeHost(sessionState = sesion.value, client = client)
            }
        }
        rule.waitForIdle()
    }

    private fun setSesion(valor: SessionState) {
        rule.runOnIdle { sesion.value = valor }
        rule.waitForIdle()
    }

    private fun setCicloDeVida(estado: Lifecycle.State) {
        rule.runOnUiThread { owner.registry.currentState = estado }
        rule.waitForIdle()
    }

    @Test
    fun mientrasCargaLaSesionNoConecta() {
        sesion.value = SessionState.Loading
        render()

        assertEquals(0, client.connects)
    }

    @Test
    fun sinSesionNoConecta() {
        render()

        assertEquals(0, client.connects)
    }

    @Test
    fun conSesionYPrimerPlanoConecta() {
        render()

        setSesion(SessionState.Authenticated(ana))

        assertEquals(1, client.connects)
        assertEquals(0, client.disconnects)
    }

    @Test
    fun alPasarASegundoPlanoDesconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))

        setCicloDeVida(Lifecycle.State.STARTED)

        assertEquals(1, client.disconnects)
    }

    @Test
    fun alVolverAPrimerPlanoReconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))
        setCicloDeVida(Lifecycle.State.STARTED)

        setCicloDeVida(Lifecycle.State.RESUMED)

        assertEquals(2, client.connects)
    }

    @Test
    fun alCerrarSesionDesconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))

        setSesion(SessionState.Unauthenticated())

        assertEquals(1, client.disconnects)
    }

    @Test
    fun conSesionPeroEnSegundoPlanoNoConecta() {
        render(estado = Lifecycle.State.STARTED)

        setSesion(SessionState.Authenticated(ana))

        assertEquals(0, client.connects)
    }

    @Test
    fun siSoloCambiaElUsuarioNoReconecta() {
        render()
        setSesion(SessionState.Authenticated(ana))

        setSesion(SessionState.Authenticated(anaAdmin))

        assertEquals(1, client.connects)
        assertEquals(0, client.disconnects)
    }
}
