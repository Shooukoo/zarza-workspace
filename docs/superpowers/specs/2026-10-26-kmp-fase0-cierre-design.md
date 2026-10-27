# KMP Fase 0, sub-proyecto C: navegación, componentes base y tipografía

Fecha: 2026-10-26

## Contexto

Último sub-proyecto que cierra la Fase 0 del roadmap (`rubus-ai-kmp/docs/roadmap-migracion-kmp.md`). El A (`2026-10-09-kmp-fase0-build-design.md`) dejó flavors, librerías, `EnvConfig` y Koin; el B (`2026-10-09-kmp-fase0-red-design.md`) dejó el cliente HTTP con sesión. Este añade lo que el roadmap lista en "Qué se migra" de la Fase 0 y todavía no existe:

- `core/navigation`: no existe. `App.kt` es una pantalla provisional con el flavor y el botón "Probar conexión".
- `core/designsystem`: tema, formas y `RubusButton` ya están. Faltan campo de texto, tarjeta y estados de carga y de error.
- Tipografía: no está implementada. `Type.kt` usa la familia del sistema y el proyecto no tiene `composeResources`. En Flutter las fuentes salen de `google_fonts`, que las descarga en ejecución, así que no hay archivos que reutilizar. Lexend es la base de todo el `textTheme` de Flutter (`app_theme.dart`); Outfit solo aparece en el panel admin y en `RegisterScreen`, y ninguno de los dos se migra.

## Objetivo

Dejar el proyecto listo para que cada fase siguiente solo agregue features: un grafo de navegación con todas las rutas que se migran, los componentes base con el lenguaje visual de `RubusButton`, y la tipografía de marca.

## Fuera de alcance

- Pantallas reales, ViewModels y redirección por sesión (Fase 1 en adelante). Todo destino del grafo es un marcador.
- Barra inferior (Fase 4).
- La fuente Outfit, el panel admin y el registro de usuarios (no se migran).
- Las verificaciones que necesitan dispositivo o Mac: abrir `devDebug`, "Probar conexión" en un dispositivo, `KeystoreTokenCipherTest` e `iosMain`.
- Cambios en el backend.

## Diseño

### 1. Tipografía

- Lexend en `shared/src/commonMain/composeResources/font/`, con los pesos que usa `RubusTypography`: Medium (500), SemiBold (600), Bold (700) y ExtraBold (800). Junto a los archivos va el texto de la licencia OFL.
- `Type.kt` carga la familia con `Font(Res.font…)`, que es `@Composable`. Por eso `RubusTypography` pasa de `val` a una función `@Composable` que `RubusTheme` evalúa una vez, y se aplica la familia a toda la escala.
- Se corrigen el comentario de `Type.kt` ("La familia es la del sistema") y la línea del roadmap: solo Lexend, y por qué no Outfit.

### 2. Componentes base (`core/designsystem/component/`)

Mismo lenguaje que `RubusButton`: borde `RubusDimens.BorderWidth`, canto inferior `RubusDimens.OutlineDepth`, colores de `MaterialTheme.colorScheme` y de `RubusTheme.colors`. Ningún componente trae texto fijo: etiquetas, mensajes y textos de botón los pasa el llamador.

| Componente | Comportamiento |
|------------|----------------|
| `RubusTextField` | Etiqueta, valor y `onValueChange`; texto de ayuda o de error (el error cambia el color del borde); `enabled`; modo contraseña con alternar visibilidad; `KeyboardOptions` y acción de teclado; una sola línea. |
| `RubusCard` | Contenedor con borde y canto; con `onClick` es clicable, sin él no. |
| `RubusLoadingState` | Indicador centrado y mensaje opcional. |
| `RubusErrorState` | Mensaje y, si se pasa `onRetry`, un `RubusButton` para reintentar. |

El alternar contraseña necesita dos textos accesibles (mostrar y ocultar), que el llamador pasa como parámetros.

### 3. Navegación (`core/navigation/`)

Navigation Compose 2.9.2 con rutas tipadas (`@Serializable`).

- `Route.kt`: rutas del inventario que se migran: `Splash`, `Login`, `Home`, `History`, `Solicitudes`, `SolicitudDetalle(id)`, `Notifications`, `Profile`, `Capture`, `Result(id)`, `Queue`. Más dos rutas de desarrollo: `Diagnostico` y `Catalogo`.
- `RubusNavHost.kt`: el `NavHost`, con `Splash` como inicio y cada ruta apuntando a un destino marcador (el nombre de la ruta en pantalla). Las fases siguientes sustituyen los marcadores uno a uno.
- `Diagnostico` es la pantalla actual de `App.kt` (flavor, URL y "Probar conexión") movida tal cual. `Catalogo` muestra los componentes de la sección 2 en todos sus estados. Ambas se registran solo si `EnvConfig.environment == Environment.DEV`; en staging y prod no existen en el grafo. El marcador de `Splash` ofrece botones a las dos solo en dev.
- `App.kt` queda en tema más `RubusNavHost`. No hay redirección por sesión: llega en la Fase 1.

La lista de rutas registradas se obtiene de una función pura (`registeredRoutes(environment)`) que el test del grafo puede comprobar sin dibujar nada.

### 4. Pruebas

- **Navegación.** Test unitario sobre `registeredRoutes`: cada ruta migrada está, `Splash` es el inicio, y `Diagnostico` y `Catalogo` solo aparecen en DEV.
- **Componentes.** Se intenta primero incorporar Robolectric y `ui-test` a las dependencias de test del host (hoy no están: la fase del cliente HTTP solo usó Robolectric una vez, fuera del repositorio). Un solo test de humo valida que funciona con este toolchain. Si funciona, se cubren: deshabilitado, error visible, reintento clicable y alternar contraseña. Si no funciona en esa tarea, no se insiste: los componentes quedan sin lógica propia (todo el estado sube al llamador), se omiten los tests de UI y la verificación es el catálogo en dispositivo, anotada como pendiente de dispositivo. Cuál de los dos caminos se tomó se registra en `dependencias-pendientes.md`.
- Todo lo existente sigue en verde: `./gradlew :shared:testAndroidHostTest :androidApp:assemble`.

### 5. Documentación

- Roadmap: marcar `core/navigation` y `core/designsystem` como hechos, corregir la tipografía, y dejar la Fase 0 cerrada salvo las verificaciones de dispositivo y Mac.
- `dependencias-pendientes.md`: actualizar el estado de Navigation Compose y de los recursos de Compose (primer uso real) y la decisión abierta sobre Robolectric, según lo que se resuelva.

## Riesgos

- Los recursos de Compose Multiplatform 1.12 y AGP 9 no se han usado en este proyecto: es la primera dependencia real de `compose-components-resources` y de la generación de `Res`. La primera tarea de la implementación lo valida con un `assemble` antes de apoyar nada más.
- No se puede ver el resultado visual en esta máquina (sin emulador ni dispositivo). El aspecto de fuentes y componentes queda como pendiente de dispositivo, con el catálogo como medio de verificación.
- El tamaño de los archivos de Lexend suma al APK; se mide al terminar.

## Terminado cuando

1. `./gradlew clean :androidApp:assemble :shared:testAndroidHostTest` pasa en los tres flavors.
2. El grafo declara todas las rutas migradas con marcadores y `Diagnostico` y `Catalogo` solo existen en dev (test).
3. Los cuatro componentes existen con su API y aparecen en el catálogo.
4. La tipografía de `RubusTheme` usa Lexend (verificado por un test o por la inspección del tema).
5. Roadmap y `dependencias-pendientes.md` actualizados.
