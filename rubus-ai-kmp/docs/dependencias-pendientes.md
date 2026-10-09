# Dependencias pendientes

Dependencias que la estructura de paquetes ya necesita o va a necesitar y que
todavía no están en `gradle/libs.versions.toml` ni en los archivos de build.

## Necesaria ya

| Dependencia | Dónde se usa | Estado |
|-------------|--------------|--------|
| Koin (`koin-core`, más `koin-compose` / `koin-compose-viewmodel` y `koin-android`) | `core/di/AppModule.kt` | Los cuatro módulos (network, database, repositories, viewmodels) están comentados porque sin Koin el archivo no compila. |

## Por decidir al migrar cada capa

Todavía no hay código que las use; la librería concreta está sin elegir.

| Paquete | Necesidad |
|---------|-----------|
| `core/network` | Cliente HTTP y WebSocket, serialización JSON |
| `core/database` | Base de datos local (caché offline, cola de sincronización) |
| `core/datastore` | Preferencias clave-valor |
| `core/navigation` | Navegación de Compose Multiplatform |
| `core/platform` | Almacenamiento seguro, ubicación, compresión de imágenes y push en Android/iOS |
| `core/sync` | Trabajo en segundo plano para la sincronización offline |
| general | `kotlinx-coroutines` y `kotlinx-datetime` explícitos si hacen falta |
