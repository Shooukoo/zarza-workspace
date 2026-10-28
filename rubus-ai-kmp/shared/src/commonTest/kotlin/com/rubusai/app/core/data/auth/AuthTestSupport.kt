package com.rubusai.app.core.data.auth

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import com.rubusai.app.core.network.AuthTokens
import kotlinx.coroutines.CompletableDeferred

internal val ana = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")
internal val anaAdmin = ana.copy(role = UserRole.ADMIN)
internal val TOKENS = AuthTokens("access-old", "refresh-old")

/** Repositorio falso: devuelve lo que se le configura y deja constancia de las llamadas. */
internal class FakeAuthRepository : AuthRepository {
    var loginResult: LoginResult =
        LoginResult.Success(AuthSession(AuthTokens("access-new", "refresh-new"), ana))
    var loginGate: CompletableDeferred<Unit>? = null
    var me: User? = null
    var meGate: CompletableDeferred<Unit>? = null

    val loginCalls = mutableListOf<Pair<String, String>>()
    val logoutCalls = mutableListOf<String?>()
    var meCalls = 0
    var maxActiveLogins = 0
    private var activeLogins = 0

    override suspend fun login(email: String, password: String): LoginResult {
        loginCalls += email to password
        activeLogins++
        maxActiveLogins = maxOf(maxActiveLogins, activeLogins)
        try {
            loginGate?.await()
        } finally {
            activeLogins--
        }
        return loginResult
    }

    override suspend fun fetchMe(): User? {
        meCalls++
        meGate?.await()
        return me
    }

    override suspend fun logout(refreshToken: String?) {
        logoutCalls += refreshToken
    }
}
