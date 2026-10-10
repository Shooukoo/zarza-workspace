# KMP Fase 0, sub-proyecto A: build y esqueleto

Fecha: 2026-10-09

> **Desviaciones tras la revisión de código.** La implementación difiere de este documento en dos puntos: (1) el grafo de Koin es `internal` de `shared`; `androidApp` no depende de Koin y arranca con la función pública `startKoinAndroid`, simétrica a `startKoinIos`, en lugar de llamar a `initKoin` directamente; (2) el grafo no se comprueba con `verify()` de Koin, sino con tests que construyen el grafo real (`KoinGraphTest`, `KoinInitTest`). El resto del documento se mantiene como registro del diseño aprobado.

## Contexto

La Fase 0 del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`) tiene hecho el tema y `RubusButton`. Lo que falta se divide en tres sub-proyectos, cada uno con su spec y su plan:

| # | Sub-proyecto | Contenido |
|---|--------------|-----------|
| A | Build y esqueleto (esta spec) | Identificador definitivo, flavors, librerías, `EnvConfig`, Koin |
| B | Red y sesión | Cliente Ktor con refresh, `SecureTokenStorage` en Android, `core/model` |
| C | UI base | Componentes base restantes, fuentes, grafo de navegación |

A va primero porque valida el riesgo de toolchain (AGP 9.4.1, Kotlin 2.4.20) del que dependen B y C.

## Objetivo

El flavor `dev` compila, instala y abre una pantalla con el tema que muestra su entorno y su URL de API obtenidos por inyección. Todas las librerías del roadmap, salvo Firebase, se resuelven con el toolchain actual.

## Fuera de alcance

- Cliente HTTP, WebSocket, almacenamiento seguro y modelos (sub-proyecto B).
- Componentes de UI, fuentes y navegación (sub-proyecto C).
- Firebase y el plugin de Google Services (Fase 6): exigen un `google-services.json` por `applicationId`.
- Bundle id, firma y configuración de iOS (Fase 9).
- URLs reales de staging y producción (Fase 8).
- Keystore de release y R8 (Fase 8).

## Diseño

### 1. Identificador `com.rubusai.app`

- `androidApp`: `applicationId` y `namespace` pasan a `com.rubusai.app`.
- `shared`: `namespace` pasa a `com.rubusai.app.shared`.
- Paquete Kotlin: `com.example.rubus_ai_kmp` pasa a `com.rubusai.app` en todos los source sets de `shared` (`commonMain`, `androidMain`, `iosMain`, `commonTest`, `androidHostTest`, `iosTest`) y en `androidApp`. Las carpetas se mueven con `git mv` para conservar el historial.
- `iosApp`: solo se ajustan las referencias al paquete Kotlin, si las hay. El bundle id no cambia.

### 2. Flavors de `androidApp`

Una dimensión, `environment`. `buildFeatures.buildConfig = true`.

| Flavor | `applicationId` | Nombre visible | `BuildConfig.ENVIRONMENT` |
|--------|-----------------|----------------|---------------------------|
| `dev` | `com.rubusai.app.dev` | Rubus AI (dev) | `"DEV"` |
| `staging` | `com.rubusai.app.stg` | Rubus AI (stg) | `"STAGING"` |
| `prod` | `com.rubusai.app` | Rubus AI | `"PROD"` |

- Los sufijos se aplican con `applicationIdSuffix` (`.dev`, `.stg`).
- `BuildConfig.DEV_HOST` existe en los tres flavors. En `dev` vale la propiedad `rubus.devHost` de `local.properties` si está definida, y `10.0.2.2` si no. En `staging` y `prod` vale la cadena vacía.
- HTTP sin cifrar: solo `dev` lo permite, con un `network_security_config` en `androidApp/src/dev/` referenciado desde un manifiesto de ese flavor. `staging` y `prod` conservan el comportamiento por defecto de Android (solo HTTPS).

### 3. Librerías

Se declaran en `gradle/libs.versions.toml` y se conectan a `shared`, aunque todavía ningún código las use.

| Grupo | Librerías | Source set |
|-------|-----------|------------|
| DI | Koin core, compose, compose-viewmodel | `commonMain` |
| DI | Koin android | `androidMain` |
| Red | Ktor Client core, content-negotiation, serialization-kotlinx-json, auth, websockets, logging | `commonMain` |
| Red | Motor OkHttp | `androidMain` |
| Red | Motor Darwin | `iosMain` |
| Base | kotlinx.serialization JSON, kotlinx.coroutines, kotlinx-datetime | `commonMain` |
| Navegación | Navigation Compose multiplataforma | `commonMain` |
| Persistencia | DataStore Preferences, Room runtime, SQLite empaquetado | `commonMain` |
| Persistencia | Compilador de Room vía KSP | objetivos Android e iOS |
| Imágenes | Coil 3 Compose y Coil 3 red sobre Ktor | `commonMain` |
| Ubicación | Play Services Location | `androidMain` |

Plugins nuevos: kotlinx.serialization, KSP y Room. `androidApp` recibe además Koin android para poder llamar a `androidContext()`.

**Versiones.** Para cada librería se usa la última versión estable que declare soporte para Kotlin 2.4.20 y AGP 9.4.1. Si no compila, se prueba la versión estable anterior y después un candidato a release. Cualquier versión que no sea la última estable se anota, con el motivo, en `rubus-ai-kmp/docs/dependencias-pendientes.md`.

**Límite de la validación.** Sin entidades ni llamadas reales, esto demuestra que las dependencias se resuelven y que los plugins cargan. No demuestra que la generación de código de Room funcione; eso se comprueba en la Fase 3.

### 4. `core/config`

```kotlin
enum class Environment { DEV, STAGING, PROD }

class EnvConfig(val environment: Environment, devHost: String) {
    val apiBaseUrl: String
    val wsUrl: String
}
```

| Entorno | `apiBaseUrl` | `wsUrl` |
|---------|--------------|---------|
| `DEV` | `http://<devHost>:3001/api/v1` | `ws://<devHost>:3001/ws` |
| `STAGING` | `https://staging.api.zarza.example/api/v1` | `wss://staging.api.zarza.example/ws` |
| `PROD` | `https://api.zarza.example/api/v1` | `wss://api.zarza.example/ws` |

`devHost` solo se usa en `DEV`. Los dominios `zarza.example` son los mismos marcadores que usa `zarza_ai/lib/core/config/env_config.dart`.

### 5. `core/di`

- `AppModule.kt` declara `configModule` y los cuatro módulos vacíos ya esbozados: `networkModule`, `databaseModule`, `repositoryModule`, `viewModelModule`.
- `configModule(environment, devHost)` registra un `single` de `EnvConfig`.
- Punto de arranque único en `commonMain`:

```kotlin
fun initKoin(
    environment: Environment,
    devHost: String,
    platformModule: Module,
    appDeclaration: KoinAppDeclaration = {},
)
```

- Cada plataforma define su `platformModule` en su source set (`androidMain`, `iosMain`). Ambos quedan vacíos en este sub-proyecto; el de Android puede usar `androidContext()` cuando lleguen las implementaciones.

### 6. `core/platform`

- Se eliminan las cuatro fábricas `expect fun createX()` y sus ocho archivos `actual` (`*.android.kt`, `*.ios.kt`), que solo contienen `TODO()`.
- Se conservan las interfaces `SecureTokenStorage`, `ImageCompressor`, `LocationProvider` y `PushTokenProvider` en `commonMain`.
- Cada implementación se registrará en el `platformModule` de su plataforma cuando exista.

### 7. Arranque

- **Android.** `RubusApplication : Application` en `androidApp`, declarada en el manifiesto. Convierte `BuildConfig.ENVIRONMENT` con `Environment.valueOf` y llama a `initKoin` con `BuildConfig.DEV_HOST`, el `platformModule` de Android y `androidContext(this)`. Un valor desconocido lanza la excepción de `valueOf` y la app no arranca; es intencional.
- **iOS.** Una función en `iosMain` que llama a `initKoin` con `Environment.DEV`, `127.0.0.1` y el `platformModule` de iOS, invocada desde `iOSApp.swift`. No se puede compilar ni ejecutar en la máquina de desarrollo (Linux).
- **`App.kt`.** Pantalla provisional dentro de `RubusTheme`: nombre del entorno, `apiBaseUrl` leída de `EnvConfig` por inyección de Koin, y un `RubusButton`. El sub-proyecto C la sustituye por la navegación.

## Pruebas

En `commonTest`:

- `EnvConfig` devuelve `apiBaseUrl` y `wsUrl` correctos para cada uno de los tres entornos.
- En `DEV`, las URLs usan el `devHost` recibido.
- El grafo de Koin (los módulos comunes más un `platformModule` vacío) pasa la verificación de módulos de Koin.

Los tests de plantilla existentes se mueven con el renombrado sin cambiar su contenido.

## Terminado cuando

1. `:androidApp:assembleDevDebug`, `:androidApp:assembleStagingDebug` y `:androidApp:assembleProdDebug` compilan.
2. Los tests de `shared` ejecutables en Linux pasan.
3. El flavor `dev` se instala y la pantalla provisional muestra `DEV` y `http://10.0.2.2:3001/api/v1` (o el host configurado).
4. `rubus-ai-kmp/README.md` documenta el paquete nuevo y los comandos por flavor; `docs/dependencias-pendientes.md` refleja lo resuelto; el roadmap marca resuelto el bloqueo del `applicationId`.

## Pendientes que esta spec no cierra

- Compilar el framework de iOS en un Mac (el roadmap lo pide al cerrar la Fase 0).
- Los criterios de la Fase 0 sobre la petición de prueba al backend y el test del 401, que pertenecen al sub-proyecto B.

## Rama

Worktree `../zarza-workspace-kmp-fase0-build`, rama `feature/kmp-fase0-build`. Merge a `main` y limpieza del worktree al terminar, si todo está commiteado, compila y pasa las pruebas.
