# Roadmap de migración: Flutter → Kotlin Multiplatform

Fecha: 2026-10-07

Migración de la app móvil `zarza_ai` (Flutter) a `rubus-ai-kmp` (Kotlin Multiplatform con Compose Multiplatform). El backend NestJS no se modifica.

## Decisiones de alcance

| Tema | Decisión |
|------|----------|
| Plataformas | Android primero. iOS es la fase 9, después del release de Android. |
| Panel de administración | No se migra; se queda en `zarza-web`. En el móvil un ADMIN ve `/home`, igual que hoy. |
| Usuarios actuales | No hay usuarios reales de la app Flutter. La app KMP la reemplaza sin plan de transición de datos. |
| Equipo | Una persona a tiempo parcial, con algo de experiencia en Kotlin/Android y ninguna en KMP. |
| Orden | Flujo crítico primero: capturar → subir → aviso → resultado antes que las pantallas de menor riesgo. |
| Base de datos local | Room KMP. |

Las estimaciones son **días efectivos de trabajo** de una persona, no días de calendario.

## Resumen de fases

| # | Fase | Qué queda funcionando al cerrarla | Días |
|---|------|-----------------------------------|------|
| 0 | Fundaciones | App con flavors, tema, navegación vacía, cliente HTTP con refresh de token, DI | 6–8 |
| 1 | Auth y splash | Login, sesión que sobrevive al reinicio, logout, redirección por sesión | 3–4 |
| 2 | Flujo crítico | Foto → compresión → GPS → subida con red → aviso por WebSocket → resultado | 9–11 |
| 3 | Offline y sincronización | Captura sin red, cola persistente, sync automático, pantalla de cola | 5–6 |
| 4 | Historial, inicio y barra inferior | Lista de análisis, `home`, navegación inferior con avisos en vivo | 6–7 |
| 5 | Solicitudes | Lista, detalle, cambio de estado, captura desde una solicitud | 3–4 |
| 6 | Notificaciones y push | Bandeja, campanita, token FCM, push con la app cerrada | 5–6 |
| 7 | Perfil y ayuda | Editar perfil, pantalla de ayuda | 2–3 |
| 8 | Release Android | Firma definitiva, Firebase, pruebas en dispositivo, distribución | 3–4 |
| 9 | iOS | Implementaciones de plataforma y TestFlight | 8–12 |

Android completo (fases 0–8): **42–53 días**. iOS: 8–12 días más.

## Bloqueos que dependen de ti

| Pendiente | Bloquea |
|-----------|---------|
| ~~Paleta de colores nueva~~ — resuelto: el tema ya está en `core/designsystem/theme` | — |
| ~~`applicationId` definitivo~~ — resuelto el 2026-10-09: `com.rubusai.app` (`.dev` y `.stg` en los otros flavors) | — |
| URLs reales de staging y producción (en Flutter son marcadores `zarza.example`) | Fase 8 |
| Confirmar si el registro de usuarios sigue vigente (ver "Dudas abiertas") | Fase 1 |
| Mac con Xcode y cuenta de Apple Developer | Fase 9 |

---

## Inventario de la app Flutter

134 archivos Dart, unas 15,000 líneas (950 son código generado de Drift y unas 2,000 son el panel admin, que no se migra). 21 archivos de test.

### Por feature

| Feature | Pantallas (líneas) | Casos de uso | Repositorio | Endpoints | Plataforma | Complejidad |
|---------|--------------------|--------------|-------------|-----------|------------|-------------|
| splash | `SplashScreen` (137) | `GetCurrentUser` | auth | ninguno (lee la sesión guardada) | almacenamiento seguro | Baja |
| auth | `LoginScreen` (206), `RegisterScreen` (258, sin ruta), `AuthCubit` global | `Login`, `Register`, `Logout`, `GetCurrentUser`, `UpdateProfile` | auth | `POST /auth/login`, `/auth/register`, `/auth/refresh`, `/auth/logout` | almacenamiento seguro | Media |
| home | `HomeScreen` (844) | `GetAnalysisList`, `WatchNotifications` | fruits, notifications | `GET /fruits` | — | Media |
| barra inferior | `ScaffoldWithBottomNav` (392) | `WatchNotifications`, `GetSolicitudes` | notifications, solicitudes | WebSocket `/ws` | — | Media |
| capture | `CaptureScreen` (610) | `UploadImage`, `GetCampos` | ingestion, campos, offlineQueue | `POST /ingestion/upload` (multipart), `GET /campos` | cámara, galería, GPS, compresión, conectividad, archivos | Alta |
| results | `ResultsScreen` (940) | `GetAnalysis`, `ValidateAnalysis` | fruits | `GET /fruits/:id`, `PATCH /analyses/:id/validate` | imágenes remotas | Alta |
| history | `HistoryScreen` (286) | `GetAnalysisList`, `WatchNotifications` | fruits, notifications | `GET /fruits` (`page`, `limit`, `user_id`, `start_date`, `end_date`) | — | Media |
| queue | `OfflineQueueScreen` (204) | `WatchPendingUploads`, `DeletePendingUpload`, `SyncPendingUploads` | offlineQueue | reutiliza `POST /ingestion/upload` | base de datos local, conectividad, notificaciones locales, archivos | Alta |
| solicitudes | lista (253), detalle (275) | `GetSolicitudes`, `GetSolicitudById`, `UpdateSolicitudEstado` | solicitudes | `GET /solicitudes`, `GET /solicitudes/:id`, `PATCH /solicitudes/:id/estado` | — | Media |
| notifications | `NotificationsScreen` (584), campanita | `GetNotifications`, `MarkRead`, `MarkAllRead`, `DeleteNotification`, `WatchNotifications` | notifications | `GET /notifications`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, `PATCH /auth/fcm-token`, WebSocket `/ws` | push FCM, notificaciones locales | Alta |
| profile | `ProfileEditScreen` (209) | `UpdateProfile` | auth | `PATCH /auth/profile` | — | Baja |
| help | 3 archivos (467), contenido estático | — | — | — | — | Baja |
| admin | 6 pantallas (~2,000) | 4 | admin | `/admin/*` | gráficas | **Fuera de alcance** |

Todas las rutas llevan el prefijo `/api/v1`.

### Piezas transversales

| Pieza | Comportamiento actual que hay que conservar |
|-------|---------------------------------------------|
| Sesión | Token, refresh token y usuario en almacenamiento seguro. Cada petición lleva `Authorization: Bearer`. Un 401 fuera de `/auth/` dispara el refresh y reintenta la petición. |
| WebSocket | Conecta a `/ws` y envía `{"event":"auth","data":{"token"}}`. Reconecta con espera creciente de 5 a 60 s. Eventos: `analisis_listo`, `analysis_validated`, `nueva_solicitud`. |
| Subida | Multipart con `file`, `campoId`, `capturedAt`, `offlineSyncId`, `gpsLat`, `gpsLon`. Timeout de 90 s. |
| Compresión | JPEG, lado máximo 2048 px, calidad 85, sin EXIF. |
| GPS | Precisión alta con límite de 8 s; la captura sigue aunque no haya ubicación. |
| Cola offline | Tabla `pending_uploads` con clave `offlineSyncId`. Estados: pendiente, sincronizando, fallido. Tres reintentos y luego fallido. Un 409 del servidor cuenta como éxito porque la captura ya existía. |
| Sync automático | Se dispara al arrancar la app y cada vez que vuelve la conexión, solo con la app abierta. |
| Notificaciones locales | Tres canales: alertas de análisis, sincronización offline (progreso) y push. |
| Roles | La pestaña de solicitudes solo aparece para MONITOR y AGRÓNOMO. |
| Tema | Solo tema oscuro; fuentes Outfit y Lexend. Orientación vertical fija. |

### Dependencias entre features

- **capture → queue.** La subida decide en el repositorio: sin red, copia la imagen a almacenamiento persistente y la encola. No son separables.
- **history, solicitudes y barra inferior → WebSocket.** Las tres escuchan eventos en vivo, así que el cliente WebSocket es infraestructura de `core`, no parte de `notifications`.
- **home → history.** `home` muestra la misma lista de análisis y no tiene datos propios.
- **solicitudes → capture.** El detalle de una solicitud abre la captura con un contexto (`CaptureContext`).
- **Todas → auth.**

### Tests que definen comportamiento a portar

Los de cola y sincronización son el criterio de cierre de la fase 3: `sync_service`, `local_queue_datasource`, `offline_aware_ingestion_repository`, `offline_queue_repository_impl`, `offline_queue_bloc`. También `capture_bloc`, `solicitudes_repository_impl`, `estado_solicitud`, `env_config` y `connectivity_service`.

---

## Equivalencias de librerías

| Flutter | KMP | Nota |
|---------|-----|------|
| dio | Ktor Client + kotlinx.serialization | El plugin `Auth` de Ktor serializa el refresh. El interceptor actual cierra la sesión si llegan dos 401 a la vez; ese comportamiento no se porta. |
| web_socket_channel | Ktor WebSockets | |
| flutter_bloc + equatable | ViewModel + StateFlow, `data class` | |
| go_router | Navigation Compose (multiplataforma) | Rutas tipadas con kotlinx.serialization. |
| get_it | Koin | |
| drift | Room KMP (con KSP y el driver SQLite empaquetado) | Una tabla, observada como `Flow`. |
| flutter_secure_storage | `SecureTokenStorage` propio | Android: DataStore con cifrado respaldado por Keystore. iOS: Keychain. |
| image_picker | Interfaz propia | Android: contratos `TakePicture` y selector de fotos del sistema. |
| flutter_image_compress | `ImageCompressor` propio | Android: `Bitmap`. iOS: `UIImage`. |
| geolocator | `LocationProvider` propio | Android: Fused Location. iOS: Core Location. |
| connectivity_plus | Interfaz propia | Android: `ConnectivityManager`. iOS: `NWPathMonitor`. |
| firebase_messaging | SDK nativo de Firebase en `androidApp` | El servicio de push en segundo plano es nativo de todos modos. |
| flutter_local_notifications | Interfaz propia | Android: `NotificationManagerCompat`. |
| cached_network_image | Coil 3 | |
| google_fonts | Fuentes empaquetadas como recursos de Compose | |
| intl, uuid | kotlinx-datetime, `kotlin.uuid` | |
| path_provider | Rutas por plataforma detrás de una interfaz | |
| fl_chart | — | Solo lo usa admin. |

---

## Detalle de fases

### Fase 0 — Fundaciones (6–8 días)

**Objetivo.** Dejar el proyecto listo para que cada fase siguiente solo agregue features.

**Qué se migra.**
- Build: dependencias en `libs.versions.toml`, KSP, serialización; flavors `dev`/`staging`/`prod` en `androidApp` con sufijo de `applicationId`, y `EnvConfig` resolviendo URL base y URL de WebSocket por flavor (hoy `env_config.dart`).
- `core/di`: módulos de Koin (creados en `AppModule.kt`; vacíos salvo `configModule`).
- `core/network`: cliente Ktor con JSON, timeouts, cabecera `Bearer` y refresh de token.
- `core/datastore` y `core/platform`: `SecureTokenStorage` para Android.
- `core/navigation`: grafo vacío con las rutas declaradas.
- `core/designsystem`: tema oscuro con la paleta nueva, tipografía Outfit/Lexend y los componentes base (botón, campo de texto, tarjeta, estado de carga y de error).
- `core/model`: `User`, `UserRole`.

**Librerías.** Koin, Ktor Client (motor OkHttp en Android, Darwin en iOS), kotlinx.serialization, kotlinx.coroutines, Navigation Compose, DataStore.

**Riesgos.**
- Compatibilidad de versiones entre Kotlin, KSP, Compose Multiplatform y AGP 9: el proyecto usa versiones muy recientes y no todas las librerías las soportan el primer día.
- ~~Las fábricas `createX()` de `core/platform` no reciben `Context`.~~ Resuelto el 2026-10-09: se eliminaron; cada implementación se registra en el módulo de Koin de su plataforma (`core/di/PlatformModule.*.kt`).

**Terminado cuando.** El flavor `dev` instala y abre una pantalla con el tema nuevo; una petición de prueba al backend local responde; un test unitario demuestra que un 401 dispara el refresh y reintenta una sola vez.

### Fase 1 — Auth y splash (3–4 días)

**Objetivo.** Entrar y salir de la app con sesión persistente.

**Qué se migra.** `core/data/auth` (repositorio, DTOs, sesión local), `feature/splash`, `feature/auth` (login y, si se confirma, registro), el estado global de sesión que hoy es `AuthCubit`, y la redirección de navegación según sesión.

**Librerías.** Las de la fase 0.

**Riesgos.**
- Los mensajes de error de login se deducen hoy buscando texto en la excepción (`401`, `already exists`). Conviene mapear por código HTTP.
- El registro actual no guarda refresh token; hay que confirmar qué devuelve el backend.

**Terminado cuando.** Login correcto lleva a una pantalla de inicio provisional; credenciales malas muestran el mensaje adecuado; al cerrar y abrir la app la sesión sigue; logout borra el almacenamiento seguro; con el token vencido la app refresca sin sacar al usuario.

### Fase 2 — Flujo crítico (9–11 días)

**Objetivo.** Validar de punta a punta, en un teléfono real, lo que define el producto.

**Qué se migra.**
- `core/model`: `FruitAnalysis`, `FenologicalDetection`, `Campo`, `UploadMetadata`, `UploadResult`.
- `core/data/campos`, `core/data/ingestion` (solo camino con red) y `core/data/analyses`.
- `core/platform`: `ImageCompressor`, `LocationProvider`, cámara y galería, permisos en tiempo de ejecución.
- `core/network`: cliente WebSocket con autenticación y reconexión.
- `feature/capture` y `feature/results`, incluida la validación del agrónomo.

**Librerías.** Ktor WebSockets, Coil 3, Play Services Location, AndroidX Activity (contratos de resultado).

**Riesgos.**
- Permisos de cámara y ubicación en Android 13+ y sus variantes por fabricante.
- Memoria al comprimir fotos de cámaras de alta resolución.
- `ResultsScreen` es la pantalla más grande de la app (940 líneas): es donde más pesa reescribir UI.
- El WebSocket debe sobrevivir a cambios de red y a que la app pase a segundo plano.

**Terminado cuando.** En un dispositivo físico: se toma una foto, se elige campo, se sube con GPS, llega `analisis_listo` y se abre el resultado con sus detecciones; un agrónomo puede validarlo; negar el permiso de ubicación no impide subir.

### Fase 3 — Offline y sincronización (5–6 días)

**Objetivo.** Que ninguna captura se pierda sin conexión.

**Qué se migra.** `core/database` (Room, tabla `pending_uploads`), el repositorio de cola, el repositorio de subida consciente de conexión, `core/sync` (`SyncService`, sync automático), el monitor de conectividad, las notificaciones locales de progreso y `feature/queue`.

**Librerías.** Room KMP, KSP, SQLite empaquetado.

**Riesgos.**
- La imagen encolada debe copiarse a almacenamiento persistente; los temporales de la cámara se borran.
- Si la app muere a mitad de un sync, los elementos en "sincronizando" deben volver a "pendiente" al arrancar.
- Evitar dos sincronizaciones simultáneas (arranque y cambio de conectividad a la vez).
- El sync solo corre con la app abierta, igual que hoy. Sincronizar en segundo plano con WorkManager es una mejora posible, fuera de este roadmap.

**Terminado cuando.** Pasan los tests portados de cola y sync; en modo avión se capturan tres fotos y aparecen en la cola; al volver la red se suben solas y la cola queda vacía; forzar el cierre a mitad del sync no pierde ni duplica capturas; un 409 se trata como éxito.

### Fase 4 — Historial, inicio y barra inferior (6–7 días)

**Objetivo.** Reemplazar la pantalla provisional por la navegación real.

**Qué se migra.** `feature/history` (lista paginada con filtros de fecha), `feature/home`, la barra inferior con pestañas por rol y los avisos en vivo de `analisis_listo` y `analysis_validated`, y `core/ui` con los widgets compartidos (`StageBadge`, `RingProgress`, `HelpTooltip`).

**Librerías.** Ninguna nueva.

**Riesgos.**
- `HomeScreen` tiene 844 líneas de UI a reescribir con la paleta nueva.
- Paginación y refresco por evento sin duplicar ni perder la posición de la lista.

**Terminado cuando.** La lista pagina y filtra; un análisis nuevo aparece sin recargar; la barra muestra las pestañas correctas para cada uno de los cuatro roles; tocar un análisis abre su resultado.

### Fase 5 — Solicitudes (3–4 días)

**Objetivo.** Que monitores y agrónomos atiendan solicitudes de muestreo.

**Qué se migra.** `core/model` (`Solicitud`, `EstadoSolicitud`), `core/data/solicitudes`, `feature/solicitudes` (lista y detalle), el cambio de estado y la captura iniciada desde una solicitud.

**Librerías.** Ninguna nueva.

**Riesgos.** El detalle recibe hoy el objeto completo como argumento de navegación; con rutas tipadas conviene pasar solo el `id` y cargarlo.

**Terminado cuando.** Un MONITOR ve sus solicitudes, pasa una a "en progreso", captura desde ella y la completa; `nueva_solicitud` actualiza la lista en vivo; un PRODUCTOR no ve la pestaña.

### Fase 6 — Notificaciones y push (5–6 días)

**Objetivo.** Avisar al usuario dentro y fuera de la app.

**Qué se migra.** `core/data/notifications`, `feature/notifications` (bandeja, marcar leída, marcar todas, borrar), la campanita, `PushTokenProvider`, el registro del token en `PATCH /auth/fcm-token`, el servicio de mensajería en segundo plano y los canales de notificación.

**Librerías.** Firebase BoM y Firebase Messaging en `androidApp`, plugin de Google Services.

**Riesgos.**
- Firebase se registra por `applicationId`: hay que registrar los tres (`com.rubusai.app`, `.dev` y `.stg`) y descargar un `google-services.json` por flavor.
- Permiso `POST_NOTIFICATIONS` en Android 13+.
- Los fabricantes con ahorro de batería agresivo retrasan o bloquean el push.
- `google-services.json` no debe entrar al repositorio si el proyecto de Firebase es privado.

**Terminado cuando.** La bandeja lista y actualiza estados; con la app cerrada llega un push al terminar un análisis; tocarlo abre el resultado; tras cerrar sesión el dispositivo deja de recibir push de ese usuario.

### Fase 7 — Perfil y ayuda (2–3 días)

**Objetivo.** Cerrar la paridad funcional con Flutter.

**Qué se migra.** `feature/profile` (editar nombre y apellido) y `feature/help` (contenido estático por secciones).

**Librerías.** Ninguna nueva.

**Riesgos.** Bajos. El texto de ayuda son 305 líneas a trasladar a recursos.

**Terminado cuando.** Los cambios de perfil persisten tras reiniciar; la ayuda muestra todas las secciones; una revisión pantalla por pantalla contra la app Flutter no encuentra faltantes.

### Fase 8 — Release Android (3–4 días)

**Objetivo.** Un build de producción instalable y distribuible.

**Qué se hace.**
- **Identificador.** Hecho en la fase 0: `applicationId`, `namespace` y paquete Kotlin son `com.rubusai.app`. La app Flutter usa `com.example.rubus_ai`, así que ambas pueden estar instaladas a la vez. Queda pendiente el identificador de iOS (`iosApp/Configuration/Config.xcconfig`), que se cambia en la fase 9.
- **Firma.** Keystore propio fuera del repositorio, con credenciales en `local.properties` o variables de entorno. Hoy el release de Flutter se firma con la llave de debug.
- **Firebase.** Registrar el paquete nuevo (y sus variantes `.dev` y `.stg`) y descargar el `google-services.json` de cada flavor.
- **Configuración.** URLs reales de staging y producción; solo HTTPS en `prod`.
- **Optimización.** R8 activado, con reglas para Ktor, kotlinx.serialization, Room y Koin.
- **Pruebas.** Recorrido completo en al menos dos teléfonos físicos (uno de gama baja), incluida una sesión real en campo con mala señal.
- **Distribución.** Firebase App Distribution para las pruebas, luego prueba interna de Google Play, y producción cuando el recorrido en campo salga limpio.

**Convivencia con Flutter.** Como no hay usuarios reales, no hay migración de datos ni de sesiones. Durante el desarrollo ambas apps se instalan lado a lado y apuntan al mismo backend, lo que permite comparar pantalla por pantalla. Flutter queda congelada (solo correcciones críticas) desde la fase 2, y `zarza_ai` se archiva al cerrar esta fase.

**Riesgos.**
- R8 rompe en release lo que funciona en debug; hay que probar el build de release, no el de debug.
- Perder el keystore impide actualizar la app publicada: respaldarlo fuera del equipo.

**Terminado cuando.** Un APK/AAB `prod` firmado con el keystore propio se instala desde el canal de distribución, pasa el recorrido completo contra producción y recibe push.

### Fase 9 — iOS (8–12 días)

**Objetivo.** Llevar a iPhone lo ya probado en Android.

**Qué se hace.** Implementaciones de iOS, registradas en `iosPlatformModule`, para almacenamiento seguro (Keychain), cámara y galería, compresión, ubicación, conectividad, notificaciones locales y push (APNs + Firebase); configuración de Room y Ktor para iOS; permisos en `Info.plist`; firma y TestFlight.

**Librerías.** Motor Darwin de Ktor, Firebase iOS SDK por Swift Package Manager.

**Riesgos.**
- La app nunca ha corrido en iOS: `zarza_ai` no tiene carpeta `ios/`. No hay comportamiento previo con el cual comparar.
- El push en iOS requiere cuenta de pago de Apple Developer y certificados APNs.
- El trabajo en segundo plano está más restringido que en Android.
- La estimación es la menos confiable del roadmap.

**Terminado cuando.** El recorrido completo de la fase 8 pasa en un iPhone físico con un build de TestFlight.

---

## Puntos de mayor riesgo y cómo validarlos pronto

| Riesgo | Por qué importa | Validación temprana |
|--------|-----------------|---------------------|
| Captura de imagen y GPS | Es la entrada de todo el sistema y depende del hardware y los permisos de cada teléfono. | Fase 2, en dispositivo físico desde el primer día de la fase; no cerrar con emulador. |
| Offline-first | Una captura perdida en campo no se puede repetir. | Fase 3 inmediatamente después del flujo con red, con los tests de Flutter portados y pruebas en modo avión y con cierre forzado. |
| Sincronización | Duplicados o capturas atoradas. | El backend ya deduplica por `offlineSyncId` (409). Probar reintentos, cierre a mitad del sync y dos disparos simultáneos en la fase 3. |
| FCM | Depende del identificador de la app, de Firebase y del fabricante del teléfono. | Identificador ya decidido en la fase 0 (`com.rubusai.app`). Al inicio de la fase 6, antes de construir la bandeja, enviar un push de prueba con la app cerrada. |
| Soporte iOS | Se implementa al final y nunca ha existido. | Mantener todo el código compartido libre de APIs de Android, y compilar el framework de iOS en un Mac al cerrar las fases 0, 2 y 3 aunque no se implemente nada. |
| Versiones del toolchain | AGP 9 y Kotlin recientes pueden no estar soportados por alguna librería. | Fase 0: agregar todas las librerías del roadmap de una vez y confirmar que el proyecto compila antes de escribir features. |

## Dudas abiertas sobre el código Flutter

1. **Registro de usuarios.** `RegisterScreen` existe, pero ninguna ruta ni pantalla navega hacia ella; en la práctica los usuarios se crean desde el panel admin. Falta confirmar si el registro se migra o se descarta.
2. **Sync en segundo plano.** Hoy solo sincroniza con la app abierta. Falta confirmar si eso es suficiente en campo o si se quiere WorkManager como mejora posterior.
