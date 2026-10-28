package com.rubusai.app.core.platform

import com.rubusai.app.core.model.User
import com.rubusai.app.core.model.UserRole
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlinx.coroutines.test.runTest

class InMemoryUserStorageTest {

    private val ana = User("u1", "ana@zarza.example", UserRole.MONITOR, "Ana", "Pérez")

    @Test
    fun sinNadaGuardadoLeeNull() = runTest {
        assertNull(InMemoryUserStorage().read())
    }

    @Test
    fun loGuardadoSeLee() = runTest {
        val storage = InMemoryUserStorage()

        storage.save(ana)

        assertEquals(ana, storage.read())
    }

    @Test
    fun clearBorraElUsuario() = runTest {
        val storage = InMemoryUserStorage(ana)

        storage.clear()

        assertNull(storage.read())
    }
}
