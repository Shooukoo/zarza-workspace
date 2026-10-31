package com.rubusai.app.core.data.campos

import com.rubusai.app.core.model.Campo
import com.rubusai.app.core.network.FakeNetworkException
import com.rubusai.app.core.network.TEST_BASE_URL
import com.rubusai.app.core.network.clientFixture
import com.rubusai.app.core.network.respondJson
import io.ktor.client.engine.mock.MockRequestHandler
import io.ktor.client.engine.mock.respondError
import io.ktor.http.HttpStatusCode
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.runTest

class CamposRepositoryTest {

    private fun TestScope.repository(handler: MockRequestHandler) =
        CamposRepositoryImpl(clientFixture(handler = handler).client)

    @Test
    fun devuelveLosCamposDelBackendIgnorandoLosCamposDeMas() = runTest {
        var url: String? = null
        val repository = repository { request ->
            url = request.url.toString()
            respondJson(
                """[{"id":"c1","nombre":"Norte","codigoCampo":"N-01","productorId":"p1","extra":{"a":1}},""" +
                    """{"id":"c2","nombre":"Sur"}]""",
            )
        }

        val result = repository.list()

        assertEquals("$TEST_BASE_URL/campos", url)
        assertEquals(
            CamposResult.Success(listOf(Campo("c1", "Norte", "N-01"), Campo("c2", "Sur", ""))),
            result,
        )
    }

    @Test
    fun unaListaVaciaEsExito() = runTest {
        val repository = repository { respondJson("[]") }

        assertEquals(CamposResult.Success(emptyList()), repository.list())
    }

    @Test
    fun unErrorDelServidorEsFallo() = runTest {
        val repository = repository { respondError(HttpStatusCode.InternalServerError) }

        assertEquals(CamposResult.Failure, repository.list())
    }

    @Test
    fun sinRedEsFallo() = runTest {
        val repository = repository { throw FakeNetworkException() }

        assertEquals(CamposResult.Failure, repository.list())
    }

    @Test
    fun unaRespuestaQueNoEsUnaListaEsFallo() = runTest {
        val repository = repository { respondJson("""{"data":[]}""") }

        assertEquals(CamposResult.Failure, repository.list())
    }
}
