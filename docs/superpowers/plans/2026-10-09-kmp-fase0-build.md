# KMP Fase 0 — Build y esqueleto: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar `rubus-ai-kmp` con identificador `com.rubusai.app`, flavors `dev`/`staging`/`prod`, todas las librerías del roadmap resueltas y Koin arrancando con un `EnvConfig` inyectado que la pantalla provisional muestra.

**Architecture:** `androidApp` define los flavors y expone `ENVIRONMENT` y `DEV_HOST` en su `BuildConfig`. `RubusApplication` los pasa a `initKoin(...)`, que vive en `shared/commonMain` y registra `EnvConfig` como `single`. Cada plataforma aporta un `platformModule` (vacío por ahora). `App.kt` lee `EnvConfig` con `koinInject` y lo pinta.

**Tech Stack:** Kotlin 2.4.20, AGP 9.4.1, Gradle 9.6.0, Compose Multiplatform 1.12.1, Koin 4.2.2, Ktor 3.6.0, Room 2.8.5 + KSP 2.3.12, kotlinx.serialization 1.11.0.

**Spec:** `docs/superpowers/specs/2026-10-09-kmp-fase0-build-design.md`

---

## Antes de empezar

**Directorios.** El repo es `/home/san/Proyectos/zarza-workspace`. Todo el trabajo se hace en el worktree `/home/san/Proyectos/zarza-workspace-kmp-fase0-build` (Task 0). Salvo que se indique otra cosa, los comandos se ejecutan desde `<worktree>/rubus-ai-kmp` y las rutas de archivo son relativas a esa carpeta.

**Reglas del repo.**
- Los mensajes de commit llevan solo el resumen. Nunca `Co-Authored-By` ni menciones a Claude/Anthropic.
- No cambiar de rama en `/home/san/Proyectos/zarza-workspace`; solo se trabaja en el worktree.
- `local.properties` no entra al repositorio y no se imprime su contenido.

**Máquina.** Es Linux: los objetivos de iOS no se compilan aquí. Kotlin los omite con un aviso; eso es lo esperado y no es un fallo. Nada de lo escrito para iOS (Task 6, pasos 6–7) queda verificado en este plan.

**Desviación respecto a la spec.** La spec pide que el grafo de Koin "pase la verificación de módulos de Koin". `verify()` solo existe en JVM y exige declarar a mano los tipos de los parámetros de constructor (`Environment`, `String`). Este plan lo sustituye por un test en `commonTest` que arranca el grafo real y resuelve `EnvConfig` (Task 5). Detecta lo mismo que importa hoy: un módulo que no carga o una dependencia sin registrar.

## Estructura de archivos

Tras el renombrado, el paquete base es `com.rubusai.app` y la carpeta base `com/rubusai/app/`.

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `gradle/libs.versions.toml` | Modificar | Versiones, librerías y plugins nuevos |
| `build.gradle.kts` | Modificar | Declarar los plugins nuevos con `apply false` |
| `shared/build.gradle.kts` | Modificar | Namespace, plugins y dependencias por source set |
| `androidApp/build.gradle.kts` | Modificar | Identificador, flavors, `BuildConfig`, Koin android |
| `androidApp/src/main/AndroidManifest.xml` | Modificar | Registrar `RubusApplication` |
| `androidApp/src/main/res/values/strings.xml` | Modificar | Nombre visible de `prod` |
| `androidApp/src/dev/res/values/strings.xml` | Crear | Nombre visible de `dev` |
| `androidApp/src/staging/res/values/strings.xml` | Crear | Nombre visible de `staging` |
| `androidApp/src/dev/AndroidManifest.xml` | Crear | Activar la configuración de red de `dev` |
| `androidApp/src/dev/res/xml/network_security_config.xml` | Crear | Permitir HTTP sin cifrar solo en `dev` |
| `androidApp/src/main/kotlin/com/rubusai/app/RubusApplication.kt` | Crear | Arrancar Koin con el entorno del flavor |
| `androidApp/src/main/kotlin/com/rubusai/app/MainActivity.kt` | Modificar | Quitar la vista previa que ya no puede renderizar |
| `shared/src/commonMain/kotlin/com/rubusai/app/core/config/EnvConfig.kt` | Reescribir | URLs por entorno |
| `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt` | Reescribir | Módulos de Koin comunes |
| `shared/src/commonMain/kotlin/com/rubusai/app/core/di/KoinInit.kt` | Crear | `initKoin`, punto de arranque único |
| `shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt` | Crear | `androidPlatformModule` |
| `shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt` | Crear | `iosPlatformModule` |
| `shared/src/iosMain/kotlin/com/rubusai/app/core/di/KoinIos.kt` | Crear | `startKoinIos()` para Swift |
| `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/*.kt` (4) | Modificar | Quitar las fábricas `expect` |
| `shared/src/androidMain/.../core/platform/*.android.kt` (4) | Borrar | Fábricas `actual` con `TODO()` |
| `shared/src/iosMain/.../core/platform/*.ios.kt` (4) | Borrar | Fábricas `actual` con `TODO()` |
| `shared/src/commonMain/kotlin/com/rubusai/app/App.kt` | Reescribir | Pantalla provisional |
| `shared/src/commonTest/kotlin/com/rubusai/app/core/config/EnvConfigTest.kt` | Crear | Tests de URLs |
| `shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt` | Crear | Test del grafo |
| `iosApp/iosApp/iOSApp.swift` | Modificar | Llamar a `startKoinIos()` |
| `README.md`, `docs/dependencias-pendientes.md`, `docs/roadmap-migracion-kmp.md` | Modificar | Documentación |

---

### Task 0: Worktree

**Files:** ninguno del repo.

- [ ] **Step 1: Comprobar el estado de `main`**

Desde `/home/san/Proyectos/zarza-workspace`:

```bash
git status --short && git branch --show-current
```

Expected: sin líneas de estado y `main`. Si hay cambios sin commitear, parar y avisar al usuario.

- [ ] **Step 2: Crear el worktree**

```bash
git worktree add ../zarza-workspace-kmp-fase0-build -b feature/kmp-fase0-build
```

Expected: `Preparing worktree (new branch 'feature/kmp-fase0-build')`.

- [ ] **Step 3: Copiar `local.properties`**

El archivo está en `.gitignore`, así que el worktree no lo trae y Gradle no encontraría el SDK de Android.

```bash
cp rubus-ai-kmp/local.properties ../zarza-workspace-kmp-fase0-build/rubus-ai-kmp/local.properties
```

- [ ] **Step 4: Confirmar que el proyecto compila antes de tocar nada**

Desde `/home/san/Proyectos/zarza-workspace-kmp-fase0-build/rubus-ai-kmp`:

```bash
./gradlew :androidApp:assembleDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`. Si falla aquí, el problema es previo a este plan: parar y avisar.

---

### Task 1: Renombrar a `com.rubusai.app`

**Files:**
- Mover: `shared/src/{commonMain,androidMain,iosMain,commonTest,androidHostTest,iosTest}/kotlin/com/example/rubus_ai_kmp/` → `.../kotlin/com/rubusai/app/`
- Mover: `androidApp/src/main/kotlin/com/example/rubus_ai_kmp/` → `androidApp/src/main/kotlin/com/rubusai/app/`
- Modify: `shared/build.gradle.kts`, `androidApp/build.gradle.kts`

- [ ] **Step 1: Mover las carpetas con `git mv`**

```bash
for ss in commonMain androidMain iosMain commonTest androidHostTest iosTest; do
  mkdir -p "shared/src/$ss/kotlin/com/rubusai"
  git mv "shared/src/$ss/kotlin/com/example/rubus_ai_kmp" "shared/src/$ss/kotlin/com/rubusai/app"
done
mkdir -p androidApp/src/main/kotlin/com/rubusai
git mv androidApp/src/main/kotlin/com/example/rubus_ai_kmp androidApp/src/main/kotlin/com/rubusai/app
```

- [ ] **Step 2: Sustituir el nombre del paquete en código y build**

```bash
grep -rl 'com\.example\.rubus_ai_kmp' shared/src androidApp/src shared/build.gradle.kts androidApp/build.gradle.kts \
  | xargs sed -i 's/com\.example\.rubus_ai_kmp/com.rubusai.app/g'
```

Esto cambia las declaraciones `package`, los `import`, el `namespace` de `shared` (queda `com.rubusai.app.shared`) y el `namespace` y `applicationId` de `androidApp` (quedan `com.rubusai.app`).

- [ ] **Step 3: Comprobar que no quedan referencias**

```bash
grep -rn 'com\.example\|rubus_ai_kmp' shared/src androidApp/src shared/build.gradle.kts androidApp/build.gradle.kts
find shared/src androidApp/src -type d -name example
```

Expected: ninguna salida en los dos comandos. Si `find` lista carpetas `example` vacías, borrarlas con `rmdir`.

`iosApp/Configuration/Config.xcconfig` conserva `com.example.rubus_ai_kmp` en el bundle id; es intencional (Fase 9).

- [ ] **Step 4: Compilar y probar**

```bash
./gradlew :androidApp:assembleDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Commit**

```bash
git add -A shared androidApp
git commit -m "refactor(rubus-ai-kmp): renombrar el paquete y el identificador a com.rubusai.app"
```

---

### Task 2: Librerías y plugins

Es la tarea de mayor riesgo: valida que las librerías del roadmap se resuelven con Kotlin 2.4.20 y AGP 9.4.1.

**Files:**
- Modify: `gradle/libs.versions.toml`
- Modify: `build.gradle.kts`
- Modify: `shared/build.gradle.kts`

- [ ] **Step 1: Añadir versiones al catálogo**

En `gradle/libs.versions.toml`, añadir estas líneas al final del bloque `[versions]`:

```toml
coil = "3.6.3"
datastore = "1.2.1"
koin = "4.2.2"
kotlinx-coroutines = "1.11.0"
kotlinx-datetime = "0.8.0"
kotlinx-serialization = "1.11.0"
ksp = "2.3.12"
ktor = "3.6.0"
navigation = "2.9.2"
playServicesLocation = "21.4.0"
room = "2.8.5"
sqlite = "2.7.1"
```

- [ ] **Step 2: Añadir librerías al catálogo**

Añadir al final del bloque `[libraries]`:

```toml
koin-core = { module = "io.insert-koin:koin-core", version.ref = "koin" }
koin-compose = { module = "io.insert-koin:koin-compose", version.ref = "koin" }
koin-compose-viewmodel = { module = "io.insert-koin:koin-compose-viewmodel", version.ref = "koin" }
koin-android = { module = "io.insert-koin:koin-android", version.ref = "koin" }
ktor-client-core = { module = "io.ktor:ktor-client-core", version.ref = "ktor" }
ktor-client-contentNegotiation = { module = "io.ktor:ktor-client-content-negotiation", version.ref = "ktor" }
ktor-serialization-kotlinxJson = { module = "io.ktor:ktor-serialization-kotlinx-json", version.ref = "ktor" }
ktor-client-auth = { module = "io.ktor:ktor-client-auth", version.ref = "ktor" }
ktor-client-websockets = { module = "io.ktor:ktor-client-websockets", version.ref = "ktor" }
ktor-client-logging = { module = "io.ktor:ktor-client-logging", version.ref = "ktor" }
ktor-client-okhttp = { module = "io.ktor:ktor-client-okhttp", version.ref = "ktor" }
ktor-client-darwin = { module = "io.ktor:ktor-client-darwin", version.ref = "ktor" }
kotlinx-serialization-json = { module = "org.jetbrains.kotlinx:kotlinx-serialization-json", version.ref = "kotlinx-serialization" }
kotlinx-coroutines-core = { module = "org.jetbrains.kotlinx:kotlinx-coroutines-core", version.ref = "kotlinx-coroutines" }
kotlinx-datetime = { module = "org.jetbrains.kotlinx:kotlinx-datetime", version.ref = "kotlinx-datetime" }
navigation-compose = { module = "org.jetbrains.androidx.navigation:navigation-compose", version.ref = "navigation" }
androidx-datastore-preferences = { module = "androidx.datastore:datastore-preferences", version.ref = "datastore" }
androidx-room-runtime = { module = "androidx.room:room-runtime", version.ref = "room" }
androidx-room-compiler = { module = "androidx.room:room-compiler", version.ref = "room" }
androidx-sqlite-bundled = { module = "androidx.sqlite:sqlite-bundled", version.ref = "sqlite" }
coil-compose = { module = "io.coil-kt.coil3:coil-compose", version.ref = "coil" }
coil-network-ktor = { module = "io.coil-kt.coil3:coil-network-ktor3", version.ref = "coil" }
play-services-location = { module = "com.google.android.gms:play-services-location", version.ref = "playServicesLocation" }
```

- [ ] **Step 3: Añadir plugins al catálogo**

Añadir al final del bloque `[plugins]`:

```toml
kotlinSerialization = { id = "org.jetbrains.kotlin.plugin.serialization", version.ref = "kotlin" }
ksp = { id = "com.google.devtools.ksp", version.ref = "ksp" }
room = { id = "androidx.room", version.ref = "room" }
```

- [ ] **Step 4: Declarar los plugins en el build raíz**

`build.gradle.kts` completo:

```kotlin
plugins {
    // this is necessary to avoid the plugins to be loaded multiple times
    // in each subproject's classloader
    alias(libs.plugins.androidApplication) apply false
    alias(libs.plugins.androidMultiplatformLibrary) apply false
    alias(libs.plugins.composeMultiplatform) apply false
    alias(libs.plugins.composeCompiler) apply false
    alias(libs.plugins.kotlinMultiplatform) apply false
    alias(libs.plugins.kotlinSerialization) apply false
    alias(libs.plugins.ksp) apply false
    alias(libs.plugins.room) apply false
}
```

- [ ] **Step 5: Conectar plugins y dependencias en `shared`**

`shared/build.gradle.kts` completo:

```kotlin
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlinMultiplatform)
    alias(libs.plugins.androidMultiplatformLibrary)
    alias(libs.plugins.composeMultiplatform)
    alias(libs.plugins.composeCompiler)
    alias(libs.plugins.kotlinSerialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.room)
}

kotlin {
    listOf(
        iosArm64(),
        iosSimulatorArm64()
    ).forEach { iosTarget ->
        iosTarget.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }
    
    android {
       namespace = "com.rubusai.app.shared"
       compileSdk = libs.versions.android.compileSdk.get().toInt()
       minSdk = libs.versions.android.minSdk.get().toInt()
    
       compilerOptions {
           jvmTarget = JvmTarget.JVM_11
       }
       androidResources {
           enable = true
       }
       withHostTest {
           isIncludeAndroidResources = true
       }
       withDeviceTestBuilder {
           sourceSetTreeName = "test"
       }.configure {
           instrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
       }
    }
    
    sourceSets {
        androidMain.dependencies {
            implementation(libs.compose.uiToolingPreview)
            implementation(libs.compose.uiTooling)
            implementation(libs.koin.android)
            implementation(libs.ktor.client.okhttp)
            implementation(libs.play.services.location)
        }
        commonMain.dependencies {
            implementation(libs.compose.runtime)
            implementation(libs.compose.foundation)
            implementation(libs.compose.material3)
            implementation(libs.compose.ui)
            implementation(libs.compose.components.resources)
            implementation(libs.compose.uiToolingPreview)
            implementation(libs.androidx.lifecycle.viewmodelCompose)
            implementation(libs.androidx.lifecycle.runtimeCompose)
            implementation(libs.koin.core)
            implementation(libs.koin.compose)
            implementation(libs.koin.compose.viewmodel)
            implementation(libs.ktor.client.core)
            implementation(libs.ktor.client.contentNegotiation)
            implementation(libs.ktor.serialization.kotlinxJson)
            implementation(libs.ktor.client.auth)
            implementation(libs.ktor.client.websockets)
            implementation(libs.ktor.client.logging)
            implementation(libs.kotlinx.serialization.json)
            implementation(libs.kotlinx.coroutines.core)
            implementation(libs.kotlinx.datetime)
            implementation(libs.navigation.compose)
            implementation(libs.androidx.datastore.preferences)
            implementation(libs.androidx.room.runtime)
            implementation(libs.androidx.sqlite.bundled)
            implementation(libs.coil.compose)
            implementation(libs.coil.network.ktor)
        }
        iosMain.dependencies {
            implementation(libs.ktor.client.darwin)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
        }
    }
}

dependencies {
    androidRuntimeClasspath(libs.compose.uiTooling)
    add("kspAndroid", libs.androidx.room.compiler)
    add("kspIosArm64", libs.androidx.room.compiler)
    add("kspIosSimulatorArm64", libs.androidx.room.compiler)
}

room {
    schemaDirectory("$projectDir/schemas")
}
```

- [ ] **Step 6: Compilar y probar**

```bash
./gradlew :androidApp:assembleDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`. Los avisos sobre objetivos de iOS deshabilitados en este host son normales.

- [ ] **Step 7: Si falla, aplicar la contingencia que corresponda**

Cambiar una sola cosa cada vez y repetir el Step 6. Anotar cada cambio aplicado: se documenta en la Task 7.

| Síntoma | Cambio |
|---------|--------|
| Error de resolución o de metadatos de Kotlin en `navigation-compose` | `navigation = "2.10.0-rc01"` |
| Error de resolución o de metadatos de Kotlin en `kotlinx-serialization-json` | `kotlinx-serialization = "1.12.0-RC"` |
| El plugin `androidx.room` falla al configurar el proyecto (no reconoce el plugin `com.android.kotlin.multiplatform.library`) | Quitar `alias(libs.plugins.room)` de los dos `build.gradle.kts`, quitar la entrada `room` de `[plugins]`, y sustituir el bloque `room { ... }` por `ksp { arg("room.schemaLocation", "$projectDir/schemas") }` |
| No existe la configuración `kspAndroid` | Ejecutar `./gradlew :shared:dependencies \| grep -i '^ksp'` y usar el nombre de configuración de Android que aparezca |
| Otra librería incompatible con Kotlin 2.4.20 | Bajar esa librería a su versión estable anterior; si tampoco compila, probar su candidato a release más reciente |

Si tras dos intentos con una misma librería sigue fallando, parar y presentar el error al usuario en lugar de seguir probando versiones.

- [ ] **Step 8: Commit**

```bash
git add gradle/libs.versions.toml build.gradle.kts shared/build.gradle.kts
git commit -m "build(rubus-ai-kmp): agregar las librerías del roadmap al catálogo y a shared"
```

---

### Task 3: Flavors de `androidApp`

**Files:**
- Modify: `androidApp/build.gradle.kts`
- Modify: `androidApp/src/main/res/values/strings.xml`
- Create: `androidApp/src/dev/res/values/strings.xml`
- Create: `androidApp/src/staging/res/values/strings.xml`
- Create: `androidApp/src/dev/AndroidManifest.xml`
- Create: `androidApp/src/dev/res/xml/network_security_config.xml`

- [ ] **Step 1: Definir los flavors**

`androidApp/build.gradle.kts` completo:

```kotlin
import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.androidApplication)
    alias(libs.plugins.composeCompiler)
}

// Host del backend para el flavor dev. `rubus.devHost` en local.properties lo
// sobrescribe para probar en un teléfono físico contra un backend en la LAN.
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use(::load)
}
val devHost: String = localProperties.getProperty("rubus.devHost") ?: "10.0.2.2"

kotlin {
    compilerOptions {
        jvmTarget = JvmTarget.JVM_11
    }
}
dependencies {
    implementation(project(":shared"))

    implementation(libs.androidx.activity.compose)

    implementation(libs.compose.uiToolingPreview)
    debugImplementation(libs.compose.uiTooling)
}

android {
    namespace = "com.rubusai.app"
    compileSdk = libs.versions.android.compileSdk.get().toInt()

    defaultConfig {
        applicationId = "com.rubusai.app"
        minSdk = libs.versions.android.minSdk.get().toInt()
        targetSdk = libs.versions.android.targetSdk.get().toInt()
        versionCode = 1
        versionName = "1.0"
    }
    flavorDimensions += "environment"
    productFlavors {
        create("dev") {
            dimension = "environment"
            applicationIdSuffix = ".dev"
            buildConfigField("String", "ENVIRONMENT", "\"DEV\"")
            buildConfigField("String", "DEV_HOST", "\"$devHost\"")
        }
        create("staging") {
            dimension = "environment"
            applicationIdSuffix = ".stg"
            buildConfigField("String", "ENVIRONMENT", "\"STAGING\"")
            buildConfigField("String", "DEV_HOST", "\"\"")
        }
        create("prod") {
            dimension = "environment"
            buildConfigField("String", "ENVIRONMENT", "\"PROD\"")
            buildConfigField("String", "DEV_HOST", "\"\"")
        }
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
}
```

- [ ] **Step 2: Nombre visible por flavor**

`androidApp/src/main/res/values/strings.xml` (lo usa `prod`):

```xml
<resources>
    <string name="app_name">Rubus AI</string>
</resources>
```

`androidApp/src/dev/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Rubus AI (dev)</string>
</resources>
```

`androidApp/src/staging/res/values/strings.xml`:

```xml
<resources>
    <string name="app_name">Rubus AI (stg)</string>
</resources>
```

- [ ] **Step 3: HTTP sin cifrar solo en `dev`**

`androidApp/src/dev/res/xml/network_security_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
```

`androidApp/src/dev/AndroidManifest.xml` (se fusiona con el de `main`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application android:networkSecurityConfig="@xml/network_security_config" />

</manifest>
```

- [ ] **Step 4: Compilar los tres flavors**

```bash
./gradlew :androidApp:assembleDevDebug :androidApp:assembleStagingDebug :androidApp:assembleProdDebug
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 5: Comprobar identificador y configuración de red de cada flavor**

```bash
for f in dev staging prod; do
  m=$(find androidApp/build/intermediates/merged_manifests/${f}Debug -name AndroidManifest.xml | head -1)
  echo "$f: $(grep -o 'package="[^"]*"' "$m") $(grep -o 'networkSecurityConfig="[^"]*"' "$m")"
done
```

Expected:

```
dev: package="com.rubusai.app.dev" networkSecurityConfig="@xml/network_security_config"
staging: package="com.rubusai.app.stg" 
prod: package="com.rubusai.app" 
```

Si la carpeta `merged_manifests` no existe en esta versión de AGP, localizar el manifiesto fusionado con `find androidApp/build -path '*devDebug*' -name AndroidManifest.xml` y aplicar los mismos `grep`.

- [ ] **Step 6: Commit**

```bash
git add androidApp
git commit -m "feat(rubus-ai-kmp): flavors dev, staging y prod en androidApp"
```

---

### Task 4: `EnvConfig`

**Files:**
- Create: `shared/src/commonTest/kotlin/com/rubusai/app/core/config/EnvConfigTest.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/config/EnvConfig.kt`

- [ ] **Step 1: Escribir los tests**

`shared/src/commonTest/kotlin/com/rubusai/app/core/config/EnvConfigTest.kt`:

```kotlin
package com.rubusai.app.core.config

import kotlin.test.Test
import kotlin.test.assertEquals

class EnvConfigTest {

    @Test
    fun devUsaElHostRecibido() {
        val config = EnvConfig(Environment.DEV, devHost = "192.168.1.50")

        assertEquals("http://192.168.1.50:3001/api/v1", config.apiBaseUrl)
        assertEquals("ws://192.168.1.50:3001/ws", config.wsUrl)
    }

    @Test
    fun stagingIgnoraElHostDeDev() {
        val config = EnvConfig(Environment.STAGING, devHost = "192.168.1.50")

        assertEquals("https://staging.api.zarza.example/api/v1", config.apiBaseUrl)
        assertEquals("wss://staging.api.zarza.example/ws", config.wsUrl)
    }

    @Test
    fun prodIgnoraElHostDeDev() {
        val config = EnvConfig(Environment.PROD, devHost = "192.168.1.50")

        assertEquals("https://api.zarza.example/api/v1", config.apiBaseUrl)
        assertEquals("wss://api.zarza.example/ws", config.wsUrl)
    }

    @Test
    fun exponeElEntorno() {
        assertEquals(Environment.STAGING, EnvConfig(Environment.STAGING, devHost = "").environment)
    }
}
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.config.EnvConfigTest"
```

Expected: FAIL en compilación, porque `EnvConfig` todavía es un `object` sin constructor (`Unresolved reference` o error de argumentos en `EnvConfig(...)`).

- [ ] **Step 3: Implementar**

`shared/src/commonMain/kotlin/com/rubusai/app/core/config/EnvConfig.kt` completo:

```kotlin
package com.rubusai.app.core.config

enum class Environment {
    DEV,
    STAGING,
    PROD,
}

/**
 * URLs del backend para un entorno. [devHost] solo se usa en [Environment.DEV].
 * Los dominios de staging y prod son marcadores hasta que existan los reales.
 */
class EnvConfig(val environment: Environment, devHost: String) {
    val apiBaseUrl: String = when (environment) {
        Environment.DEV -> "http://$devHost:3001/api/v1"
        Environment.STAGING -> "https://staging.api.zarza.example/api/v1"
        Environment.PROD -> "https://api.zarza.example/api/v1"
    }

    val wsUrl: String = when (environment) {
        Environment.DEV -> "ws://$devHost:3001/ws"
        Environment.STAGING -> "wss://staging.api.zarza.example/ws"
        Environment.PROD -> "wss://api.zarza.example/ws"
    }
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.config.EnvConfigTest"
```

Expected: `BUILD SUCCESSFUL`, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/config shared/src/commonTest/kotlin/com/rubusai/app/core/config
git commit -m "feat(rubus-ai-kmp): EnvConfig con URL de API y de WebSocket por entorno"
```

---

### Task 5: Módulos de Koin y limpieza de `core/platform`

**Files:**
- Create: `shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt`
- Create: `shared/src/commonMain/kotlin/com/rubusai/app/core/di/KoinInit.kt`
- Create: `shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt`
- Create: `shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt`
- Modify: los 4 archivos de `shared/src/commonMain/kotlin/com/rubusai/app/core/platform/`
- Delete: los 4 `*.android.kt` y los 4 `*.ios.kt` de `core/platform`

- [ ] **Step 1: Escribir el test del grafo**

`shared/src/commonTest/kotlin/com/rubusai/app/core/di/KoinGraphTest.kt`:

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import kotlin.test.Test
import kotlin.test.assertEquals
import org.koin.dsl.koinApplication
import org.koin.dsl.module

class KoinGraphTest {

    @Test
    fun elGrafoResuelveEnvConfigConElEntornoRecibido() {
        val platformModule = module { }
        val app = koinApplication {
            modules(appModules(Environment.DEV, devHost = "10.0.2.2") + platformModule)
        }

        try {
            val config = app.koin.get<EnvConfig>()

            assertEquals(Environment.DEV, config.environment)
            assertEquals("http://10.0.2.2:3001/api/v1", config.apiBaseUrl)
        } finally {
            app.close()
        }
    }
}
```

- [ ] **Step 2: Ejecutar y ver que falla**

```bash
./gradlew :shared:testAndroidHostTest --tests "com.rubusai.app.core.di.KoinGraphTest"
```

Expected: FAIL en compilación con `Unresolved reference 'appModules'`.

- [ ] **Step 3: Módulos comunes**

`shared/src/commonMain/kotlin/com/rubusai/app/core/di/AppModule.kt` completo:

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.config.Environment
import org.koin.core.module.Module
import org.koin.dsl.module

fun configModule(environment: Environment, devHost: String): Module = module {
    single { EnvConfig(environment, devHost) }
}

val networkModule = module { }
val databaseModule = module { }
val repositoryModule = module { }
val viewModelModule = module { }

fun appModules(environment: Environment, devHost: String): List<Module> = listOf(
    configModule(environment, devHost),
    networkModule,
    databaseModule,
    repositoryModule,
    viewModelModule,
)
```

- [ ] **Step 4: Punto de arranque**

`shared/src/commonMain/kotlin/com/rubusai/app/core/di/KoinInit.kt`:

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.config.Environment
import org.koin.core.KoinApplication
import org.koin.core.context.startKoin
import org.koin.core.module.Module
import org.koin.dsl.KoinAppDeclaration

/**
 * Único punto de arranque de Koin. Cada plataforma lo llama una vez con su entorno
 * y su módulo de plataforma; [appDeclaration] permite añadir configuración propia
 * de la plataforma (por ejemplo `androidContext`).
 */
fun initKoin(
    environment: Environment,
    devHost: String,
    platformModule: Module,
    appDeclaration: KoinAppDeclaration = {},
): KoinApplication = startKoin {
    appDeclaration()
    modules(appModules(environment, devHost) + platformModule)
}
```

- [ ] **Step 5: Módulos de plataforma**

`shared/src/androidMain/kotlin/com/rubusai/app/core/di/PlatformModule.android.kt`:

```kotlin
package com.rubusai.app.core.di

import org.koin.core.module.Module
import org.koin.dsl.module

/** Implementaciones de `core/platform` para Android. Se registran al crearse. */
val androidPlatformModule: Module = module { }
```

`shared/src/iosMain/kotlin/com/rubusai/app/core/di/PlatformModule.ios.kt`:

```kotlin
package com.rubusai.app.core.di

import org.koin.core.module.Module
import org.koin.dsl.module

/** Implementaciones de `core/platform` para iOS. Se registran al crearse. */
val iosPlatformModule: Module = module { }
```

- [ ] **Step 6: Borrar las fábricas `actual`**

```bash
git rm shared/src/androidMain/kotlin/com/rubusai/app/core/platform/*.android.kt \
       shared/src/iosMain/kotlin/com/rubusai/app/core/platform/*.ios.kt
```

Expected: 8 líneas `rm '...'`.

- [ ] **Step 7: Quitar las fábricas `expect` de las interfaces**

`shared/src/commonMain/kotlin/com/rubusai/app/core/platform/SecureTokenStorage.kt` completo:

```kotlin
package com.rubusai.app.core.platform

/** Almacenamiento seguro de los tokens de sesión. */
interface SecureTokenStorage
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/platform/ImageCompressor.kt` completo:

```kotlin
package com.rubusai.app.core.platform

/** Compresión de imágenes antes de subirlas. */
interface ImageCompressor
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/platform/LocationProvider.kt` completo:

```kotlin
package com.rubusai.app.core.platform

/** Acceso a la ubicación GPS del dispositivo. */
interface LocationProvider
```

`shared/src/commonMain/kotlin/com/rubusai/app/core/platform/PushTokenProvider.kt` completo:

```kotlin
package com.rubusai.app.core.platform

/** Obtención del token de notificaciones push. */
interface PushTokenProvider
```

- [ ] **Step 8: Comprobar que no quedan fábricas**

```bash
grep -rn 'expect fun\|actual fun\|createSecureTokenStorage\|createImageCompressor\|createLocationProvider\|createPushTokenProvider' shared/src
```

Expected: ninguna salida.

- [ ] **Step 9: Ejecutar todos los tests de `shared`**

```bash
./gradlew :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`; pasan `KoinGraphTest`, `EnvConfigTest` y los dos tests de plantilla.

- [ ] **Step 10: Commit**

```bash
git add -A shared/src
git commit -m "feat(rubus-ai-kmp): módulos de Koin e initKoin; quitar las fábricas de core/platform"
```

---

### Task 6: Arranque y pantalla provisional

**Files:**
- Modify: `androidApp/build.gradle.kts`
- Create: `androidApp/src/main/kotlin/com/rubusai/app/RubusApplication.kt`
- Modify: `androidApp/src/main/AndroidManifest.xml`
- Modify: `androidApp/src/main/kotlin/com/rubusai/app/MainActivity.kt`
- Modify: `shared/src/commonMain/kotlin/com/rubusai/app/App.kt`
- Create: `shared/src/iosMain/kotlin/com/rubusai/app/core/di/KoinIos.kt`
- Modify: `iosApp/iosApp/iOSApp.swift`

- [ ] **Step 1: Koin en `androidApp`**

En `androidApp/build.gradle.kts`, dentro del bloque `dependencies`, añadir una línea después de `implementation(libs.androidx.activity.compose)`:

```kotlin
    implementation(libs.koin.android)
```

Hace falta porque `shared` declara Koin como `implementation` y `androidApp` usa sus tipos (`androidContext`, `Module`).

- [ ] **Step 2: `RubusApplication`**

`androidApp/src/main/kotlin/com/rubusai/app/RubusApplication.kt`:

```kotlin
package com.rubusai.app

import android.app.Application
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.di.androidPlatformModule
import com.rubusai.app.core.di.initKoin
import org.koin.android.ext.koin.androidContext

class RubusApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Un ENVIRONMENT desconocido lanza aquí y la app no arranca; es intencional.
        initKoin(
            environment = Environment.valueOf(BuildConfig.ENVIRONMENT),
            devHost = BuildConfig.DEV_HOST,
            platformModule = androidPlatformModule,
        ) {
            androidContext(this@RubusApplication)
        }
    }
}
```

- [ ] **Step 3: Registrarla en el manifiesto**

En `androidApp/src/main/AndroidManifest.xml`, añadir el atributo `android:name` como primer atributo de `<application>`:

```xml
    <application
        android:name=".RubusApplication"
        android:allowBackup="true"
```

El resto del archivo no cambia.

- [ ] **Step 4: Quitar la vista previa de `MainActivity`**

`App()` ahora necesita Koin arrancado, y una vista previa de Android Studio no ejecuta `RubusApplication`.

`androidApp/src/main/kotlin/com/rubusai/app/MainActivity.kt` completo:

```kotlin
package com.rubusai.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        enableEdgeToEdge()
        super.onCreate(savedInstanceState)

        setContent {
            App()
        }
    }
}
```

- [ ] **Step 5: Pantalla provisional**

`shared/src/commonMain/kotlin/com/rubusai/app/App.kt` completo:

```kotlin
package com.rubusai.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.theme.RubusTheme
import org.koin.compose.koinInject

// Pantalla provisional: comprueba a simple vista que flavor, Koin y tema están
// conectados. La sustituye la navegación.
@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()

    RubusTheme {
        Surface(
            modifier = Modifier.fillMaxSize(),
            color = MaterialTheme.colorScheme.background,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .safeDrawingPadding()
                    .padding(24.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = envConfig.environment.name,
                    style = MaterialTheme.typography.headlineLarge,
                )
                Text(
                    text = envConfig.apiBaseUrl,
                    style = MaterialTheme.typography.bodyLarge,
                )
                RubusButton(text = "Continuar", onClick = {})
            }
        }
    }
}
```

- [ ] **Step 6: Arranque de Koin para iOS**

`shared/src/iosMain/kotlin/com/rubusai/app/core/di/KoinIos.kt`:

```kotlin
package com.rubusai.app.core.di

import com.rubusai.app.core.config.Environment

/** Arranque de Koin desde Swift: `KoinIosKt.startKoinIos()`. Siempre DEV hasta la Fase 9. */
fun startKoinIos() {
    initKoin(
        environment = Environment.DEV,
        devHost = "127.0.0.1",
        platformModule = iosPlatformModule,
    )
}
```

- [ ] **Step 7: Llamarlo desde Swift**

`iosApp/iosApp/iOSApp.swift` completo:

```swift
import SwiftUI
import Shared

@main
struct iOSApp: App {
    init() {
        KoinIosKt.startKoinIos()
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
```

Los pasos 6 y 7 no se pueden compilar en Linux. Quedan sin verificar hasta que se abra el proyecto en un Mac.

- [ ] **Step 8: Compilar los tres flavors y ejecutar los tests**

```bash
./gradlew :androidApp:assembleDevDebug :androidApp:assembleStagingDebug :androidApp:assembleProdDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 9: Comprobar `BuildConfig` del flavor `dev`**

```bash
grep -rh 'ENVIRONMENT\|DEV_HOST' $(find androidApp/build/generated -path '*dev*' -name BuildConfig.java | head -1)
```

Expected: una línea con `ENVIRONMENT = "DEV"` y otra con `DEV_HOST = "10.0.2.2"` (o el host de `rubus.devHost` si está definido en `local.properties`).

- [ ] **Step 10: Instalar en un dispositivo, si hay alguno**

```bash
adb devices
```

Si aparece un dispositivo o emulador:

```bash
./gradlew :androidApp:installDevDebug
adb shell am start -n com.rubusai.app.dev/com.rubusai.app.MainActivity
adb shell pidof com.rubusai.app.dev
```

Expected: `pidof` imprime un número (la app sigue viva). La pantalla debe mostrar `DEV`, `http://10.0.2.2:3001/api/v1` y el botón `CONTINUAR`, y el icono debe llamarse "Rubus AI (dev)".

Si no hay dispositivo, no inventar el resultado: anotar que el criterio 3 de la spec queda pendiente de comprobación por el usuario y seguir.

- [ ] **Step 11: Commit**

```bash
git add androidApp shared/src iosApp/iosApp/iOSApp.swift
git commit -m "feat(rubus-ai-kmp): arrancar Koin por flavor y mostrar el entorno en la pantalla provisional"
```

---

### Task 7: Documentación

**Files:**
- Modify: `README.md`
- Modify: `docs/dependencias-pendientes.md`
- Modify: `docs/roadmap-migracion-kmp.md`

- [ ] **Step 1: README — paquete base**

En `README.md`, sustituir la línea:

```
Dentro de `shared/src/commonMain/kotlin/<paquete base>/`. Las carpetas se crean cuando llega su primer archivo.
```

por:

```
Dentro de `shared/src/commonMain/kotlin/com/rubusai/app/` (paquete base `com.rubusai.app`). Las carpetas se crean cuando llega su primer archivo.
```

- [ ] **Step 2: README — comandos por flavor**

Sustituir la línea:

```
- Android app: `./gradlew :androidApp:assembleDebug`
```

por:

```
- Android app: `./gradlew :androidApp:assembleDevDebug` (o `installDevDebug` para instalarla). La app tiene tres flavors:

  | Flavor | `applicationId` | Backend |
  |--------|-----------------|---------|
  | `dev` | `com.rubusai.app.dev` | `http://<host>:3001`, HTTP sin cifrar permitido |
  | `staging` | `com.rubusai.app.stg` | `https://staging.api.zarza.example` (marcador) |
  | `prod` | `com.rubusai.app` | `https://api.zarza.example` (marcador) |

  En `dev` el host es `10.0.2.2` (el equipo visto desde el emulador). Para un teléfono físico, añadir
  `rubus.devHost=<ip del equipo en la LAN>` a `local.properties`.
```

- [ ] **Step 3: Dependencias pendientes**

`docs/dependencias-pendientes.md` completo. Si en la Task 2 se aplicó alguna contingencia, añadir una fila por cada una en la tabla "Versiones que no son la última estable" con la librería, la versión usada y el motivo; si no se aplicó ninguna, dejar la frase tal cual.

```markdown
# Dependencias pendientes

Estado de las dependencias que la estructura de paquetes necesita.

## Ya en el build

Declaradas en `gradle/libs.versions.toml` y conectadas a `shared` desde la Fase 0: Koin, Ktor Client (con WebSockets y Auth), kotlinx.serialization, kotlinx.coroutines, kotlinx-datetime, Navigation Compose, DataStore Preferences, Room con KSP y SQLite empaquetado, Coil 3 y Play Services Location.

Todavía ningún código usa Ktor, Room, DataStore, Navigation, Coil ni Play Services Location: su presencia solo demuestra que se resuelven con Kotlin 2.4.20 y AGP 9.4.1. La generación de código de Room no está probada hasta que exista la primera entidad (Fase 3).

## Versiones que no son la última estable

Ninguna.

## Pendientes

| Dependencia | Cuándo | Motivo |
|-------------|--------|--------|
| Firebase BoM, Firebase Messaging y plugin de Google Services | Fase 6 | Exigen un `google-services.json` por `applicationId` |
| Trabajo en segundo plano para la sincronización (WorkManager) | Sin fecha | Mejora posible, fuera del roadmap |

## Sin verificar

El motor Darwin de Ktor y el código de `iosMain` no se han compilado: la máquina de desarrollo es Linux. Hay que compilar el framework de iOS en un Mac al cerrar la Fase 0.
```

- [ ] **Step 4: Roadmap — bloqueo resuelto**

En `docs/roadmap-migracion-kmp.md`, sustituir la fila:

```
| `applicationId` definitivo (hoy `com.example.rubus_ai_kmp`) | Fase 6 (Firebase); conviene decidirlo en la fase 0 |
```

por:

```
| ~~`applicationId` definitivo~~ — resuelto el 2026-10-09: `com.rubusai.app` (`.dev` y `.stg` en los otros flavors) | — |
```

- [ ] **Step 5: Commit**

```bash
git add README.md docs
git commit -m "docs(rubus-ai-kmp): documentar flavors, paquete nuevo y estado de dependencias"
```

---

### Task 8: Verificación final y merge

**Files:** ninguno.

- [ ] **Step 1: Build limpio completo**

```bash
./gradlew clean :androidApp:assembleDevDebug :androidApp:assembleStagingDebug :androidApp:assembleProdDebug :shared:testAndroidHostTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 2: Árbol limpio**

Desde `/home/san/Proyectos/zarza-workspace-kmp-fase0-build`:

```bash
git status --short && git log --oneline main..HEAD
```

Expected: sin líneas de estado (el `local.properties` copiado está ignorado) y siete commits, uno por cada Task de la 1 a la 7, salvo que alguna contingencia añadiera otro.

- [ ] **Step 3: Informar al usuario**

Resumir: resultado del build y de los tests, contingencias aplicadas en la Task 2, si la instalación en dispositivo se comprobó o queda pendiente, y que lo de iOS está escrito pero sin compilar.

- [ ] **Step 4: Merge a `main`**

Solo si los pasos 1 y 2 salieron bien. Desde `/home/san/Proyectos/zarza-workspace` (que ya está en `main`; no se cambia de rama):

```bash
git status --short && git branch --show-current
git merge --no-ff feature/kmp-fase0-build -m "Merge feature/kmp-fase0-build: build y esqueleto de la fase 0 del KMP"
```

Expected: `main`, sin cambios pendientes, y merge sin conflictos. Si hay conflictos o cambios sin commitear en `main`, no resolver por cuenta propia: avisar al usuario.

- [ ] **Step 5: Limpiar**

```bash
git worktree remove ../zarza-workspace-kmp-fase0-build
git branch -d feature/kmp-fase0-build
```

`git worktree remove` puede negarse por el `local.properties` sin seguimiento; en ese caso borrar ese archivo del worktree y repetir. No usar `--force` si hay cualquier otro archivo sin commitear.
