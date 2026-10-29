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
