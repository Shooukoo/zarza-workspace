package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import io.ktor.client.engine.mock.respond
import io.ktor.client.request.HttpRequestData
import io.ktor.http.HttpHeaders
import io.ktor.http.HttpMethod
import io.ktor.http.HttpStatusCode
import io.ktor.http.content.OutgoingContent
import io.ktor.http.content.TextContent
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest

private fun loginBody(role: String = "MONITOR") =
    """{"token":"access-new","refreshToken":"refresh-new","user":{"id":"u1","email":"ana@zarza.example","role":"$role","firstName":"Ana","lastName":"Pérez"}}"""

private fun bodyText(request: HttpRequestData): String = when (val body = request.body) {
    is TextContent -> body.text
    is OutgoingContent.ByteArrayContent -> body.bytes().decodeToString()
    else -> error("cuerpo inesperado: ${body::class}")
}

class AuthRepositoryTest {

    private val expectedUser = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")

    @Test
    fun unLoginCorrectoDevuelveLosTokensYElUsuario() = runTest {
        var captured: HttpRequestData? = null
        val fixture = clientFixture { request ->
            captured = request
            respondJson(loginBody())
        }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(
            LoginResult.Success(AuthSession(AuthTokens("access-new", "refresh-new"), expectedUser)),
            result,
        )
        val request = assertNotNull(captured)
        assertEquals(HttpMethod.Post, request.method)
        assertEquals("/api/v1/auth/login", request.url.encodedPath)
        assertNull(request.headers[HttpHeaders.Authorization])
        assertEquals("""{"email":"ana@zarza.example","password":"secreto"}""", bodyText(request))
    }

    @Test
    fun cadaCodigoDeErrorSeClasificaPorSuEstado() = runTest {
        val esperados = mapOf(
            401 to LoginFailure.InvalidCredentials,
            429 to LoginFailure.RateLimited,
            400 to LoginFailure.InvalidInput,
            404 to LoginFailure.Unexpected,
            500 to LoginFailure.Unexpected,
            503 to LoginFailure.Unexpected,
        )

        for ((status, failure) in esperados) {
            val fixture = clientFixture { respondJson("""{"message":"x"}""", HttpStatusCode.fromValue(status)) }

            val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

            assertEquals(LoginResult.Failure(failure), result, "estado $status")
        }
    }

    @Test
    fun unFalloDeRedSeClasificaComoNetwork() = runTest {
        val fixture = clientFixture { throw FakeNetworkException() }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.Network), result)
    }

    @Test
    fun unRolDesconocidoSeClasificaComoUnsupportedRole() = runTest {
        val fixture = clientFixture { respondJson(loginBody(role = "SUPERHEROE")) }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.UnsupportedRole), result)
    }

    @Test
    fun unCuerpoIlegibleSeClasificaComoUnexpected() = runTest {
        val fixture = clientFixture { respondJson("esto no es json") }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.Unexpected), result)
    }

    @Test
    fun laCancelacionSePropagaYNoSeConvierteEnNetwork() = runTest {
        val fixture = clientFixture {
            delay(60_000)
            respondJson(loginBody())
        }
        var terminoNormalmente = false

        val job = launch {
            AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")
            terminoNormalmente = true
        }
        runCurrent()
        job.cancelAndJoin()

        assertFalse(terminoNormalmente)
    }

    @Test
    fun losDtosConSecretosNoLosImprimenEnToString() {
        val request = LoginRequest("ana@zarza.example", "secreto-123").toString()
        val response = LoginResponse("access-1", "refresh-1", UserDto("u1", "ana@zarza.example", "MONITOR")).toString()

        assertFalse("secreto-123" in request)
        assertFalse("ana@zarza.example" in request)
        assertFalse("access-1" in response)
        assertFalse("refresh-1" in response)
    }

    @Test
    fun unUnauthorizedSinCuerpoSeClasificaComoCredencialesInvalidas() = runTest {
        val fixture = clientFixture { respond(content = "", status = HttpStatusCode.Unauthorized) }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.InvalidCredentials), result)
    }

    @Test
    fun unJsonValidoSinElUsuarioSeClasificaComoInesperado() = runTest {
        val fixture = clientFixture { respondJson("""{"token":"a","refreshToken":"b"}""") }

        val result = AuthRepositoryImpl(fixture.client).login("ana@zarza.example", "secreto")

        assertEquals(LoginResult.Failure(LoginFailure.Unexpected), result)
    }
}
