# KMP Fase 0 (C): navegación, componentes base y tipografía — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar la Fase 0 del KMP con la tipografía Lexend empaquetada, cuatro componentes base del design system y un grafo de navegación con todas las rutas migradas como marcadores.

**Architecture:** Lexend variable como recurso de Compose (`composeResources/font`) cargado en `RubusTheme`. Componentes sin texto fijo en `core/designsystem/component`, con el estilo de `RubusButton` (borde 2 dp, canto inferior 2 dp). Navigation Compose 2.9.2 con rutas tipadas `@Serializable` en `core/navigation`; la pantalla provisional de `App.kt` pasa a `dev/DiagnosticoScreen` y, con un catálogo de componentes, solo se registra en el flavor `dev`.

**Tech Stack:** Kotlin 2.4.20, Compose Multiplatform 1.12.1, Material3 1.12.0-alpha03, Navigation Compose 2.9.2, kotlinx.serialization, Koin 4.2.2; para tests de UI Robolectric 4.16 + `ui-test-junit4`.

**Spec:** `docs/superpowers/specs/2026-10-26-kmp-fase0-cierre-design.md`

## Reglas para todo el plan

- Todo se ejecuta en el worktree `/home/san/Proyectos/zarza-workspace-kmp-fase0-cierre`, proyecto `rubus-ai-kmp`. Los comandos `./gradlew` se lanzan desde `rubus-ai-kmp/`.
- Verificación de cada tarea: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`. Tras ella, confirmar en `shared/build/test-results/testAndroidHostTest/*.xml` que las clases nuevas se ejecutaron, con `failures="0" errors="0"`.
- Línea base antes de empezar: 81 tests host, 0 fallos.
- Commits en español, estilo del repositorio (`feat(rubus-ai-kmp): …`), **sin** línea `Co-Authored-By` ni mención a Claude/Anthropic.
- Comentarios en español, cortos, explicando el porqué; misma densidad que el código vecino.
- Ningún componente del design system lleva texto fijo: etiquetas y mensajes los pasa quien llama.
- Un informe vacío ("placeholder") no es aceptable; el informe lleva los comandos y la salida real.

## Estructura de archivos

| Archivo | Acción | Responsabilidad |
|---------|--------|-----------------|
| `shared/build.gradle.kts` | Modificar | Paquete de `Res`; dependencias de test de UI (Task 2) |
| `gradle/libs.versions.toml` | Modificar | Robolectric, `ui-test-junit4`, `ui-test-manifest` (Task 2) |
| `shared/src/commonMain/composeResources/font/lexend.ttf` | Crear | Lexend variable (peso 100–900) |
| `docs/licencias/Lexend-OFL.txt` (en `rubus-ai-kmp/`) | Crear | Licencia OFL de la fuente |
| `…/core/designsystem/theme/Type.kt` | Modificar | `rubusTypography(fontFamily)` pura y `rememberRubusTypography()` |
| `…/core/designsystem/theme/Theme.kt` | Modificar | Usa `rememberRubusTypography()` |
| `…/core/designsystem/theme/Shape.kt` | Modificar | Añade `RubusDimens.CardRadius` |
| `…/core/designsystem/component/RubusLoadingState.kt` | Crear | Indicador de carga |
| `…/core/designsystem/component/RubusErrorState.kt` | Crear | Mensaje de error con reintento opcional |
| `…/core/designsystem/component/RubusCard.kt` | Crear | Tarjeta con borde y canto |
| `…/core/designsystem/component/RubusTextField.kt` | Crear | Campo de texto |
| `…/core/navigation/Route.kt` | Crear | Rutas tipadas, ruta inicial y `registeredRoutes` |
| `…/core/navigation/RubusNavHost.kt` | Crear | `NavHost` con marcadores |
| `…/dev/DiagnosticoScreen.kt` | Crear | Pantalla provisional movida desde `App.kt` |
| `…/dev/CatalogoScreen.kt` | Crear | Catálogo de componentes |
| `…/App.kt` | Modificar | Tema + `RubusNavHost` |
| `…/commonTest/…/theme/TypographyTest.kt` | Crear | Familia y pesos de la escala |
| `…/commonTest/…/navigation/RoutesTest.kt` | Crear | Rutas por entorno |
| `…/androidHostTest/…/component/*Test.kt` | Crear | Tests de UI (si la Task 2 sale por la Rama A) |

`…` = `shared/src/<conjunto>/kotlin/com/rubusai/app`.

---

### Task 0: Worktree

**Files:** ninguno.

- [ ] **Step 1: Crear el worktree desde `main`**

Desde `/home/san/Proyectos/zarza-workspace` (rama `main`, sin cambios pendientes; el spec y este plan ya están commiteados):

```bash
git status --short && git branch --show-current
git worktree add ../zarza-workspace-kmp-fase0-cierre -b feature/kmp-fase0-cierre
cp rubus-ai-kmp/local.properties ../zarza-workspace-kmp-fase0-cierre/rubus-ai-kmp/local.properties
```

Expected: `main`, sin líneas de estado; el worktree se crea. `local.properties` está ignorado por git y sin él Gradle no encuentra el SDK de Android.

- [ ] **Step 2: Línea base**

```bash
cd /home/san/Proyectos/zarza-workspace-kmp-fase0-cierre/rubus-ai-kmp
./gradlew :shared:testAndroidHostTest :androidApp:assemble
```

Expected: `BUILD SUCCESSFUL`; la suma de `tests` de los XML en `shared/build/test-results/testAndroidHostTest/` es 81.

---

### Task 1: Recursos de Compose y Lexend

**Files:**
- Modify: `rubus-ai-kmp/shared/build.gradle.kts`
- Create: `rubus-ai-kmp/shared/src/commonMain/composeResources/font/lexend.ttf`
- Create: `rubus-ai-kmp/docs/licencias/Lexend-OFL.txt`
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/theme/Type.kt`
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/theme/Theme.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/designsystem/theme/TypographyTest.kt`

Esta tarea es también la validación del riesgo "recursos de Compose Multiplatform 1.12 con AGP 9 y el plugin `com.android.kotlin.multiplatform.library`": si `Res` no se genera o la fuente no entra en el APK, **detente y reporta BLOCKED** con la salida; no improvises otra solución.

- [ ] **Step 1: Escribir el test que falla**

`TypographyTest.kt`:

```kotlin
package com.rubusai.app.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class TypographyTest {

    private val family = FontFamily.Cursive

    private fun Typography.todosLosEstilos() = listOf(
        displayLarge, displayMedium, displaySmall,
        headlineLarge, headlineMedium, headlineSmall,
        titleLarge, titleMedium, titleSmall,
        bodyLarge, bodyMedium, bodySmall,
        labelLarge, labelMedium, labelSmall,
        displayLargeEmphasized, displayMediumEmphasized, displaySmallEmphasized,
        headlineLargeEmphasized, headlineMediumEmphasized, headlineSmallEmphasized,
        titleLargeEmphasized, titleMediumEmphasized, titleSmallEmphasized,
        bodyLargeEmphasized, bodyMediumEmphasized, bodySmallEmphasized,
        labelLargeEmphasized, labelMediumEmphasized, labelSmallEmphasized,
    )

    @Test
    fun todosLosEstilosUsanLaFamiliaRecibida() {
        val estilos = rubusTypography(family).todosLosEstilos()

        assertTrue(estilos.all { it.fontFamily == family })
    }

    @Test
    fun conservaLosPesosDelKit() {
        val typography = rubusTypography(family)

        assertEquals(FontWeight.ExtraBold, typography.displayLarge.fontWeight)
        assertEquals(FontWeight.Bold, typography.headlineLarge.fontWeight)
        assertEquals(FontWeight.Medium, typography.bodyLarge.fontWeight)
    }
}
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*TypographyTest*"`
Expected: FAIL de compilación, `Unresolved reference 'rubusTypography'`.

- [ ] **Step 3: Configurar el paquete de `Res` y añadir la fuente**

En `shared/build.gradle.kts`, antes del bloque `room { … }`:

```kotlin
compose.resources {
    packageOfResClass = "com.rubusai.app.resources"
}
```

Descargar Lexend (licencia OFL) y su licencia:

```bash
mkdir -p shared/src/commonMain/composeResources/font docs/licencias
curl -fL -o shared/src/commonMain/composeResources/font/lexend.ttf "https://raw.githubusercontent.com/google/fonts/main/ofl/lexend/Lexend%5Bwght%5D.ttf"
curl -fL -o docs/licencias/Lexend-OFL.txt "https://raw.githubusercontent.com/google/fonts/main/ofl/lexend/OFL.txt"
file shared/src/commonMain/composeResources/font/lexend.ttf
```

Expected: `file` dice `TrueType Font data`; `lexend.ttf` pesa unos 175 KB.

- [ ] **Step 4: Reescribir `Type.kt`**

Sustituye el archivo completo. La escala es la actual con la familia aplicada a todos los estilos, incluidos los `*Emphasized` de Material3 (no se usan, pero así ninguno queda con la fuente del sistema):

```kotlin
package com.rubusai.app.core.designsystem.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.rubusai.app.resources.Res
import com.rubusai.app.resources.lexend
import org.jetbrains.compose.resources.Font

/**
 * Lexend, la fuente base de todo el tema de la app Flutter. El archivo es variable (peso
 * 100 a 900), por eso cada peso es una entrada de la misma fuente. Outfit no se empaqueta:
 * solo la usan el panel admin y el registro, que no se migran.
 */
@Composable
internal fun rememberRubusTypography(): Typography {
    val lexend = FontFamily(
        Font(Res.font.lexend, FontWeight.Medium),
        Font(Res.font.lexend, FontWeight.SemiBold),
        Font(Res.font.lexend, FontWeight.Bold),
        Font(Res.font.lexend, FontWeight.ExtraBold),
    )
    return remember(lexend) { rubusTypography(lexend) }
}

// Escala de Material 3 con los pesos del kit de referencia: títulos y etiquetas en
// negrita, cuerpo en medio. `headlineLarge`, `titleLarge`, `bodyLarge`, `labelLarge` y
// `labelMedium` usan las medidas del kit; el resto conserva las de Material 3.
internal fun rubusTypography(fontFamily: FontFamily): Typography = Typography().run {
    fun TextStyle.lexend() = copy(fontFamily = fontFamily)
    copy(
        displayLarge = displayLarge.copy(fontWeight = FontWeight.ExtraBold).lexend(),
        displayMedium = displayMedium.copy(fontWeight = FontWeight.ExtraBold).lexend(),
        displaySmall = displaySmall.copy(fontWeight = FontWeight.ExtraBold).lexend(),
        headlineLarge = headlineLarge.copy(fontWeight = FontWeight.Bold, fontSize = 32.sp, lineHeight = 52.sp).lexend(),
        headlineMedium = headlineMedium.copy(fontWeight = FontWeight.Bold).lexend(),
        headlineSmall = headlineSmall.copy(fontWeight = FontWeight.Bold).lexend(),
        titleLarge = titleLarge.copy(fontWeight = FontWeight.Bold, fontSize = 23.sp, lineHeight = 34.sp).lexend(),
        titleMedium = titleMedium.copy(fontWeight = FontWeight.Bold).lexend(),
        titleSmall = titleSmall.copy(fontWeight = FontWeight.Bold).lexend(),
        bodyLarge = bodyLarge.copy(fontWeight = FontWeight.Medium, fontSize = 17.sp, lineHeight = 26.6.sp).lexend(),
        bodyMedium = bodyMedium.copy(fontWeight = FontWeight.Medium).lexend(),
        bodySmall = bodySmall.copy(fontWeight = FontWeight.Medium).lexend(),
        labelLarge = labelLarge.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
            lineHeight = 18.sp,
            letterSpacing = 0.8.sp,
        ).lexend(),
        labelMedium = labelMedium.copy(
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            lineHeight = 18.sp,
            letterSpacing = 0.8.sp,
        ).lexend(),
        labelSmall = labelSmall.copy(fontWeight = FontWeight.Bold, letterSpacing = 0.8.sp).lexend(),
        displayLargeEmphasized = displayLargeEmphasized.lexend(),
        displayMediumEmphasized = displayMediumEmphasized.lexend(),
        displaySmallEmphasized = displaySmallEmphasized.lexend(),
        headlineLargeEmphasized = headlineLargeEmphasized.lexend(),
        headlineMediumEmphasized = headlineMediumEmphasized.lexend(),
        headlineSmallEmphasized = headlineSmallEmphasized.lexend(),
        titleLargeEmphasized = titleLargeEmphasized.lexend(),
        titleMediumEmphasized = titleMediumEmphasized.lexend(),
        titleSmallEmphasized = titleSmallEmphasized.lexend(),
        bodyLargeEmphasized = bodyLargeEmphasized.lexend(),
        bodyMediumEmphasized = bodyMediumEmphasized.lexend(),
        bodySmallEmphasized = bodySmallEmphasized.lexend(),
        labelLargeEmphasized = labelLargeEmphasized.lexend(),
        labelMediumEmphasized = labelMediumEmphasized.lexend(),
        labelSmallEmphasized = labelSmallEmphasized.lexend(),
    )
}
```

En `Theme.kt`, cambia la línea `typography = RubusTypography,` por `typography = rememberRubusTypography(),`. Comprueba que no quede otra referencia: `grep -rn "RubusTypography" shared/src androidApp/src` solo debe mostrar `rememberRubusTypography`.

- [ ] **Step 5: Ejecutar tests y build**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`; `TypographyTest` con 2 tests y 0 fallos; total 83.

- [ ] **Step 6: Comprobar que la fuente entra en el APK**

```bash
unzip -l $(find androidApp/build/outputs/apk/dev/debug -name '*.apk' | head -1) | grep -i lexend
```

Expected: una línea con `composeResources/…/font/lexend.ttf`. Si no aparece, reporta BLOCKED.

- [ ] **Step 7: Commit**

```bash
git add shared/build.gradle.kts shared/src/commonMain/composeResources docs/licencias shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/theme shared/src/commonTest/kotlin/com/rubusai/app/core/designsystem
git commit -m "feat(rubus-ai-kmp): tipografía Lexend empaquetada como recurso de Compose"
```

---

### Task 2: Compuerta de tests de UI (Robolectric)

**Files:**
- Modify: `rubus-ai-kmp/gradle/libs.versions.toml`
- Modify: `rubus-ai-kmp/shared/build.gradle.kts`
- Test: `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem/component/RubusButtonTest.kt`

Decide si los componentes llevan tests de UI. Se prueba con `RubusButton`, que ya existe. **Rama A** (funciona): se conservan las dependencias y los tests de UI de las Tasks 3 a 5. **Rama B** (no funciona tras dos intentos de ajustar versiones): se revierte esta tarea y se omiten los pasos marcados `[Rama A]`.

- [ ] **Step 1: Añadir las dependencias**

En `gradle/libs.versions.toml`, en `[versions]`:

```toml
robolectric = "4.16"
# Misma versión que arrastra Compose Multiplatform 1.12.1 (androidx.compose.ui:ui-android).
androidx-compose-ui = "1.12.1"
```

En `[libraries]`:

```toml
robolectric = { module = "org.robolectric:robolectric", version.ref = "robolectric" }
compose-uiTest-junit4 = { module = "org.jetbrains.compose.ui:ui-test-junit4", version.ref = "composeMultiplatform" }
androidx-compose-uiTestManifest = { module = "androidx.compose.ui:ui-test-manifest", version.ref = "androidx-compose-ui" }
```

En `shared/build.gradle.kts`, dentro de `sourceSets { … }`, después del bloque `getByName("androidDeviceTest")`:

```kotlin
        // Tests de UI en la JVM: Robolectric aporta el Android que Compose necesita, y el
        // manifiesto de ui-test declara la actividad que usa createComposeRule().
        getByName("androidHostTest").dependencies {
            implementation(libs.robolectric)
            implementation(libs.compose.uiTest.junit4)
            implementation(libs.androidx.compose.uiTestManifest)
        }
```

- [ ] **Step 2: Escribir el test de humo**

`RubusButtonTest.kt`:

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusButtonTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun alPulsarLlamaAOnClick() {
        var clics = 0
        rule.setContent { RubusTheme { RubusButton(text = "Aceptar", onClick = { clics++ }) } }

        rule.onNodeWithText("ACEPTAR").performClick()

        assertEquals(1, clics)
    }

    @Test
    fun deshabilitadoNoLlamaAOnClick() {
        var clics = 0
        rule.setContent {
            RubusTheme { RubusButton(text = "Aceptar", onClick = { clics++ }, enabled = false) }
        }

        rule.onNodeWithText("ACEPTAR").assertIsNotEnabled().performClick()

        assertEquals(0, clics)
    }
}
```

- [ ] **Step 3: Ejecutar**

Run: `./gradlew :shared:testAndroidHostTest --tests "*RubusButtonTest*"`
Expected (Rama A): PASS, 2 tests. Si falla por resolución de dependencias o por la versión de SDK de Robolectric, prueba como máximo dos ajustes (por ejemplo `@Config(sdk = [34])` o la versión de `androidx-compose-ui`) y vuelve a ejecutar.

- [ ] **Step 4: Decidir la rama**

- Si pasa: **Rama A**. Anota en el informe "Rama A".
- Si no pasa tras dos intentos: **Rama B**. Revierte con `git checkout -- gradle/libs.versions.toml shared/build.gradle.kts && rm -r shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem`, no hagas commit, anota en el informe "Rama B" con la salida del error, y continúa en la Task 3 omitiendo los pasos `[Rama A]`.

- [ ] **Step 5: Verificar todo y commit (solo Rama A)**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`; total 85.

```bash
git add gradle/libs.versions.toml shared/build.gradle.kts shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem
git commit -m "build(rubus-ai-kmp): Robolectric y ui-test para probar la UI en la JVM"
```

---

### Task 3: `RubusLoadingState` y `RubusErrorState`

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusLoadingState.kt`
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusErrorState.kt`
- Test: `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem/component/RubusStatesTest.kt` (Rama A)

- [ ] **Step 1: [Rama A] Escribir los tests que fallan**

`RubusStatesTest.kt`:

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusStatesTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun cargaMuestraElMensaje() {
        rule.setContent { RubusTheme { RubusLoadingState(message = "Cargando análisis") } }

        rule.onNodeWithText("Cargando análisis").assertIsDisplayed()
    }

    @Test
    fun errorMuestraElMensaje() {
        rule.setContent { RubusTheme { RubusErrorState(message = "Sin conexión") } }

        rule.onNodeWithText("Sin conexión").assertIsDisplayed()
    }

    @Test
    fun errorSinReintentoNoMuestraBoton() {
        rule.setContent { RubusTheme { RubusErrorState(message = "Sin conexión") } }

        rule.onNodeWithText("REINTENTAR").assertDoesNotExist()
    }

    @Test
    fun reintentarLlamaAOnRetry() {
        var reintentos = 0
        rule.setContent {
            RubusTheme {
                RubusErrorState(
                    message = "Sin conexión",
                    retryLabel = "Reintentar",
                    onRetry = { reintentos++ },
                )
            }
        }

        rule.onNodeWithText("REINTENTAR").performClick()

        assertEquals(1, reintentos)
    }
}
```

- [ ] **Step 2: [Rama A] Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*RubusStatesTest*"`
Expected: FAIL de compilación, `Unresolved reference 'RubusLoadingState'`.

- [ ] **Step 3: Implementar `RubusLoadingState`**

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/** Indicador de carga centrado, con un mensaje opcional (el texto lo pone quien llama). */
@Composable
fun RubusLoadingState(
    modifier: Modifier = Modifier,
    message: String? = null,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
        message?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}
```

- [ ] **Step 4: Implementar `RubusErrorState`**

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp

/**
 * Mensaje de error centrado. El botón de reintento aparece solo si se pasan [retryLabel]
 * y [onRetry] a la vez.
 */
@Composable
fun RubusErrorState(
    message: String,
    modifier: Modifier = Modifier,
    retryLabel: String? = null,
    onRetry: (() -> Unit)? = null,
) {
    require((retryLabel == null) == (onRetry == null)) {
        "retryLabel y onRetry se pasan juntos o ninguno"
    }
    Column(
        modifier = modifier.fillMaxSize().padding(24.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center,
        )
        if (retryLabel != null && onRetry != null) {
            RubusButton(text = retryLabel, onClick = onRetry, variant = RubusButtonVariant.Secondary)
        }
    }
}
```

- [ ] **Step 5: Ejecutar tests y build**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`; Rama A: `RubusStatesTest` con 4 tests, total 89.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component shared/src/androidHostTest
git commit -m "feat(rubus-ai-kmp): estados de carga y de error del design system"
```

---

### Task 4: `RubusCard`

**Files:**
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/theme/Shape.kt`
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusCard.kt`
- Test: `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem/component/RubusCardTest.kt` (Rama A)

- [ ] **Step 1: [Rama A] Escribir los tests que fallan**

`RubusCardTest.kt`:

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.material3.Text
import androidx.compose.ui.test.assertHasClickAction
import androidx.compose.ui.test.assertHasNoClickAction
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusCardTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun muestraSuContenido() {
        rule.setContent { RubusTheme { RubusCard { Text("Contenido") } } }

        rule.onNodeWithText("Contenido").assertIsDisplayed()
    }

    @Test
    fun sinOnClickNoEsClicable() {
        rule.setContent { RubusTheme { RubusCard { Text("Contenido") } } }

        rule.onNodeWithText("Contenido").assertHasNoClickAction()
    }

    @Test
    fun conOnClickLoLlama() {
        var clics = 0
        rule.setContent { RubusTheme { RubusCard(onClick = { clics++ }) { Text("Contenido") } } }

        rule.onNodeWithText("Contenido").assertHasClickAction().performClick()

        assertEquals(1, clics)
    }
}
```

- [ ] **Step 2: [Rama A] Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*RubusCardTest*"`
Expected: FAIL de compilación, `Unresolved reference 'RubusCard'`.

- [ ] **Step 3: Añadir `CardRadius`**

En `Shape.kt`, dentro de `object RubusDimens`, después de `ButtonRadius`:

```kotlin

    /** Radio de las esquinas de las tarjetas. */
    val CardRadius = 16.dp
```

- [ ] **Step 4: Implementar `RubusCard`**

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.theme.RubusDimens

/**
 * Tarjeta con borde y un canto inferior, como las variantes con contorno del botón. Con
 * [onClick] es clicable; sin él, solo agrupa contenido.
 */
@Composable
fun RubusCard(
    modifier: Modifier = Modifier,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val scheme = MaterialTheme.colorScheme
    val depth = RubusDimens.OutlineDepth
    val clicks = if (onClick != null) Modifier.clickable(role = Role.Button, onClick = onClick) else Modifier

    Column(
        modifier = modifier
            .clip(RoundedCornerShape(RubusDimens.CardRadius))
            .then(clicks)
            .drawBehind {
                val radius = CornerRadius(RubusDimens.CardRadius.toPx())
                val stroke = RubusDimens.BorderWidth.toPx()
                val face = Size(size.width, size.height - depth.toPx())
                drawRoundRect(scheme.outline, cornerRadius = radius)
                drawRoundRect(scheme.surface, size = face, cornerRadius = radius)
                drawRoundRect(
                    color = scheme.outline,
                    topLeft = Offset(stroke / 2, stroke / 2),
                    size = Size(face.width - stroke, face.height - stroke),
                    cornerRadius = CornerRadius(radius.x - stroke / 2),
                    style = Stroke(stroke),
                )
            }
            .padding(start = 16.dp, top = 16.dp, end = 16.dp, bottom = 16.dp + depth),
        content = content,
    )
}
```

- [ ] **Step 5: Ejecutar tests y build**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`; Rama A: `RubusCardTest` con 3 tests, total 92.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem shared/src/androidHostTest
git commit -m "feat(rubus-ai-kmp): RubusCard con borde y canto"
```

---

### Task 5: `RubusTextField`

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusTextField.kt`
- Test: `rubus-ai-kmp/shared/src/androidHostTest/kotlin/com/rubusai/app/core/designsystem/component/RubusTextFieldTest.kt` (Rama A)

- [ ] **Step 1: [Rama A] Escribir los tests que fallan**

`RubusTextFieldTest.kt`:

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import com.rubusai.app.core.designsystem.theme.RubusTheme
import kotlin.test.Test
import kotlin.test.assertEquals
import org.junit.Rule
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class RubusTextFieldTest {

    @get:Rule
    val rule = createComposeRule()

    @Test
    fun muestraElTextoDeError() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "",
                    onValueChange = {},
                    label = "Correo",
                    errorText = "Obligatorio",
                    supportingText = "Texto de ayuda",
                )
            }
        }

        rule.onNodeWithText("Obligatorio").assertIsDisplayed()
        // El error sustituye a la ayuda.
        rule.onNodeWithText("Texto de ayuda").assertDoesNotExist()
    }

    @Test
    fun deshabilitadoNoAceptaTexto() {
        rule.setContent {
            RubusTheme { RubusTextField(value = "", onValueChange = {}, label = "Correo", enabled = false) }
        }

        rule.onNode(hasSetTextAction()).assertIsNotEnabled()
    }

    @Test
    fun escribirLlamaAOnValueChange() {
        var valor by mutableStateOf("")
        rule.setContent {
            RubusTheme { RubusTextField(value = valor, onValueChange = { valor = it }, label = "Correo") }
        }

        rule.onNode(hasSetTextAction()).performTextInput("ana@example.com")

        assertEquals("ana@example.com", valor)
    }

    @Test
    fun laContrasenaSeOcultaYSeMuestraConElBoton() {
        rule.setContent {
            RubusTheme {
                RubusTextField(
                    value = "secreto",
                    onValueChange = {},
                    label = "Contraseña",
                    isPassword = true,
                    showPasswordLabel = "Mostrar",
                    hidePasswordLabel = "Ocultar",
                )
            }
        }

        rule.onNodeWithText("secreto").assertDoesNotExist()

        rule.onNodeWithText("Mostrar").performClick()

        rule.onNodeWithText("secreto").assertIsDisplayed()
        rule.onNodeWithText("Ocultar").assertIsDisplayed()
    }
}
```

- [ ] **Step 2: [Rama A] Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*RubusTextFieldTest*"`
Expected: FAIL de compilación, `Unresolved reference 'RubusTextField'`.

- [ ] **Step 3: Implementar `RubusTextField`**

```kotlin
package com.rubusai.app.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.theme.RubusDimens
import com.rubusai.app.core.designsystem.theme.RubusTheme

/**
 * Campo de una línea con etiqueta encima y borde del grosor del resto del sistema. El borde
 * pasa a azul con el foco y a rojo con [errorText], que sustituye a [supportingText].
 *
 * Con [isPassword] el valor se oculta y aparece un botón de texto para mostrarlo; sin iconos
 * en el proyecto, sus textos ([showPasswordLabel] y [hidePasswordLabel]) los pone quien llama.
 */
@Composable
fun RubusTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    errorText: String? = null,
    supportingText: String? = null,
    isPassword: Boolean = false,
    showPasswordLabel: String = "",
    hidePasswordLabel: String = "",
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
) {
    require(!isPassword || (showPasswordLabel.isNotEmpty() && hidePasswordLabel.isNotEmpty())) {
        "Un campo de contraseña necesita los textos de mostrar y ocultar"
    }
    val scheme = MaterialTheme.colorScheme
    val extra = RubusTheme.colors
    val shape = MaterialTheme.shapes.large
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    var passwordVisible by remember { mutableStateOf(false) }
    val hasError = errorText != null

    val borderColor = when {
        !enabled -> extra.disabledContainer
        hasError -> scheme.error
        focused -> scheme.secondary
        else -> scheme.outline
    }
    val textStyle = MaterialTheme.typography.bodyLarge.copy(
        color = if (enabled) scheme.onSurface else extra.onDisabledContainer,
    )

    Column(modifier = modifier) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = if (hasError) scheme.error else scheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(4.dp))
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            enabled = enabled,
            singleLine = true,
            textStyle = textStyle,
            cursorBrush = SolidColor(scheme.secondary),
            visualTransformation = if (isPassword && !passwordVisible) {
                PasswordVisualTransformation()
            } else {
                VisualTransformation.None
            },
            keyboardOptions = if (isPassword) {
                keyboardOptions.copy(keyboardType = KeyboardType.Password)
            } else {
                keyboardOptions
            },
            keyboardActions = keyboardActions,
            interactionSource = interactionSource,
            decorationBox = { innerTextField ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .defaultMinSize(minHeight = RubusDimens.ButtonHeight)
                        .background(if (enabled) scheme.surface else extra.disabledContainer, shape)
                        .border(RubusDimens.BorderWidth, borderColor, shape)
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(modifier = Modifier.weight(1f)) { innerTextField() }
                    if (isPassword) {
                        Text(
                            text = if (passwordVisible) hidePasswordLabel else showPasswordLabel,
                            style = MaterialTheme.typography.labelMedium,
                            color = if (enabled) scheme.secondary else extra.onDisabledContainer,
                            modifier = Modifier
                                .clickable(enabled = enabled, role = Role.Button) {
                                    passwordVisible = !passwordVisible
                                }
                                .padding(start = 12.dp),
                        )
                    }
                }
            },
        )
        (errorText ?: supportingText)?.let {
            Text(
                text = it,
                style = MaterialTheme.typography.bodySmall,
                color = if (hasError) scheme.error else scheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
```

- [ ] **Step 4: Ejecutar tests y build**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`; Rama A: `RubusTextFieldTest` con 4 tests, total 96. Si `onNodeWithText("secreto").assertDoesNotExist()` falla porque el nodo expone el texto sin transformar, ajusta el test para comprobar `EditableText` con `SemanticsMatcher.expectValue(SemanticsProperties.EditableText, AnnotatedString("•••••••"))` y explica el cambio en el informe; no cambies el componente para acomodar el test.

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/designsystem/component/RubusTextField.kt shared/src/androidHostTest
git commit -m "feat(rubus-ai-kmp): RubusTextField con error, ayuda y contraseña"
```

---

### Task 6: Rutas

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/navigation/Route.kt`
- Test: `rubus-ai-kmp/shared/src/commonTest/kotlin/com/rubusai/app/core/navigation/RoutesTest.kt`

- [ ] **Step 1: Escribir el test que falla**

`RoutesTest.kt`:

```kotlin
package com.rubusai.app.core.navigation

import com.rubusai.app.core.config.Environment
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class RoutesTest {

    private val migradas = listOf(
        Route.Splash::class,
        Route.Login::class,
        Route.Home::class,
        Route.History::class,
        Route.Solicitudes::class,
        Route.SolicitudDetalle::class,
        Route.Notifications::class,
        Route.Profile::class,
        Route.Capture::class,
        Route.Result::class,
        Route.Queue::class,
    )

    @Test
    fun elInicioEsElSplash() {
        assertEquals(Route.Splash, StartRoute)
    }

    @Test
    fun prodSoloTieneLasRutasMigradas() {
        assertEquals(migradas, registeredRoutes(Environment.PROD))
    }

    @Test
    fun stagingSoloTieneLasRutasMigradas() {
        assertEquals(migradas, registeredRoutes(Environment.STAGING))
    }

    @Test
    fun devAnadeDiagnosticoYCatalogo() {
        val rutas = registeredRoutes(Environment.DEV)

        assertEquals(migradas, rutas.take(migradas.size))
        assertTrue(Route.Diagnostico::class in rutas)
        assertTrue(Route.Catalogo::class in rutas)
        assertEquals(migradas.size + 2, rutas.size)
    }

    @Test
    fun diagnosticoYCatalogoNoEstanFueraDeDev() {
        for (entorno in listOf(Environment.STAGING, Environment.PROD)) {
            val rutas = registeredRoutes(entorno)

            assertFalse(Route.Diagnostico::class in rutas)
            assertFalse(Route.Catalogo::class in rutas)
        }
    }
}
```

- [ ] **Step 2: Ejecutar y comprobar que falla**

Run: `./gradlew :shared:testAndroidHostTest --tests "*RoutesTest*"`
Expected: FAIL de compilación, `Unresolved reference 'Route'`.

- [ ] **Step 3: Implementar `Route.kt`**

```kotlin
package com.rubusai.app.core.navigation

import com.rubusai.app.core.config.Environment
import kotlin.reflect.KClass
import kotlinx.serialization.Serializable

/**
 * Destinos de la app. Los parámetros viajan en la propia ruta (Navigation Compose tipado).
 * Panel admin y registro de usuarios no se migran, así que no tienen ruta.
 */
@Serializable
sealed interface Route {
    @Serializable data object Splash : Route
    @Serializable data object Login : Route
    @Serializable data object Home : Route
    @Serializable data object History : Route
    @Serializable data object Solicitudes : Route
    @Serializable data class SolicitudDetalle(val id: String) : Route
    @Serializable data object Notifications : Route
    @Serializable data object Profile : Route
    @Serializable data object Capture : Route
    @Serializable data class Result(val id: String) : Route
    @Serializable data object Queue : Route

    /** Solo en el flavor dev: flavor, URL y prueba de conexión. */
    @Serializable data object Diagnostico : Route

    /** Solo en el flavor dev: los componentes del design system. */
    @Serializable data object Catalogo : Route
}

internal val StartRoute: Route = Route.Splash

internal val migratedRoutes: List<KClass<out Route>> = listOf(
    Route.Splash::class,
    Route.Login::class,
    Route.Home::class,
    Route.History::class,
    Route.Solicitudes::class,
    Route.SolicitudDetalle::class,
    Route.Notifications::class,
    Route.Profile::class,
    Route.Capture::class,
    Route.Result::class,
    Route.Queue::class,
)

private val devRoutes: List<KClass<out Route>> = listOf(
    Route.Diagnostico::class,
    Route.Catalogo::class,
)

/** Rutas que existen en el grafo de [environment]: las de desarrollo solo en DEV. */
internal fun registeredRoutes(environment: Environment): List<KClass<out Route>> =
    if (environment == Environment.DEV) migratedRoutes + devRoutes else migratedRoutes
```

- [ ] **Step 4: Ejecutar tests y build**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL`; `RoutesTest` con 5 tests; total +5 sobre la tarea anterior (101 en Rama A, 88 en Rama B).

- [ ] **Step 5: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app/core/navigation shared/src/commonTest/kotlin/com/rubusai/app/core/navigation
git commit -m "feat(rubus-ai-kmp): rutas tipadas y rutas de desarrollo solo en dev"
```

---

### Task 7: `NavHost`, pantallas de desarrollo y `App.kt`

**Files:**
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/dev/DiagnosticoScreen.kt`
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/dev/CatalogoScreen.kt`
- Create: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/core/navigation/RubusNavHost.kt`
- Modify: `rubus-ai-kmp/shared/src/commonMain/kotlin/com/rubusai/app/App.kt`

- [ ] **Step 1: Mover la pantalla provisional a `DiagnosticoScreen`**

`dev/DiagnosticoScreen.kt` (el cuerpo es el actual de `App.kt`, sin el `RubusTheme`, que pasa a `App`):

```kotlin
package com.rubusai.app.dev

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.component.RubusButton
import io.ktor.client.HttpClient
import io.ktor.client.request.get
import kotlin.coroutines.cancellation.CancellationException
import kotlinx.coroutines.launch
import org.koin.compose.koinInject

// Solo existe en el flavor dev: comprueba a simple vista que flavor, Koin, tema y red
// están conectados.
@Composable
fun DiagnosticoScreen() {
    val envConfig = koinInject<EnvConfig>()
    val httpClient = koinInject<HttpClient>()
    val scope = rememberCoroutineScope()
    var checking by remember { mutableStateOf(false) }
    var result by remember { mutableStateOf<String?>(null) }

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
            RubusButton(
                text = "Probar conexión",
                enabled = !checking,
                onClick = {
                    checking = true
                    result = null
                    scope.launch {
                        result = checkConnection(httpClient)
                        checking = false
                    }
                },
            )
            result?.let {
                Text(
                    text = it,
                    style = MaterialTheme.typography.bodyLarge,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}

/** `GET health` contra el backend: "Conectado" o el mensaje del error. */
private suspend fun checkConnection(client: HttpClient): String = try {
    client.get("health")
    "Conectado"
} catch (e: CancellationException) {
    throw e
} catch (e: Exception) {
    e.message ?: e::class.simpleName ?: "Error desconocido"
}
```

- [ ] **Step 2: Crear `CatalogoScreen`**

`dev/CatalogoScreen.kt`:

```kotlin
package com.rubusai.app.dev

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.core.designsystem.component.RubusCard
import com.rubusai.app.core.designsystem.component.RubusErrorState
import com.rubusai.app.core.designsystem.component.RubusLoadingState
import com.rubusai.app.core.designsystem.component.RubusTextField

// Solo existe en el flavor dev: cada componente del design system en sus estados, para
// revisarlos a ojo en un dispositivo.
@Composable
fun CatalogoScreen() {
    var texto by remember { mutableStateOf("") }
    var clave by remember { mutableStateOf("") }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background,
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .safeDrawingPadding()
                .verticalScroll(rememberScrollState())
                .padding(24.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Text("Tipografía", style = MaterialTheme.typography.headlineLarge)
            Text("Título grande", style = MaterialTheme.typography.titleLarge)
            Text("Cuerpo de texto de ejemplo", style = MaterialTheme.typography.bodyLarge)

            Text("Botones", style = MaterialTheme.typography.titleLarge)
            RubusButtonVariant.entries.forEach { variante ->
                RubusButton(text = variante.name, onClick = {}, variant = variante, modifier = Modifier.fillMaxWidth())
            }
            RubusButton(text = "Deshabilitado", onClick = {}, enabled = false, modifier = Modifier.fillMaxWidth())

            Text("Campos de texto", style = MaterialTheme.typography.titleLarge)
            RubusTextField(
                value = texto,
                onValueChange = { texto = it },
                label = "Correo",
                supportingText = "Texto de ayuda",
                modifier = Modifier.fillMaxWidth(),
            )
            RubusTextField(
                value = "",
                onValueChange = {},
                label = "Con error",
                errorText = "Este campo es obligatorio",
                modifier = Modifier.fillMaxWidth(),
            )
            RubusTextField(
                value = "Deshabilitado",
                onValueChange = {},
                label = "Deshabilitado",
                enabled = false,
                modifier = Modifier.fillMaxWidth(),
            )
            RubusTextField(
                value = clave,
                onValueChange = { clave = it },
                label = "Contraseña",
                isPassword = true,
                showPasswordLabel = "Mostrar",
                hidePasswordLabel = "Ocultar",
                modifier = Modifier.fillMaxWidth(),
            )

            Text("Tarjetas", style = MaterialTheme.typography.titleLarge)
            RubusCard(modifier = Modifier.fillMaxWidth()) {
                Text("Tarjeta sin acción", style = MaterialTheme.typography.bodyLarge)
            }
            RubusCard(onClick = {}, modifier = Modifier.fillMaxWidth()) {
                Text("Tarjeta clicable", style = MaterialTheme.typography.bodyLarge)
            }

            Text("Estados", style = MaterialTheme.typography.titleLarge)
            RubusLoadingState(modifier = Modifier.fillMaxWidth().height(160.dp), message = "Cargando…")
            RubusErrorState(
                message = "No se pudo cargar",
                retryLabel = "Reintentar",
                onRetry = {},
                modifier = Modifier.fillMaxWidth().height(200.dp),
            )
        }
    }
}
```

Los componentes no imponen tamaño; el catálogo les da ancho completo y una altura fija para verlos dentro del scroll.

- [ ] **Step 3: Crear `RubusNavHost`**

`core/navigation/RubusNavHost.kt`:

```kotlin
package com.rubusai.app.core.navigation

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.toRoute
import com.rubusai.app.core.config.Environment
import com.rubusai.app.core.designsystem.component.RubusButton
import com.rubusai.app.core.designsystem.component.RubusButtonVariant
import com.rubusai.app.dev.CatalogoScreen
import com.rubusai.app.dev.DiagnosticoScreen

/**
 * Grafo de la app. Cada destino migrado es un marcador con el nombre de la ruta; cada fase
 * sustituye los suyos por la pantalla real. `Diagnostico` y `Catalogo` solo existen en dev.
 */
@Composable
fun RubusNavHost(
    environment: Environment,
    modifier: Modifier = Modifier,
    navController: NavHostController = rememberNavController(),
) {
    val enDev = remember(environment) { Route.Diagnostico::class in registeredRoutes(environment) }

    NavHost(navController = navController, startDestination = StartRoute, modifier = modifier) {
        composable<Route.Splash> {
            Marcador("Splash") {
                if (enDev) {
                    RubusButton(
                        text = "Diagnóstico",
                        onClick = { navController.navigate(Route.Diagnostico) },
                        variant = RubusButtonVariant.Secondary,
                    )
                    RubusButton(
                        text = "Catálogo",
                        onClick = { navController.navigate(Route.Catalogo) },
                        variant = RubusButtonVariant.Outline,
                    )
                }
            }
        }
        composable<Route.Login> { Marcador("Login") }
        composable<Route.Home> { Marcador("Home") }
        composable<Route.History> { Marcador("History") }
        composable<Route.Solicitudes> { Marcador("Solicitudes") }
        composable<Route.SolicitudDetalle> { entry ->
            Marcador("Solicitud ${entry.toRoute<Route.SolicitudDetalle>().id}")
        }
        composable<Route.Notifications> { Marcador("Notifications") }
        composable<Route.Profile> { Marcador("Profile") }
        composable<Route.Capture> { Marcador("Capture") }
        composable<Route.Result> { entry ->
            Marcador("Result ${entry.toRoute<Route.Result>().id}")
        }
        composable<Route.Queue> { Marcador("Queue") }
        if (enDev) {
            composable<Route.Diagnostico> { DiagnosticoScreen() }
            composable<Route.Catalogo> { CatalogoScreen() }
        }
    }
}

// Destino vacío de una ruta que todavía no tiene pantalla.
@Composable
private fun Marcador(nombre: String, content: @Composable ColumnScope.() -> Unit = {}) {
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
            Text(text = nombre, style = MaterialTheme.typography.headlineLarge)
            content()
        }
    }
}
```

- [ ] **Step 4: Reducir `App.kt`**

Sustituye el archivo completo:

```kotlin
package com.rubusai.app

import androidx.compose.runtime.Composable
import com.rubusai.app.core.config.EnvConfig
import com.rubusai.app.core.designsystem.theme.RubusTheme
import com.rubusai.app.core.navigation.RubusNavHost
import org.koin.compose.koinInject

@Composable
fun App() {
    val envConfig = koinInject<EnvConfig>()

    RubusTheme {
        RubusNavHost(environment = envConfig.environment)
    }
}
```

- [ ] **Step 5: Ejecutar tests y build**

Run: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`
Expected: `BUILD SUCCESSFUL` en los seis variantes (dev, staging, prod en debug y release); mismos tests que la tarea anterior, sin fallos. Si el serializador de las rutas no se genera (error de `serializer()`), comprueba que el plugin `kotlinSerialization` sigue aplicado en `shared/build.gradle.kts` (lo está) y reporta el error exacto.

- [ ] **Step 6: Commit**

```bash
git add shared/src/commonMain/kotlin/com/rubusai/app
git commit -m "feat(rubus-ai-kmp): grafo de navegación con marcadores y pantallas de desarrollo"
```

---

### Task 8: Documentación

**Files:**
- Modify: `rubus-ai-kmp/docs/roadmap-migracion-kmp.md`
- Modify: `rubus-ai-kmp/docs/dependencias-pendientes.md`
- Modify: `rubus-ai-kmp/README.md` (solo si menciona la estructura de `core`, `App.kt` o la pantalla provisional)

- [ ] **Step 1: Roadmap, Fase 0**

En la sección "Fase 0 — Fundaciones":

- Cambia la línea de `core/navigation` por: `- \`core/navigation\`: rutas tipadas y \`NavHost\` con un marcador por ruta migrada. Hecho el 2026-10-26. \`Diagnostico\` y \`Catalogo\` solo existen en \`dev\`.`
- Cambia la línea de `core/designsystem` para que diga lo que hay: tema con la paleta nueva (comprueba en `Theme.kt` si es claro u oscuro y escribe lo que el código hace, hoy `LightColorScheme`), tipografía **Lexend** (Outfit no se migra: solo la usan el panel admin y el registro), y los componentes `RubusButton`, `RubusTextField`, `RubusCard`, `RubusLoadingState` y `RubusErrorState`. Hecho el 2026-10-26.
- En "Librerías", añade Robolectric y `ui-test-junit4` si la Task 2 salió por la Rama A.
- En "Terminado cuando", deja una nota: queda por verificar en dispositivo (flavor `dev` instala y abre, petición de prueba), que no se puede hacer en esta máquina.
- En "Resumen de fases", la fase 0 no cambia de número; añade al final de la sección una línea: `Estado: cerrada salvo las verificaciones de dispositivo y Mac (ver dependencias-pendientes.md).`

- [ ] **Step 2: `dependencias-pendientes.md`**

- En "Ya en el build", indica que `navigation-compose` y `compose-components-resources` ya tienen código que los usa.
- En "Sin verificar", añade: la fuente Lexend y los componentes solo se han probado en la JVM; hay que revisarlos a ojo en un dispositivo con la pantalla `Catalogo` del flavor `dev` (Splash → Catálogo).
- Registra la decisión de la Task 2: si fue Rama A, que los tests de UI corren con Robolectric 4.16 en `androidHostTest` con `@Config(sdk = [35])`; si fue Rama B, que no se pudo y por qué (salida del error), y que los componentes no tienen tests de UI.
- En "Decisiones abiertas", elimina la entrada de "prueba de humo con Robolectric" si la Rama A la resuelve.
- Quita o actualiza la entrada "Pantallas nuevas" si la `App.kt` actual ya no tiene el `koinInject` en la raíz de una pantalla provisional (ahora lo tiene solo `App`, para leer el entorno).

- [ ] **Step 3: README**

`grep -n -i "App.kt\|provisional\|navigation\|designsystem" rubus-ai-kmp/README.md`. Actualiza solo las líneas que ya no sean ciertas. Si no hay ninguna, no toques el README.

- [ ] **Step 4: Commit**

Desde `rubus-ai-kmp/` (el `README.md` solo se añade si lo modificaste; `git add` de un archivo sin cambios no hace nada):

```bash
git add docs README.md
git commit -m "docs(rubus-ai-kmp): estado de la fase 0 tras la navegación, los componentes base y Lexend"
```

---

### Task 9: Verificación final y merge

**Files:** ninguno.

- [ ] **Step 1: Build limpio completo**

Desde `/home/san/Proyectos/zarza-workspace-kmp-fase0-cierre/rubus-ai-kmp`:

```bash
./gradlew clean :androidApp:assemble :shared:testAndroidHostTest :shared:assembleAndroidDeviceTest
```

Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 2: Confirmar que los tests se ejecutaron de verdad**

```bash
grep -l "<testsuite" shared/build/test-results/testAndroidHostTest/*.xml | wc -l
grep -ho 'tests="[0-9]*" skipped="[0-9]*" failures="[0-9]*" errors="[0-9]*"' shared/build/test-results/testAndroidHostTest/*.xml
```

Expected: todos con `failures="0" errors="0"`, y presentes `TypographyTest` (2), `RoutesTest` (5) y, en Rama A, `RubusButtonTest` (2), `RubusStatesTest` (4), `RubusCardTest` (3) y `RubusTextFieldTest` (4). Total 101 (Rama A) u 88 (Rama B).

- [ ] **Step 3: Fuente en el APK y tamaño**

```bash
unzip -l $(find androidApp/build/outputs/apk/dev/debug -name '*.apk' | head -1) | grep -i lexend
ls -l androidApp/build/outputs/apk/*/release/*.apk
```

Expected: `lexend.ttf` dentro del APK. Anota el tamaño de cada APK release en el informe.

- [ ] **Step 4: Árbol limpio**

```bash
git status --short && git log --oneline main..HEAD
```

Expected: sin líneas de estado y un commit por tarea (de la 1 a la 8, más los de arreglos de revisión).

- [ ] **Step 5: Informar contra "Terminado cuando" de la spec**

1. `clean` + `assemble` + tests host en los tres flavors: resultado.
2. El grafo declara todas las rutas migradas y `Diagnostico`/`Catalogo` solo en dev: `RoutesTest`.
3. Los cuatro componentes existen y aparecen en el catálogo.
4. La tipografía de `RubusTheme` usa Lexend: `TypographyTest` y el APK.
5. Roadmap y `dependencias-pendientes.md` actualizados.
6. Rama A o B, y lo que queda pendiente de dispositivo.

- [ ] **Step 6: Merge a `main`**

Solo si los pasos 1 a 4 salieron bien. Desde `/home/san/Proyectos/zarza-workspace` (ya en `main`; no se cambia de rama):

```bash
git status --short && git branch --show-current
git merge --no-ff feature/kmp-fase0-cierre -m "Merge feature/kmp-fase0-cierre: navegación, componentes base y tipografía de la fase 0"
```

Expected: `main`, sin cambios pendientes, merge sin conflictos. Si hay conflictos o cambios sin commitear en `main`, no resolver por cuenta propia ni usar `git stash`: avisar al usuario.

- [ ] **Step 7: Limpiar**

```bash
git worktree remove ../zarza-workspace-kmp-fase0-cierre
git branch -d feature/kmp-fase0-cierre
```

No usar `--force` si `git worktree remove` se niega por archivos sin commitear que no sean `local.properties` o carpetas `build/`.
