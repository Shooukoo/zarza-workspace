package com.rubusai.app.core.model

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class UserTest {

    private fun user(email: String = "ana.lopez@zarza.example", firstName: String? = null) =
        User(id = "u1", email = email, role = UserRole.MONITOR, firstName = firstName)

    @Test
    fun displayNameEsElNombreCuandoExiste() {
        assertEquals("Ana", user(firstName = "Ana").displayName)
    }

    @Test
    fun displayNameUsaElCorreoCuandoNoHayNombre() {
        assertEquals("ana.lopez", user(firstName = null).displayName)
    }

    @Test
    fun displayNameUsaElCorreoCuandoElNombreEstaEnBlanco() {
        assertEquals("ana.lopez", user(firstName = "   ").displayName)
    }

    @Test
    fun fromApiReconoceLosCuatroRoles() {
        assertEquals(UserRole.ADMIN, UserRole.fromApi("ADMIN"))
        assertEquals(UserRole.PRODUCTOR, UserRole.fromApi("PRODUCTOR"))
        assertEquals(UserRole.AGRONOMO, UserRole.fromApi("AGRONOMO"))
        assertEquals(UserRole.MONITOR, UserRole.fromApi("MONITOR"))
    }

    @Test
    fun fromApiNoDistingueMayusculas() {
        assertEquals(UserRole.AGRONOMO, UserRole.fromApi("agronomo"))
        assertEquals(UserRole.ADMIN, UserRole.fromApi("Admin"))
    }

    @Test
    fun fromApiFallaConUnRolDesconocido() {
        assertFailsWith<IllegalArgumentException> { UserRole.fromApi("SUPERVISOR") }
    }

    @Test
    fun cadaRolTieneSuNombreVisible() {
        assertEquals("Administrador", UserRole.ADMIN.displayName)
        assertEquals("Productor", UserRole.PRODUCTOR.displayName)
        assertEquals("Agrónomo", UserRole.AGRONOMO.displayName)
        assertEquals("Monitor", UserRole.MONITOR.displayName)
    }
}
