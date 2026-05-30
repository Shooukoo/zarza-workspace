# RubusAI — Auditoría Técnica del Proyecto
**Fecha:** 2026-05-22  
**Audiencia:** Equipo técnico  
**Alcance:** Todos los servicios (fruit-backend, fruit-ms, fruit-inference, zarza_ai)

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Funcionalidades Implementadas](#2-funcionalidades-implementadas)
3. [Bases Establecidas — Incompleto o Parcial](#3-bases-establecidas--incompleto-o-parcial)
4. [Mejoras Sugeridas](#4-mejoras-sugeridas)
5. [Hallazgos de Seguridad](#5-hallazgos-de-seguridad)
6. [Estado de Tests](#6-estado-de-tests)
7. [Mapa de Prioridades](#7-mapa-de-prioridades)

---

## 1. Resumen Ejecutivo

RubusAI es una plataforma de agricultura de precisión para análisis fenológico de zarzamora mediante visión computacional. La arquitectura de microservicios está correctamente diseñada y el flujo principal (captura → upload → inferencia → notificación) funciona de extremo a extremo.

El proyecto está en un estado avanzado: la mayor parte del núcleo está implementado y el sistema es funcionalmente correcto. Los principales gaps son de **calidad** (cobertura de tests, logging estructurado, documentación de API) y de **funcionalidades pendientes** claramente identificadas (detección de enfermedades, lógica fenológica por variedad, panel web).

---

## 2. Funcionalidades Implementadas

### 2.1 fruit-backend (NestJS + Fastify)

#### Autenticación y Gestión de Sesión
- Registro y login con JWT (7 días) en HttpOnly cookie
- Extracción de token desde cookie y header `Authorization: Bearer`
- Logout con limpieza de cookie
- Perfil de usuario (`GET /auth/me`, `PATCH /auth/profile`)
- Registro de token FCM para push notifications (`PATCH /auth/fcm-token`)

#### Control de Acceso (RBAC)
- 4 roles: `ADMIN`, `PRODUCTOR`, `AGRONOMO`, `MONITOR`
- Guards `JwtAuthGuard` + `RolesGuard` en todos los endpoints sensibles
- Scoping de queries por rol (AGRONOMO restringido a campos asignados)

#### Gestión de Usuarios (Admin)
- CRUD completo de usuarios
- Cambio de rol y reset de contraseña por administrador
- Asignación de campos a usuarios

#### Ingesta de Imágenes
- Upload multipart con validación de magic numbers (JPEG/PNG)
- Validación de MIME type y sanitización de nombre de archivo
- Upload a Cloudflare R2 con clave `raw/<timestamp>-<filename>`
- Emisión de evento `nueva_fruta` a RabbitMQ

#### Consulta de Análisis
- Listado paginado con filtros (estado, campo, productor, rango de fechas)
- Detalle por ID con validación de acceso por rol
- URL presignada (15 min) para imagen en R2 (`GET /analyses/:id/image`)
- Validación de análisis por agrónomo (aprobar/rechazar) con observaciones

#### Gestión de Campos
- CRUD de campos con polígono GPS
- Listado filtrado por rol (productor ve sus campos, agrónomo ve campos asignados)

#### Solicitudes de Muestreo
- Crear solicitudes con asignación a monitor/agrónomo
- Máquina de estados: `PENDIENTE → EN_PROGRESO → COMPLETADO / CANCELADO`
- Filtros por estado y campo

#### Notificaciones en Tiempo Real
- Gateway WebSocket en `/ws` con heartbeat (`pong`)
- Eventos: `analisis_listo`, `analysis_validated`
- Endpoint interno `POST /internal/notify` protegido con token
- Push notification vía Firebase FCM con recuperación de tokens inválidos

#### Dashboard (Métricas)
- Estadísticas globales del sistema (`GET /admin/stats`)
- Pronóstico de rendimiento (`GET /admin/dashboard/yield`)
- Métricas de salud y % de merma (`GET /admin/dashboard/health`)
- Distribución de etapas fenológicas (`GET /admin/dashboard/phenology`)

#### Seguridad y Configuración
- Rate limiting: global 1000 req/min, auth endpoints 10 req/min
- Validación de variables de entorno con Joi al inicio
- CORS configurado por variable de entorno

---

### 2.2 fruit-ms (NestJS Microservice)

- Consumidor del evento `nueva_fruta` desde RabbitMQ
- Llamada HTTP a `fruit-inference /analyze` con `storage_key`
- Mapeo del reporte de inferencia al modelo `Analysis` (via `InferenceMapper`)
- Persistencia en PostgreSQL compartido con fruit-backend
- Notificación interna a fruit-backend tras persistir resultados
- `MessagePattern` `get_fruits` — consulta paginada con cursor
- `MessagePattern` `get_fruit_by_id` — por ID con validación de acceso

---

### 2.3 fruit-inference (Python FastAPI)

- Descarga de imagen desde Cloudflare R2
- Preprocesamiento: CLAHE (clip=2.0, tile=8) sobre canal L en espacio LAB
- Inferencia con YOLOv8 (`best.pt`) con umbral de confianza configurable
- Mapeo de 7 clases YOLO a etapas fenológicas
- Cálculo de peso visual por etapa (factor densidad × área bbox)
- Predicción de días para cosecha por etapa
- Reporte estructurado: conteos, porcentaje de merma, peso sano, cronograma
- Health check con estado del modelo (`GET /health`)

---

### 2.4 zarza_ai (Flutter BLoC)

#### Captura y Upload
- Selector de imagen (galería / cámara)
- Captura de GPS y metadata al momento de la foto
- Upload multipart online con fallback a cola offline
- Indicador de progreso de upload

#### Cola Offline (Drift + SQLite)
- Persistencia de uploads pendientes en base de datos local
- Sync automático al recuperar conectividad
- Reintentos automáticos (máx. 3) con backoff
- Resolución de conflictos: respuesta 409 → elimina de cola (ya procesado)
- Pantalla de visualización de cola pendiente

#### Historial de Análisis
- Listado paginado con pull-to-refresh
- Badges de salud por análisis
- Vista de detalle con gráficas de etapas fenológicas (`fl_chart`)

#### Notificaciones
- WebSocket con reconexión exponencial (5s–60s)
- FCM para push notifications en background
- Notificaciones locales para progreso de sync

#### Panel Admin (en app)
- Gestión de usuarios (crear, cambiar rol, reset password)
- Cola de validación de análisis
- Estadísticas del sistema
- Solicitudes de muestreo con máquina de estados

#### Sesión y Perfil
- Almacenamiento seguro de JWT (`flutter_secure_storage`)
- Auto-logout en respuesta 401
- Check de sesión al inicio (splash)
- Edición de perfil (nombre)

---

## 3. Bases Establecidas — Incompleto o Parcial

Estas funcionalidades tienen infraestructura creada pero la implementación está incompleta o parcialmente operativa.

### 3.1 Detección de Enfermedades
**Estado:** Arquitectura presente, modelo no entrenado  
- `model_config.py` define `is_sano: True` para todas las clases
- `CLASS_MAP` tiene campo `health` pero no hay clases de enfermedad en el modelo actual
- `Analysis` en BD tiene campo `elementosEnfermos` y `porcentajeMermaGeneral`
- La UI (`ResultsScreen`) tiene campos para mostrar datos de enfermedad

**Falta:** Entrenar modelo con clases de enfermedad + actualizar `CLASS_MAP` + actualizar UI para mostrar diagnóstico de enfermedad.

---

### 3.2 Lógica Fenológica por Variedad
**Estado:** Variedades definidas, timings estáticos  
- `model_config.py` lista 4 variedades: `regina`, `aketzali`, `amelali`, `erandi`
- `DIAS_PREDICCION` es un dict global, no diferenciado por variedad
- El campo `variedad` llega en el request de inferencia pero no afecta el cronograma de predicción

**Falta:** Definir `DIAS_PREDICCION` por variedad (matriz `variedad → etapa → días`) y usar `variedad` del request al construir el cronograma.

---

### 3.3 Workflow de Validación (UI)
**Estado:** Backend completo, UI parcial  
- `PATCH /analyses/:id/validate` implementado en backend con DTOs correctos
- `AnalysesPage` en Flutter existe y lista análisis
- La acción de validar/rechazar desde la app no tiene flujo visual completo (modal de observaciones, indicador de estado)

**Falta:** Modal de validación en Flutter con campo de observaciones, selección de acción, y feedback visual de éxito/error. Actualización del estado en lista tras validar.

---

### 3.4 Panel Web (zarza-web)
**Estado:** Directorio presente (`zarza-web/`), sin contenido implementado  
- El directorio existe en el monorepo pero parece vacío o en estado inicial
- El sistema de notificaciones y el backend ya tienen los endpoints necesarios

**Falta:** Implementar la aplicación web (presumiblemente React/Next.js o Flutter Web) que consuma los mismos endpoints del backend.

---

### 3.5 Documentación de API (Swagger/OpenAPI)
**Estado:** NestJS tiene soporte nativo, no configurado  
- `@nestjs/swagger` no está en las dependencias
- Los DTOs con `class-validator` son candidatos directos a decoradores Swagger

**Falta:** Instalar `@nestjs/swagger`, añadir decoradores a DTOs y controladores, exponer UI en `/api/docs`.

---

### 3.6 Tests en fruit-ms y fruit-inference
**Estado:** Mínimos o inexistentes  
- `fruit-ms`: 0 archivos de test
- `fruit-inference`: 1 archivo de test (`test_image_preprocessor.py`, cobertura parcial)
- Los paths críticos (mapper de inferencia, flujo `nueva_fruta` completo) no tienen cobertura

**Falta:** Unit tests del `InferenceMapper`, tests de integración del flujo RabbitMQ → inferencia → persistencia, tests de regresión del preprocessor con imágenes reales.

---

### 3.7 Logging Estructurado y Observabilidad
**Estado:** Logs básicos de NestJS (console), sin estructura ni correlación  
- No hay correlation ID entre servicios
- No hay integración con ningún sistema de logs (Datadog, Loki, CloudWatch)
- fruit-inference usa `print()` en algunos puntos

**Falta:** Logger estructurado (JSON) con campos `service`, `traceId`, `timestamp`. Propagación de `traceId` desde fruit-backend → RabbitMQ → fruit-ms → fruit-inference.

---

### 3.8 Configuración de AppConstants en Flutter
**Estado:** Hardcoded en código fuente  
- `AppConstants` (URLs de backend, WebSocket) está definido con valores literales
- No hay mecanismo de flavors/environments para apuntar a staging vs producción

**Falta:** Implementar Flutter flavors (`dev`, `staging`, `prod`) con archivos `.env` separados usando `flutter_dotenv` o la flag `--dart-define`.

---

## 4. Mejoras Sugeridas

### 4.1 Funcionalidad

#### Mapa Geográfico de Análisis
Los campos tienen `poligonoGps` y los análisis tienen `ubicacionLat/Lng`. Una vista de mapa (Google Maps o Mapbox) mostraría la distribución geográfica de análisis por campo, permitiendo identificar zonas de riesgo. El backend ya tiene índice `2dsphere` en `ubicacionGps`.

#### Exportación de Reportes (PDF/Excel)
Agregar un endpoint `GET /analyses/export?format=pdf|xlsx` que genere reportes para agrónomos. En Flutter, mostrar botón de exportar en `HistoryScreen`. Librerías: `pdfmake` (backend) o `pdf` package (Flutter).

#### Análisis Comparativo Temporal
Gráfica de evolución de un campo en el tiempo (etapas fenológicas semana a semana). El backend ya tiene todos los datos; solo falta un endpoint de agregación temporal y una gráfica en Flutter.

#### Gestión de Notificaciones In-App
Actualmente las notificaciones llegan por WebSocket/FCM pero no se persisten. Agregar una campana con historial de notificaciones leídas/no leídas. Requiere tabla `Notification` en BD y endpoint `GET /notifications`.

#### Soporte Multi-Campo en Captura
La pantalla de captura actualmente asocia la imagen a un solo campo. Permitir al usuario ver sus campos asignados en un selector antes de capturar mejoraría el flujo del monitor en campo.

---

### 4.2 Comportamiento y Rendimiento

#### Cache de Consultas Frecuentes
Las métricas de dashboard (`/admin/dashboard/*`) son costosas y se calculan en cada request. Implementar cache en Redis (TTL 5-15 min) reduciría carga en PostgreSQL. La infraestructura de Redis ya está mencionada como opcional en el stack.

#### Retry con Dead Letter Queue en RabbitMQ
Si `fruit-ms` falla al procesar un evento `nueva_fruta` (e.g., inferencia timeout), el mensaje se pierde. Configurar una DLQ en RabbitMQ con política de reintento (3x con backoff) y una cola de mensajes muertos para inspección manual.

#### Paginación Consistente
`fruit-backend` usa paginación offset (`page`, `limit`) y `fruit-ms` usa cursor-based. Unificar a cursor-based en todos los endpoints de listado para mejor performance en tablas grandes.

#### Timeout de Inferencia Configurable
El timeout HTTP de `fruit-ms` a `fruit-inference` está hardcoded en 3s en el notificador. La inferencia YOLO puede tardar más. Exponer `INFERENCE_TIMEOUT_MS` como variable de entorno y aumentar el valor por defecto a 30s.

#### Compresión de Imágenes Antes del Upload
Comprimir la imagen en Flutter antes de subir (max 1920px, calidad 85%) para reducir tiempo de upload y costo de almacenamiento en R2. El backend ya valida magic numbers, la compresión no rompe eso.

---

### 4.3 Diseño y UX (Flutter)

#### Estado de Procesamiento en Tiempo Real
Tras subir una imagen, el usuario no sabe si se está procesando. Añadir un estado `procesando` en `HistoryScreen` (spinner/skeleton en el ítem) que se actualice al recibir `analisis_listo` por WebSocket.

#### Pantalla de Detalle Mejorada (ResultsScreen)
- Mostrar imagen del análisis (presigned URL) con zoom
- Añadir timeline visual de etapas fenológicas (barra de progreso)
- Mostrar cronograma de cosecha como calendario o tabla de fechas

#### Feedback de Validación al MONITOR
Cuando un agrónomo valida/rechaza un análisis, el monitor que lo capturó no recibe notificación en la app. Emitir un evento WebSocket `analysis_validated` con el `userId` del capturador y actualizar el estado del análisis en su historial.

#### Manejo de Errores Más Descriptivo
Actualmente los errores de red se muestran como mensajes genéricos. Implementar un sistema de error mapping que traduzca códigos HTTP/errores de red a mensajes accionables en español (e.g., "Sin conexión — la imagen se guardó para sync automático").

#### Modo Oscuro
Los `ColorScheme` de Flutter están presentes pero no hay soporte de dark mode. Añadir `ThemeMode.system` y definir un `darkTheme` consistente con la paleta actual.

---

### 4.4 Arquitectura

#### Separar `zarza-web` como App Propia
El directorio `zarza-web` en el monorepo sugiere un panel web. Definir claramente si será Flutter Web (reutilizando código de `zarza_ai`) o una SPA independiente (React/Next.js). El reuso de Flutter Web simplifica el mantenimiento pero tiene limitaciones de performance.

#### Health Checks en docker-compose
Añadir `healthcheck` a cada servicio en `docker-compose.yml` para que los servicios dependientes esperen correctamente (fruit-ms no debe arrancar hasta que RabbitMQ esté listo, fruit-ms no debe procesar hasta que fruit-inference esté healthy).

#### Versionado de API
Añadir prefijo `/v1/` a todos los endpoints del backend para facilitar migraciones futuras sin romper clientes existentes. NestJS soporta versioning nativo con `@nestjs/common` `VersioningType`.

---

## 5. Hallazgos de Seguridad

### SEG-01 — WebSocket sin Autenticación
**Severidad:** Media  
**Descripción:** El gateway WebSocket en `/ws` no valida JWT al momento de la conexión. Cualquier cliente puede conectarse y recibir eventos de `analisis_listo` de cualquier usuario.  
**Impacto:** Filtración de metadatos de análisis (IDs, timestamps) a usuarios no autenticados o de otros productores.  
**Recomendación:** Implementar `canActivate` en el gateway con `JwtAuthGuard`. En NestJS WebSockets, el token puede enviarse en el query param `?token=...` o en el handshake de Socket.IO. Validarlo al establecer la conexión y asociar el socket al `userId`.

---

### SEG-02 — Broadcast WebSocket sin Scoping por Usuario
**Severidad:** Media  
**Descripción:** Los eventos `analisis_listo` y `analysis_validated` se emiten a **todos** los sockets conectados, no solo al usuario propietario del análisis.  
**Impacto:** Un productor puede ver notificaciones de análisis de otro productor si ambos están conectados simultáneamente.  
**Recomendación:** Implementar rooms en el gateway (una room por `userId`). Al conectar, unir el socket a `room:${userId}`. Emitir eventos solo a la room correspondiente: `server.to(\`room:${userId}\`).emit(...)`.

---

### SEG-03 — JWT con Expiración Larga sin Refresh Token
**Severidad:** Media  
**Descripción:** Los JWT tienen expiración de 7 días y no hay mecanismo de refresh token. Un token robado es válido durante toda su vida sin posibilidad de revocación.  
**Impacto:** Si un token se filtra (device robado, log inadvertido), el atacante tiene acceso válido por hasta 7 días.  
**Recomendación:** Implementar refresh token con expiración corta (15 min access + 7 días refresh). Alternativamente, añadir una blacklist de tokens revocados en Redis con TTL igual a la expiración del JWT.

---

### SEG-04 — Token Interno (`x-internal-token`) en Variable de Entorno sin Rotación
**Severidad:** Baja-Media  
**Descripción:** El `INTERNAL_NOTIFY_TOKEN` es un secreto compartido entre `fruit-ms` y `fruit-backend` almacenado como variable de entorno. No hay mecanismo de rotación ni auditoría de uso.  
**Impacto:** Si el token se filtra (logs de CI/CD, `.env` en repo), cualquier cliente puede disparar eventos WebSocket y push notifications falsos.  
**Recomendación:** (1) Verificar que `.env` está en `.gitignore` en todos los servicios. (2) Rotar el token periódicamente. (3) En producción, usar un secret manager (AWS Secrets Manager, Vault) en lugar de variables de entorno planas. (4) Añadir logging de cada llamada a `/internal/notify` con IP de origen.

---

### SEG-05 — Almacenamiento del Token FCM en Base de Datos sin Cifrado
**Severidad:** Baja  
**Descripción:** El campo `fcmToken` en el modelo `User` se almacena en texto plano en PostgreSQL.  
**Impacto:** Si la base de datos se compromete, los tokens FCM quedan expuestos. FCM tokens pueden usarse para enviar push notifications arbitrarias al dispositivo del usuario.  
**Recomendación:** Cifrar el campo `fcmToken` a nivel de aplicación antes de persistir (ej. AES-256 con clave en variable de entorno) o usar cifrado a nivel de columna en PostgreSQL.

---

### SEG-06 — fruit-inference sin Autenticación de Red
**Severidad:** Baja (mitigado por red Docker interna)  
**Descripción:** `fruit-inference` no tiene ningún mecanismo de autenticación. Depende exclusivamente de no estar expuesto públicamente.  
**Impacto:** Si el contenedor se expone accidentalmente (mal configuración de docker-compose o firewall), cualquier cliente puede ejecutar inferencias con imágenes arbitrarias.  
**Recomendación:** Añadir un header de autenticación simple (`x-inference-token`) validado en un middleware FastAPI, consistente con el patrón ya usado para el endpoint interno del backend.

---

### SEG-07 — Validación de Tamaño de Archivo sin Límite Explícito en Inferencia
**Severidad:** Baja  
**Descripción:** El backend limita el tamaño del archivo en el upload multipart, pero `fruit-inference` descarga la imagen directamente de R2 sin validar el tamaño antes de procesarla con OpenCV/YOLO.  
**Impacto:** Una imagen muy grande (>50MB si alguien sube directamente a R2) podría causar OOM en el contenedor de inferencia.  
**Recomendación:** Añadir validación de tamaño del objeto R2 antes de descargarlo (usando `HeadObject` de S3/R2) y rechazar con error 400 si excede el límite (ej. 10MB).

---

## 6. Estado de Tests

| Servicio | Archivos de Test | Tests Reales | Cobertura Estimada |
|----------|-----------------|-------------|-------------------|
| fruit-backend | 5 archivos | 2 completos, 3 stubs | ~15% |
| fruit-ms | 0 archivos | — | 0% |
| fruit-inference | 1 archivo | Parcial (preprocessor) | ~10% |
| zarza_ai | 10 archivos | 8 completos, 2 básicos | ~40% |

### Áreas Críticas sin Cobertura
- `InferenceMapper` en fruit-ms (lógica de mapeo compleja, propenso a regresiones)
- Flujo `nueva_fruta` end-to-end (RabbitMQ → inferencia → persistencia → notificación)
- Guards RBAC (ningún test valida que los roles bloquean correctamente)
- `IngestionService` (upload + publicación RabbitMQ)
- Módulo `solicitudes` (máquina de estados)

---

## 7. Mapa de Prioridades

### Prioridad Alta — Corregir Antes de Producción

| ID | Ítem | Tipo | Esfuerzo |
|----|------|------|----------|
| SEG-01 | Autenticación en WebSocket | Seguridad | Medio |
| SEG-02 | Scoping de eventos WebSocket por usuario | Seguridad | Medio |
| SEG-03 | Refresh tokens o blacklist de JWT | Seguridad | Alto |
| 3.1 | Detección de enfermedades (requiere re-entrenar modelo) | Funcionalidad | Muy Alto |
| 3.7 | Logging estructurado con traceId cross-service | Infraestructura | Medio |

### Prioridad Media — Próximo Sprint

| ID | Ítem | Tipo | Esfuerzo |
|----|------|------|----------|
| 3.3 | Workflow de validación completo en Flutter | UX | Medio |
| 3.8 | Flutter flavors (dev/staging/prod) | Infraestructura | Bajo |
| 4.2 | Estado de procesamiento en tiempo real (spinner post-upload) | UX | Bajo |
| 4.2 | Retry + DLQ en RabbitMQ | Infraestructura | Medio |
| 3.5 | Swagger/OpenAPI en fruit-backend | DX | Bajo |
| SEG-04 | Logging de `/internal/notify` + secret manager | Seguridad | Bajo |

### Prioridad Baja — Backlog

| ID | Ítem | Tipo | Esfuerzo |
|----|------|------|----------|
| 3.2 | Fenología específica por variedad | Funcionalidad | Medio |
| 4.1 | Mapa geográfico de análisis | Funcionalidad | Alto |
| 4.1 | Exportación de reportes PDF/Excel | Funcionalidad | Medio |
| 4.3 | Modo oscuro en Flutter | UX | Bajo |
| 4.2 | Cache Redis en dashboard metrics | Performance | Bajo |
| 6 | Tests en fruit-ms (InferenceMapper, flujo E2E) | Calidad | Medio |
| SEG-06 | Token de autenticación en fruit-inference | Seguridad | Bajo |
| SEG-07 | Validación de tamaño en descarga R2 | Seguridad | Bajo |

---

*Generado por auditoría automatizada + revisión técnica — RubusAI 2026-05-22*
