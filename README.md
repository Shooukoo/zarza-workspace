# Zarza AI — Sistema de Monitoreo Inteligente de Zarzamora

> Plataforma de visión computacional para agricultura de precisión. Automatiza el conteo de frutos, estima el peso y el tonelaje por campo, predice la fecha de cosecha y genera métricas de salud del cultivo a partir de imágenes capturadas con un dispositivo móvil.

---

## Funcionalidades Principales

| Funcionalidad | Descripción |
|---|---|
| **Detección fenológica** | Clasifica frutos de zarzamora en 7 etapas mediante YOLOv8 |
| **Estimación de peso** | Calcula el peso estimado por fruto (visual + tabla por etapa) y proyecta el tonelaje por campo |
| **Predicción de cosecha** | Estima los días restantes para la cosecha según la etapa detectada |
| **Dashboard web** | Panel React con gráficas de producción, métricas de merma y gestión de usuarios/campos |
| **Modo Offline-First** | La app móvil captura y guarda muestreos sin internet; sincroniza al recuperar la red |
| **Notificaciones en tiempo real** | WebSocket + push FCM para solicitudes de muestreo y resultados de análisis |
| **Control de acceso RBAC** | Jerarquía de roles: Admin · Productor · Agrónomo · Monitor |
| **Validación por experto** | El Agrónomo puede revisar y corregir diagnósticos de la IA (Human-in-the-Loop) |

---

## Arquitectura del Sistema

Zarza AI sigue una arquitectura de **microservicios desacoplados** orquestados con Docker Compose. La comunicación entre servicios es asíncrona vía RabbitMQ, la persistencia usa **PostgreSQL** (compartido vía el paquete `@rubus/database`/Prisma) y el almacenamiento de imágenes utiliza Cloudflare R2 (compatible S3).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                         │
│                                                                     │
│   ┌───────────────────────────┐   ┌─────────────────────────────┐   │
│   │   zarza_ai  (Flutter)     │   │   zarza-web  (React + Vite) │   │
│   │  • Captura + GPS          │   │  • Dashboard de producción  │   │
│   │  • Caché Offline (SQLite) │   │  • Gestión de usuarios/campos│  │
│   │  • Sync automático        │   │  • Solicitudes de muestreo  │   │
│   │  • Notificaciones FCM     │   │  • Notificaciones WebSocket │   │
│   └─────────────┬─────────────┘   └──────────────┬──────────────┘   │
└─────────────────┼────────────────────────────────┼───────────────── ┘
                  │  HTTPS · REST JSON · WebSocket  │
┌─────────────────▼────────────────────────────────▼─────────────────┐
│                    CAPA DE LÓGICA DE NEGOCIO                        │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │          fruit-backend  (NestJS + Fastify · Puerto 3001)    │   │
│   │   • JWT Auth (access + refresh) + RBAC Guards               │   │
│   │   • Upload imagen → Cloudflare R2                           │   │
│   │   • Publica evento "nueva_fruta" → RabbitMQ                 │   │
│   │   • WebSocket + FCM para notificaciones en tiempo real      │   │
│   │   • Cache de dashboard (Redis)                              │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │ AMQP (RabbitMQ)                      │
│   ┌──────────────────────────▼──────────────────────────────────┐   │
│   │          fruit-ms  (NestJS Microservice)                    │   │
│   │   • Consume evento "nueva_fruta" (ack manual, reintentos)   │   │
│   │   • Llama a fruit-inference → obtiene reporte fenológico    │   │
│   │   • Persiste resultado en PostgreSQL                        │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ HTTP POST /analyze (red interna)
┌─────────────────────────────▼───────────────────────────────────────┐
│                 CAPA DE PERSISTENCIA Y PROCESAMIENTO                │
│                                                                     │
│  ┌─────────────────┐  ┌──────────┐  ┌─────────────────┐  ┌────────┐ │
│  │  PostgreSQL 16  │  │  Redis   │  │ Cloudflare R2   │  │fruit-  │ │
│  │  (Prisma, vía   │  │ (cache   │  │  (Imágenes)     │  │inference│ │
│  │  @rubus/database)│  │ dashboard)│  │  storage_key    │  │FastAPI+│ │
│  │                 │  │          │  │                 │  │YOLOv8  │ │
│  │                 │  │          │  │                 │  │:8000   │ │
│  │                 │  │          │  │                 │  │(interno)│ │
│  └─────────────────┘  └──────────┘  └─────────────────┘  └────────┘ │
└─────────────────────────────────────────────────────────────────────┘

Infraestructura compartida
├── PostgreSQL 16 (PostGIS)  → Persistencia de análisis, usuarios y campos (Prisma)
├── Redis 7                  → Cache del dashboard de fruit-backend
├── RabbitMQ 3               → Cola de mensajería asíncrona + DLX/DLQ
└── FCM                      → Notificaciones push a dispositivos móviles
```

---

## Estructura del Repositorio

Monorepo gestionado con **pnpm workspaces** para los paquetes TypeScript.

```
zarza-workspace/
├── docker-compose.yml         # Orquestación de todos los servicios
├── docs/                      # Documentación técnica y de investigación
├── packages/
│   └── database/               # @rubus/database — cliente Prisma compartido (PostgreSQL)
├── fruit-backend/              # API Gateway principal (NestJS + Fastify)
├── fruit-inference/            # Servicio de inferencia IA (FastAPI + YOLOv8)
├── fruit-ms/                   # Microservicio consumidor (NestJS + PostgreSQL)
├── zarza-web/                  # Dashboard web (React + Vite + antd)
└── zarza_ai/                   # Aplicación móvil (Flutter / Dart)
```

Cada servicio tiene su propio `README.md` con detalles de arquitectura interna, endpoints y variables de entorno: [fruit-backend](fruit-backend/README.md) · [fruit-ms](fruit-ms/README.md) · [fruit-inference](fruit-inference/README.md) · [zarza-web](zarza-web/README.md) · [zarza_ai](zarza_ai/README.md) · [packages/database](packages/database/README.md).

---

## Roles de Usuario (RBAC)

El sistema implementa Control de Acceso Basado en Roles. Cada rol tiene acceso estrictamente delimitado:

| Rol | Plataforma | Permisos |
|---|---|---|
| **Administrador** | Web + App | Control total (CRUD). Gestiona usuarios, crea solicitudes de muestreo y visualiza todos los datos del sistema. |
| **Productor** | Web (Solo Lectura) | Consulta gráficas de producción, proyecciones de cosecha y campos asignados. |
| **Agrónomo** | Web (Solo Lectura) | Analiza métricas de salud y puede validar o corregir diagnósticos de la IA (Human-in-the-Loop). |
| **Monitor** | App Móvil + Web (solicitudes) | Captura imágenes en campo, opera en modo offline y recibe solicitudes de muestreo vía notificación push. |

---

## Modelo de Inteligencia Artificial

### Etapas Fenológicas Detectadas

El modelo YOLOv8 (`best.pt`) clasifica cada fruto detectado en una de las siguientes etapas:

| Clase | Etapa Fenológica | Peso Aprox. | Días para Cosecha |
|---|---|---|---|
| `boton` | Botón floral | 0.1 g | ~45 días |
| `flor` | Floración | 0.2 g | ~35 días |
| `verde` | Fruto verde | 1.8 g | ~28 días |
| `naranja` | Pintón / naranja | 3.5 g | ~8 días |
| `marron` | Café / casi maduro | 4.5 g | ~3 días |
| `maduro` | Maduro / listo para cosecha | 6.0 g | 0 días |
| `zarzamora` | Detección general | 3.0 g | 0 días |

El peso también puede estimarse visualmente por fruto (segmentación HSV + ajuste de elipse sobre el bounding box), con el valor de la tabla como respaldo si la estimación visual falla. Ver [fruit-inference/README.md](fruit-inference/README.md).

### Variedades Soportadas

`Regina` · `Aketzali` · `Amelali` · `Erandi`

### Salida del Modelo

Por cada imagen analizada, el sistema retorna:

- Conteo de frutos por etapa fenológica
- Peso estimado total y desglose por etapa
- Cronograma fenológico con proyección de fecha de cosecha
- Métricas de salud: total detectado, sanos, enfermos y porcentaje de merma
- Proyección de tonelaje por campo

---

## Módulos

### 1. `fruit-backend` — API Gateway

**Stack:** NestJS 11 · Fastify 5 · TypeScript · RabbitMQ (`amqplib`) · Cloudflare R2 (AWS SDK v3) · JWT · Redis · FCM · Prisma (`@rubus/database`)

API principal que recibe peticiones de la app móvil y el dashboard web. Gestiona autenticación, carga de imágenes, cola de eventos y comunicación en tiempo real. Detalle completo de módulos, endpoints y variables de entorno en [fruit-backend/README.md](fruit-backend/README.md).

### 2. `fruit-inference` — Servicio de Inferencia IA

**Stack:** Python 3.11 · FastAPI · Ultralytics YOLOv8 · OpenCV · Cloudflare R2 (`boto3`) · Pydantic

Microservicio Python que implementa el pipeline de análisis visual (preprocesado, inferencia YOLOv8, estimación de peso). Opera únicamente en la red interna Docker y nunca está expuesto a internet. Detalle en [fruit-inference/README.md](fruit-inference/README.md).

> **Importante:** el archivo de pesos entrenados debe existir en `fruit-inference/best.pt` antes de levantar los servicios (se monta como volumen de solo lectura, no se copia dentro de la imagen).

### 3. `fruit-ms` — Microservicio Consumidor

**Stack:** NestJS 11 · TypeScript · RabbitMQ (`EventPattern` / `MessagePattern`) · Prisma (`@rubus/database`) · PostgreSQL

Microservicio NestJS que opera **únicamente a través de RabbitMQ** (no expone puertos HTTP salvo un healthcheck interno). Aplica arquitectura limpia con separación en capas `Domain / Infrastructure / Ports`. Detalle en [fruit-ms/README.md](fruit-ms/README.md).

### 4. `zarza-web` — Dashboard Web

**Stack:** React 18 · Vite · TypeScript · Ant Design · TanStack Query · Recharts

Panel de administración y visualización servido para Admin, Productor, Agrónomo y Monitor, con secciones diferenciadas por rol (dashboard, usuarios, campos, solicitudes, análisis). Detalle en [zarza-web/README.md](zarza-web/README.md).

### 5. `zarza_ai` — Aplicación Móvil

**Stack:** Flutter 3 · Dart SDK `^3.11.1`

Aplicación móvil multiplataforma (Android / iOS) con arquitectura **Clean Architecture** (capas `Domain`, `Data`, `Presentation`) y soporte **Offline-First**. Detalle en [zarza_ai/README.md](zarza_ai/README.md).

### 6. `packages/database` — Cliente Prisma Compartido

**Stack:** Prisma 6 · PostgreSQL

Paquete de workspace (`@rubus/database`) que centraliza el schema de Prisma, las migraciones y el `PrismaService` reutilizados por `fruit-backend` y `fruit-ms`. Detalle en [packages/database/README.md](packages/database/README.md).

---

## Modelo de Datos (PostgreSQL vía Prisma)

Schema completo en [`packages/database/prisma/schema.prisma`](packages/database/prisma/schema.prisma). Tablas principales:

### `users`

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | String | Identificador de acceso. Único, indexado. |
| `passwordHash` | String | Hash bcrypt de la contraseña. Nunca expuesto en la API. |
| `role` | Enum | `ADMIN` · `PRODUCTOR` · `AGRONOMO` · `MONITOR`. |
| `firstName` / `lastName` | String? | Nombre del usuario. |
| `fcmToken` | String? | Token cifrado (AES-GCM) para notificaciones push. |

### `campos` / `user_campos`

| Campo | Tipo | Descripción |
|---|---|---|
| `codigoCampo` | String | Código alfanumérico único de la huerta. |
| `productorId` | UUID | Referencia al dueño en `users`. |
| `poligonoGps` | Json? | Coordenadas del perímetro geográfico de la parcela. |
| `user_campos` | tabla puente | Asigna agrónomos/monitores a campos (N:M). |

### `analyses` / `fenologia_etapas`

| Campo | Tipo | Descripción |
|---|---|---|
| `imageId` | String | ID único de la captura. Único. |
| `storageKey` | String | Ruta de la imagen cruda en Cloudflare R2. |
| `requesterUserId` / `requesterEmail` | Snapshot inmutable del solicitante. |
| `fechaAnalisis` | DateTime | Timestamp de la inferencia. |
| `campoId` / `productorId` | UUID | Referencias a `campos` / `users`. |
| `ubicacionLat` / `ubicacionLng` | Float? | Coordenadas GPS de la captura. |
| `offlineSyncId` | String? | UUID único del dispositivo (evita duplicados al sincronizar). |
| `totalElementosDetectados`, `elementosSanos`, `elementosEnfermos`, `porcentajeMermaGeneral`, `pesoSanoGramos` | Métricas de salud y peso del análisis. |
| `validacionEstado`, `validacionFueCorregido`, `validacionCorregidoPorId`, ... | Flujo de validación por Agrónomo (Human-in-the-Loop). |
| `fenologia_etapas` | tabla hija | Una fila por etapa detectada (`etapa`, `cantidad`, `enDias`, `diasParaCosecha`). |

### `solicitudes_muestreo`

| Campo | Tipo | Descripción |
|---|---|---|
| `creadoPorId` | UUID | Admin que crea la tarea. |
| `asignadoAId` | UUID | Monitor o Agrónomo asignado. |
| `campoId` | UUID | Lugar donde se realiza el muestreo. |
| `estado` | Enum | `PENDIENTE` · `EN_PROGRESO` · `COMPLETADO` · `CANCELADO`. |
| `fechaLimite` | DateTime? | Plazo de la tarea. |

### `refresh_tokens` / `notifications`

Soportan la rotación de JWT (`RefreshToken`: hash, `familyId`, expiración/revocación) y la bandeja de notificaciones in-app (`Notification`: tipo, título, cuerpo, `read`, expiración), ambas persistidas y consultadas desde `fruit-backend`.

---

## Flujo Completo de un Análisis

```
 1. [Flutter / Web]    Usuario captura imagen y pulsa "Analizar"
 2. [fruit-backend]    POST /api/v1/ingestion/upload  (multipart/form-data + metadatos GPS)
 3. [fruit-backend]    Valida magic number del archivo
 4. [fruit-backend]    Sube imagen a Cloudflare R2  →  obtiene storage_key
 5. [fruit-backend]    Emite evento "nueva_fruta"  →  RabbitMQ
 6. [fruit-backend]    Responde 201 al cliente  { image_id, storage_key, status: "UPLOADED" }
 7. [fruit-ms]         Consume evento "nueva_fruta" (ack manual, prefetch 5)
 8. [fruit-ms]         POST /analyze  →  fruit-inference  (con reintentos y backoff exponencial)
 9. [fruit-inference]  Descarga imagen de Cloudflare R2  (boto3)
10. [fruit-inference]  Preprocesa (balance de blancos + CLAHE) y ejecuta inferencia YOLOv8
11. [fruit-inference]  Calcula métricas: peso, merma, días para cosecha
12. [fruit-inference]  Retorna reporte JSON estructurado
13. [fruit-ms]         Mapea reporte  →  entidad de dominio
14. [fruit-ms]         Persiste análisis en PostgreSQL (Prisma)
15. [fruit-ms]         Notifica a fruit-backend (`/internal/notify`)  →  WebSocket + FCM al cliente
16. [Flutter / Web]    GET /api/v1/analyses/:id  ó  escucha WebSocket  →  muestra resultados
```

### Flujo Offline (App Móvil)

```
 1. [Flutter]   Captura imagen sin internet
 2. [Flutter]   Genera UUID (offline_sync_id) y guarda en SQLite local
 3. [Flutter]   Muestra ícono "Guardado localmente"
    ...
 4. [Flutter]   Detecta retorno de la red
 5. [Flutter]   Muestra indicador "Sincronizando..."
 6. [Flutter]   POST /api/v1/ingestion/upload  (incluye offline_sync_id)
 7. [fruit-backend]  Valida UUID → constraint único evita duplicados en PostgreSQL
 8. [Flutter]   Vacía la caché local al recibir 201
```

---

## Despliegue con Docker Compose

### Pre-requisitos

- Docker Desktop 4.x o superior
- Credenciales de Cloudflare R2 (bucket ya creado)
- Modelo entrenado `best.pt` colocado en `fruit-inference/best.pt`
- Archivos `.env` configurados en cada servicio (ver README de cada servicio)

### Pasos

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd zarza-workspace

# 2. Configurar variables de entorno
cp fruit-backend/.env.example   fruit-backend/.env
cp fruit-ms/.env.example        fruit-ms/.env
cp fruit-inference/.env.example fruit-inference/.env
# Editar cada .env con las credenciales reales

# 3. Levantar todos los servicios
docker compose up --build

# 4. Verificar que todo está corriendo
docker compose ps
```

### Puertos Expuestos

| Servicio | Host | Descripción |
|---|---|---|
| `fruit-backend` | `0.0.0.0:3001` → 3000 interno | API REST (`/api/v1`) + WebSocket (`/ws`) |
| `fruit-inference` | `127.0.0.1:8000` | Servicio de inferencia (solo interno) |
| `zarza-web` | `0.0.0.0:5173` | Dashboard web (servidor Vite dev en el compose actual) |
| `postgres` | `127.0.0.1:5433` → 5432 interno | PostgreSQL (acceso local) |
| `rabbitmq` | `127.0.0.1:5672` | AMQP |
| `rabbitmq` | `127.0.0.1:15672` | Panel de administración RabbitMQ |
| `redis` | `127.0.0.1:6379` | Cache (solo desarrollo local) |

> `fruit-ms` **no expone ningún puerto público**. Se comunica únicamente a través de RabbitMQ y la red interna `fruit-net`; su healthcheck (`HEALTH_PORT`, 3002) solo es visible dentro de Docker.

### Actualizar el Modelo de IA

Para reemplazar los pesos de YOLOv8 sin interrumpir el resto del sistema:

```bash
# Reemplazar el archivo de pesos
cp nuevo_modelo.pt fruit-inference/best.pt

# Reiniciar únicamente el Worker de IA
docker compose restart fruit-inference
```

---

## Desarrollo Local (sin Docker)

Asegúrate de tener PostgreSQL, RabbitMQ y Redis corriendo localmente, o usa:

```bash
docker compose up postgres rabbitmq redis
```

### `packages/database`

```bash
cd packages/database
pnpm install
pnpm run generate       # genera el cliente Prisma
pnpm run migrate:dev     # aplica migraciones en desarrollo
```

### `fruit-backend`

```bash
cd fruit-backend
pnpm install
pnpm run start:dev
```

### `fruit-inference`

```bash
cd fruit-inference
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### `fruit-ms`

```bash
cd fruit-ms
pnpm install
pnpm run start:dev
```

### `zarza-web`

```bash
cd zarza-web
npm install
npm run dev
```

### `zarza_ai`

```bash
cd zarza_ai
flutter pub get
flutter run --flavor dev
```

---

## Pruebas

### `fruit-backend`

```bash
cd fruit-backend
pnpm run test        # Unit tests (Jest) — cobertura real en auth, admin, fcm, notifications, solicitudes, storage, cache
pnpm run test:e2e    # End-to-end tests (plantilla mínima, pendiente de ampliar)
pnpm run test:cov    # Cobertura de código
```

### `fruit-ms`

```bash
cd fruit-ms
pnpm run test        # Cobertura real en fruits.controller/service, rabbitmq-topology, inference-http.adapter
```

### `fruit-inference`

```bash
cd fruit-inference
pytest    # Cobertura real en auth, r2_client, image_preprocessor; pendiente en analysis/weight/yolo_client
```

### `zarza_ai`

```bash
cd zarza_ai
flutter test
```

---

## Seguridad

| Aspecto | Implementación |
|---|---|
| **Autenticación** | JWT de acceso + refresh token con rotación (`RefreshToken` en PostgreSQL, revocación por familia). |
| **Autorización** | `JwtAuthGuard` + `RolesGuard` en cada endpoint. Devuelve HTTP 403 si el rol es insuficiente. |
| **Contraseñas** | Hash bcrypt. Nunca se expone el hash en respuestas de la API. |
| **Rate limiting** | `ThrottlerGuard` (límite global 1000 req/min y límite dedicado para `auth`). |
| **Cabeceras HTTP** | `@fastify/helmet` para protección de cabeceras HTTP estándar. |
| **CORS** | Configurado para restringir el acceso a orígenes permitidos. |
| **Datos sensibles** | Token FCM cifrado con AES-GCM (`FCM_TOKEN_ENCRYPTION_KEY`). |
| **Endpoints internos** | `/internal/notify` protegido por token compartido (`INTERNAL_NOTIFY_TOKEN`), no por JWT de usuario. |
| **Aislamiento del Worker IA** | `fruit-inference` solo es accesible desde la red interna Docker (`fruit-net`) y exige `INFERENCE_AUTH_TOKEN` en `/analyze`. |
| **Almacenamiento** | Las imágenes en Cloudflare R2 deben servirse con URLs firmadas con tiempo de expiración. |

Ver también [SECURITY.md](SECURITY.md) para la política de reporte de vulnerabilidades y rotación de secretos internos.

---

## Stack Tecnológico Completo

| Área | Tecnología |
|---|---|
| API Gateway | NestJS 11, Fastify 5, TypeScript |
| Inferencia IA | FastAPI, Ultralytics YOLOv8, OpenCV, Python 3.11 |
| Microservicio | NestJS 11, TypeScript |
| Dashboard web | React 18, Vite, TypeScript, Ant Design, TanStack Query, Recharts |
| App móvil | Flutter 3, Dart `^3.11.1` |
| Cola de mensajes | RabbitMQ 3 |
| Base de datos | PostgreSQL 16 (PostGIS), Prisma 6 (`@rubus/database`) |
| Cache | Redis 7 |
| Almacenamiento | Cloudflare R2 (S3-compatible) |
| Contenedores | Docker Compose |
| Notificaciones | Firebase Cloud Messaging (FCM) + WebSocket |
| Seguridad | JWT, bcrypt, Helmet, ThrottlerGuard, CORS, AES-GCM |

---

## Documentación Adicional

Los documentos técnicos del proyecto se encuentran en la carpeta `docs/`:

| Archivo | Descripción |
|---|---|
| `INFORME_MODELO_IA.docx` | Informe técnico del modelo de visión artificial YOLOv8. |
| `InvestigacionMicroservicio.pdf` | Investigación sobre la arquitectura de microservicios adoptada. |
| `SRS_Zarza_v2.docx` | Especificación de Requisitos de Software v2.0. |
| `DDS_Zarza_v2.docx` | Documento de Diseño de Software v2.0. |
| `Documentacion_Tecnica_v2.docx` | Referencia técnica completa (API, BD, variables de entorno, despliegue). |
| `Documentacion_Usuario_v2.docx` | Manual de usuario para todos los roles. |

---

## 👤 Autor

**Santiago Antonio Mora Nuñez**
Proyecto: Robótica, Control Inteligente y Sistemas de Percepción

---

## Mensajería: reintentos y cola de muertos (DLQ)

`fruit-ms` procesa `nueva_fruta` con ack manual y reintentos (3 intentos,
backoff exponencial, configurable con `NUEVA_FRUTA_MAX_ATTEMPTS` y
`NUEVA_FRUTA_BACKOFF_BASE_MS`). Si se agotan, el mensaje va al exchange
`fruit.dlx` y termina en la cola `ingestion_queue.dlq`, donde queda a la
espera de inspección manual.

### Despliegue inicial (una vez por entorno)

La cola existente se declaró sin argumentos DLX y RabbitMQ no permite
redeclararla distinta (`PRECONDITION_FAILED`). Con `fruit-backend` y
`fruit-ms` detenidos:

```bash
docker compose exec rabbitmq rabbitmqctl delete_queue ingestion_queue
```

Al arrancar de nuevo, `fruit-ms` recrea la cola con los argumentos DLX y
declara `fruit.dlx` + `ingestion_queue.dlq`. Los mensajes encolados en el
momento del borrado se pierden: hacerlo en ventana de baja actividad.

### Inspeccionar y recuperar mensajes muertos

- Management UI (`http://localhost:15672`, guest/guest) → Queues →
  `ingestion_queue.dlq` → *Get messages*. El payload identifica la imagen
  (`image_id`, `storage_key`) y el header `x-death` registra motivo, cola de
  origen y timestamp.
- Para reprocesar: una vez resuelta la causa raíz, re-publicar el payload en
  la cola `ingestion_queue` desde la UI (*Publish message*, propiedad
  `delivery_mode: 2`). El constraint único de `offline_sync_id` protege
  contra duplicados si el análisis llegó a persistirse.
