package com.rubusai.app.feature.auth

import com.rubusai.app.core.data.auth.FakeAuthRepository
import com.rubusai.app.core.data.auth.LoginFailure
import com.rubusai.app.core.data.auth.LoginResult
import com.rubusai.app.core.data.auth.SessionManager
import com.rubusai.app.core.network.AuthTokens
import com.rubusai.app.core.network.SessionEvents
import com.rubusai.app.core.platform.InMemoryTokenStorage
import com.rubusai.app.core.platform.InMemoryUserStorage
import com.rubusai.app.core.platform.SecureTokenStorage
import kotlin.test.AfterTest
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlinx.coroutines.CompletableDeferred
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
class LoginViewModelTest {

    private val dispatcher = StandardTestDispatcher()

    @BeforeTest
    fun setUp() = Dispatchers.setMain(dispatcher)

    @AfterTest
    fun tearDown() = Dispatchers.resetMain()

    private fun viewModel(
        repository: FakeAuthRepository = FakeAuthRepository(),
        tokens: SecureTokenStorage = InMemoryTokenStorage(),
    ): LoginViewModel {
        val manager = SessionManager(
            repository, tokens, InMemoryUserStorage(), SessionEvents(),
            scope = CoroutineScope(SupervisorJob() + dispatcher),
        )
        return LoginViewModel(manager)
    }

    @Test
    fun elCorreoVacioMuestraSuErrorYNoLlamaAlRepositorio() = runTest(dispatcher) {
        val repository = FakeAuthRepository()
        val vm = viewModel(repository)
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(LoginFieldError.EmailRequired, vm.state.value.emailError)
        assertNull(vm.state.value.passwordError)
        assertTrue(repository.loginCalls.isEmpty())
    }

    @Test
    fun unCorreoSinFormaDeCorreoMuestraSuError() = runTest(dispatcher) {
        for (email in listOf("ana", "ana@", "@zarza", "ana @zarza", "ana@za@rza")) {
            val vm = viewModel()
            vm.onEmailChange(email)
            vm.onPasswordChange("secreto")

            vm.onSubmit()

            assertEquals(LoginFieldError.EmailInvalid, vm.state.value.emailError, "correo '$email'")
        }
    }

    @Test
    fun laContrasenaVaciaMuestraSuError() = runTest(dispatcher) {
        val vm = viewModel()
        vm.onEmailChange("ana@zarza.example")

        vm.onSubmit()

        assertEquals(LoginFieldError.PasswordRequired, vm.state.value.passwordError)
        assertNull(vm.state.value.emailError)
    }

    @Test
    fun unEnvioValidoRecortaElCorreoYLlamaAlLogin() = runTest(dispatcher) {
        val repository = FakeAuthRepository()
        val vm = viewModel(repository)
        vm.onEmailChange("  ana@zarza.example ")
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(listOf("ana@zarza.example" to "secreto"), repository.loginCalls)
        assertFalse(vm.state.value.submitting)
        assertNull(vm.state.value.formError)
    }

    @Test
    fun lasCredencialesMalasDejanElErrorEnElFormulario() = runTest(dispatcher) {
        val repository = FakeAuthRepository().apply {
            loginResult = LoginResult.Failure(LoginFailure.InvalidCredentials)
        }
        val vm = viewModel(repository)
        vm.onEmailChange("ana@zarza.example")
        vm.onPasswordChange("mala")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(LoginFailure.InvalidCredentials, vm.state.value.formError)
        assertFalse(vm.state.value.submitting)
    }

    @Test
    fun editarUnCampoLimpiaSuErrorYElDelFormulario() = runTest(dispatcher) {
        val repository = FakeAuthRepository().apply {
            loginResult = LoginResult.Failure(LoginFailure.Network)
        }
        val vm = viewModel(repository)
        vm.onEmailChange("ana")
        vm.onSubmit()
        assertEquals(LoginFieldError.EmailInvalid, vm.state.value.emailError)

        vm.onEmailChange("ana@zarza.example")
        assertNull(vm.state.value.emailError)

        vm.onPasswordChange("secreto")
        vm.onSubmit()
        advanceUntilIdle()
        assertEquals(LoginFailure.Network, vm.state.value.formError)

        vm.onPasswordChange("otra")
        assertNull(vm.state.value.formError)
    }

    @Test
    fun unDobleEnvioSeIgnoraMientrasSeEnvia() = runTest(dispatcher) {
        val repository = FakeAuthRepository().apply { loginGate = CompletableDeferred() }
        val vm = viewModel(repository)
        vm.onEmailChange("ana@zarza.example")
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()
        assertTrue(vm.state.value.submitting)
        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(1, repository.loginCalls.size)
        repository.loginGate!!.complete(Unit)
        advanceUntilIdle()
        assertFalse(vm.state.value.submitting)
    }

    @Test
    fun unaExcepcionDelAlmacenamientoSeMuestraComoInesperada() = runTest(dispatcher) {
        val failingTokens = object : SecureTokenStorage {
            override suspend fun read(): AuthTokens? = null
            override suspend fun save(tokens: AuthTokens) = throw IllegalStateException("disco lleno")
            override suspend fun clear() = Unit
        }
        val vm = viewModel(tokens = failingTokens)
        vm.onEmailChange("ana@zarza.example")
        vm.onPasswordChange("secreto")

        vm.onSubmit()
        advanceUntilIdle()

        assertEquals(LoginFailure.Unexpected, vm.state.value.formError)
        assertFalse(vm.state.value.submitting)
    }
}
