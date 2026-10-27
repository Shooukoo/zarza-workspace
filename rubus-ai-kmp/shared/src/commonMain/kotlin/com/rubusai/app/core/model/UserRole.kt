package com.rubusai.app.core.model

enum class UserRole(val displayName: String) {
    ADMIN("Administrador"),
    PRODUCTOR("Productor"),
    AGRONOMO("Agrónomo"),
    MONITOR("Monitor");

    companion object {
        /**
         * Convierte el rol que envía el backend. No distingue mayúsculas.
         * Un valor desconocido es un error: no se degrada a otro rol.
         */
        fun fromApi(value: String): UserRole =
            entries.firstOrNull { it.name.equals(value, ignoreCase = true) }
                ?: throw IllegalArgumentException("Rol desconocido: '$value'")
    }
}
