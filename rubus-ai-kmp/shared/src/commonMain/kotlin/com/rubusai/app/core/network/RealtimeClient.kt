package com.rubusai.app.core.network

import com.rubusai.app.core.model.RealtimeEvent
import kotlin.coroutines.cancellation.CancellationException
import kotlin.random.Random
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.NonCancellable
import kotlinx.coroutines.channels.BufferOverflow
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private const val AUTH_TIMEOUT_MS = 10_000L
private const val BACKOFF_BASE_MS = 2_000L
private const val BACKOFF_MAX_MS = 60_000L
private const val BACKOFF_MAX_SHIFT = 10
private const val CLOSE_TOKEN_REJECTED = 4001

enum class ConnectionState { Desconectado, Conectando, Conectado }

/**
 * Canal en tiempo real con el backend. Mientras esté conectado reconecta solo. [connect] y
 * [disconnect] se llaman siempre desde el mismo hilo (el principal, desde `RealtimeHost`).
 */
interface RealtimeClient {
    /** Eventos de negocio. No se guardan: quien no esté suscrito en ese momento los pierde. */
    val events: SharedFlow<RealtimeEvent>

    val state: StateFlow<ConnectionState>

    /** Empieza a conectar y a reintentar. No hace nada si ya está en marcha. */
    fun connect()

    /** Cierra el socket y cancela los reintentos. */
    fun disconnect()
}

/**
 * Protocolo del backend (`/ws`): primer mensaje `{"event":"auth","data":{"token":…}}`, el
 * servidor responde `auth_ok`; sin él en 10 s, o con token inválido (cierre 4001), cierra.
 *
 * [token] entrega un access token vigente o `null`; se pide en cada intento. [jitter] da un
 * factor (0,8–1,2) que se aplica a la espera. [log] nunca recibe mensajes del socket ni tokens.
 */
internal class RealtimeClientImpl(
    private val transport: WsTransport,
    private val wsUrl: String,
    private val token: suspend () -> String?,
    private val scope: CoroutineScope,
    private val jitter: () -> Double = { 0.8 + Random.nextDouble() * 0.4 },
    private val log: (String) -> Unit = {},
) : RealtimeClient {
    private val _events = MutableSharedFlow<RealtimeEvent>(
        extraBufferCapacity = 16,
        onBufferOverflow = BufferOverflow.DROP_OLDEST,
    )
    override val events: SharedFlow<RealtimeEvent> = _events.asSharedFlow()

    private val _state = MutableStateFlow(ConnectionState.Desconectado)
    override val state: StateFlow<ConnectionState> = _state.asStateFlow()

    private var job: Job? = null

    override fun connect() {
        if (job?.isActive == true) return
        _state.value = ConnectionState.Conectando
        job = scope.launch { correr() }
    }

    // shortcut: si el bucle está justo escribiendo el estado mientras se cancela, puede quedar un
    // Conectado/Conectando obsoleto; la ventana es de microsegundos y RealtimeHost reconecta o
    // desconecta en cuanto cambia la sesión o el ciclo de vida. Subir a un solo hilo si molesta.
    override fun disconnect() {
        job?.cancel()
        job = null
        _state.value = ConnectionState.Desconectado
    }

    private enum class Fin { Cerrado, TokenRechazado, Fallo }

    private suspend fun correr() {
        var intento = 0
        var reintentoInmediato = true
        while (true) {
            val fin = sesion {
                intento = 0
                reintentoInmediato = true
            }
            marcar(ConnectionState.Conectando)
            if (fin == Fin.TokenRechazado && reintentoInmediato) {
                // Token vencido: el siguiente intento pide uno nuevo (auth/me refresca) sin esperar.
                reintentoInmediato = false
                continue
            }
            delay(espera(intento))
            intento++
        }
    }

    /** Un intento completo: token, conexión, auth y lectura hasta que el socket se cierra. */
    private suspend fun sesion(alAutenticar: () -> Unit): Fin {
        val accessToken = try {
            token()
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            null
        }
        if (accessToken == null) {
            log("Sin token vigente para el WebSocket")
            return Fin.Fallo
        }
        val conexion = try {
            transport.connect(wsUrl)
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            log("No se pudo abrir el WebSocket")
            return Fin.Fallo
        }
        var autenticado = false
        try {
            coroutineScope {
                val vigilante = launch {
                    delay(AUTH_TIMEOUT_MS)
                    log("El servidor no confirmó la autenticación a tiempo")
                    conexion.close()
                }
                try {
                    conexion.send(mensajeAuth(accessToken))
                    conexion.incoming.collect { texto ->
                        when (val mensaje = parseServerMessage(texto)) {
                            ServerMessage.AuthOk -> {
                                vigilante.cancel()
                                autenticado = true
                                alAutenticar()
                                marcar(ConnectionState.Conectado)
                            }
                            is ServerMessage.Evento -> {
                                if (autenticado) _events.tryEmit(mensaje.evento)
                            }
                            null -> log("Mensaje del WebSocket descartado")
                        }
                    }
                } finally {
                    vigilante.cancel()
                }
            }
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            log("El WebSocket se cerró con error")
        } finally {
            withContext(NonCancellable) {
                try {
                    conexion.close()
                } catch (e: Exception) {
                    // Ya estaba cerrado.
                }
            }
        }
        return when {
            conexion.closeCode == CLOSE_TOKEN_REJECTED -> Fin.TokenRechazado
            autenticado -> Fin.Cerrado
            else -> Fin.Fallo
        }
    }

    /** No escribe el estado si el trabajo ya se canceló: `disconnect()` manda. */
    private suspend fun marcar(nuevo: ConnectionState) {
        if (currentCoroutineContext().isActive) _state.value = nuevo
    }

    private fun espera(intento: Int): Long {
        val base = BACKOFF_BASE_MS shl minOf(intento, BACKOFF_MAX_SHIFT)
        return minOf(BACKOFF_MAX_MS, (base * jitter()).toLong())
    }
}

private fun mensajeAuth(token: String): String = buildJsonObject {
    put("event", "auth")
    put("data", buildJsonObject { put("token", token) })
}.toString()
