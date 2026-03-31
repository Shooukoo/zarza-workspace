# Zarza AI — Sistema de Monitoreo Inteligente de Zarzamora

> Plataforma de visión computacional para agricultura de precisión. Automatiza el conteo de frutos, estima el peso y el tonelaje por campo, predice la fecha de cosecha y genera métricas de salud del cultivo a partir de imágenes capturadas con un dispositivo móvil.

---

## Funcionalidades Principales

| Funcionalidad | Descripción |
|---|---|
| **Detección fenológica** | Clasifica frutos de zarzamora en 7 etapas mediante YOLOv8 |
| **Estimación de peso** | Calcula el peso estimado por fruto y proyecta el tonelaje por campo |
| **Predicción de cosecha** | Estima los días restantes para la cosecha según la etapa detectada |
| **Dashboard web** | Gráficas de producción, métricas de merma y mapas de calor por huerta |
| **Modo Offline-First** | La app móvil captura y guarda muestreos sin internet; sincroniza al recuperar la red |
| **Notificaciones push** | El Admin asigna tareas de muestreo a monitores vía FCM |
| **Control de acceso RBAC** | Jerarquía de roles: Admin · Productor · Agrónomo · Monitor |
| **Validación por experto** | El Agrónomo puede revisar y corregir diagnósticos de la IA (Human-in-the-Loop) |

---

## Arquitectura del Sistema

Zarza AI sigue una arquitectura de **microservicios desacoplados** orquestados con Docker Compose. La comunicación entre servicios es asíncrona vía RabbitMQ, y el almacenamiento de imágenes utiliza Cloudflare R2 (compatible S3).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CAPA DE PRESENTACIÓN                         │
│                                                                     │
│   ┌───────────────────────────┐   ┌─────────────────────────────┐   │
│   │   zarza_ai  (Flutter)     │   │   Dashboard Web (Browser)   │   │
│   │  • Captura + GPS          │   │  • Gráficas de producción   │   │
│   │  • Caché Offline (SQLite) │   │  • Mapas de calor           │   │
│   │  • Sync automático        │   │  • Gestión de usuarios      │   │
│   │  • Notificaciones FCM     │   │  • Solicitudes de muestreo  │   │
│   └─────────────┬─────────────┘   └──────────────┬──────────────┘   │
└─────────────────┼────────────────────────────────┼───────────────── ┘
                  │  HTTPS · REST JSON · WebSocket  │
┌─────────────────▼────────────────────────────────▼─────────────────┐
│                    CAPA DE LÓGICA DE NEGOCIO                        │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │          fruit-backend  (NestJS + Fastify · Puerto 3001)    │   │
│   │   • JWT Auth + RBAC Guards                                  │   │
│   │   • Upload imagen → Cloudflare R2                           │   │
│   │   • Publica evento "nueva_fruta" → RabbitMQ                 │   │
│   │   • WebSocket para notificaciones en tiempo real            │   │
│   │   • Envío de notificaciones push (FCM)                      │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
│                              │ AMQP (RabbitMQ)                      │
│   ┌──────────────────────────▼──────────────────────────────────┐   │
│   │          fruit-ms  (NestJS Microservice)                    │   │
│   │   • Consume evento "nueva_fruta"                            │   │
│   │   • Llama a fruit-inference → obtiene reporte fenológico    │   │
│   │   • Persiste resultado en MongoDB                           │   │
│   └──────────────────────────┬──────────────────────────────────┘   │
└─────────────────────────────┼───────────────────────────────────────┘
                              │ HTTP POST /analyze (red interna)
┌─────────────────────────────▼───────────────────────────────────────┐
│                 CAPA DE PERSISTENCIA Y PROCESAMIENTO                │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐     │
│  │   MongoDB 7     │  │  Cloudflare R2  │  │ fruit-inference  │     │
│  │  • users        │  │  (Imágenes)     │  │ FastAPI+YOLOv8   │     │
│  │  • campos       │  │  storage_key    │  │ Puerto 8000      │     │
│  │  • analyses     │  │                 │  │ (solo interno)   │     │
│  │  • solicitudes  │  │                 │  │                  │     │
│  └─────────────────┘  └─────────────────┘  └──────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘

Infraestructura compartida
├── MongoDB 7    → Persistencia de análisis, usuarios y campos
├── RabbitMQ 3   → Cola de mensajería asíncrona
└── FCM          → Notificaciones push a dispositivos móviles
```

---

## Estructura del Repositorio

```
Proyecto Zarza/
├── docker-compose.yml        # Orquestación de todos los servicios
├── docs/                     # Documentación técnica y de investigación
│   ├── INFORME_MODELO_IA.docx
│   └── InvestigacionMicroservicio.pdf
│
├── fruit-backend/            # API Gateway principal (NestJS + Fastify)
├── fruit-inference/          # Servicio de inferencia IA (FastAPI + YOLOv8)
├── fruit-ms/                 # Microservicio consumidor (NestJS + MongoDB)
└── zarza_ai/                 # Aplicación móvil (Flutter / Dart)
```

---

## Roles de Usuario (RBAC)

El sistema implementa Control de Acceso Basado en Roles. Cada rol tiene acceso estrictamente delimitado:

| Rol | Plataforma | Permisos |
|---|---|---|
| **Administrador** | Web + App | Control total (CRUD). Gestiona usuarios, crea solicitudes de muestreo y visualiza todos los datos del sistema. |
| **Productor** | Web (Solo Lectura) | Consulta gráficas de producción, proyecciones de cosecha y mapas de calor filtrados por sus campos asignados. |
| **Agrónomo** | Web (Solo Lectura) | Analiza métricas de salud y puede validar o corregir diagnósticos de la IA (Human-in-the-Loop). |
| **Monitor** | App Móvil | Captura imágenes en campo, opera en modo offline y recibe solicitudes de muestreo vía notificación push. |

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

**Stack:** NestJS 11 · Fastify 5 · TypeScript · RabbitMQ (`amqplib`) · Cloudflare R2 (AWS SDK v3) · JWT · FCM

API principal que recibe peticiones de la app móvil y el dashboard web. Gestiona autenticación, carga de imágenes, cola de eventos y comunicación en tiempo real.

| Módulo NestJS | Responsabilidad |
|---|---|
| `AuthModule` | Registro y login de usuarios. Genera tokens JWT. Protege endpoints con `JwtAuthGuard` + `RolesGuard`. |
| `IngestionModule` | Recibe imágenes multipart, valida el magic number, sube a Cloudflare R2 y publica el evento `nueva_fruta` en RabbitMQ. |
| `FruitsQueryModule` | Lee resultados de análisis desde `fruit-ms` vía RabbitMQ (GET paginado y por ID). |
| `AdminModule` | Gestión de usuarios y solicitudes de muestreo. Dispara notificaciones FCM al Monitor asignado. |
| `NotificationsModule` | Canal WebSocket para notificaciones en tiempo real al cliente Flutter. |

#### Endpoints REST

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/register` | `ADMIN` | Crea un nuevo usuario. Rol por defecto: `MONITOR`. |
| `POST` | `/api/auth/login` | Público | Retorna `{ access_token: "JWT" }`. |
| `POST` | `/api/ingestion/upload` | Autenticado | Sube imagen (multipart/form-data). Retorna `image_id`, `storage_key` y `status`. |
| `GET` | `/api/fruits` | Autenticado | Lista paginada de análisis. Params: `page`, `limit`, `campo_id`, `start_date`, `end_date`. |
| `GET` | `/api/fruits/:id` | Autenticado | Análisis completo por `_id` de MongoDB. |
| `POST` | `/api/admin/requests` | `ADMIN` | Crea solicitud de muestreo y envía notificación FCM al Monitor. |
| `GET` | `/api/admin/users` | `ADMIN` | Lista todos los usuarios del sistema. |

#### Variables de entorno

```env
# Servidor
PORT=3001

# Base de datos
MONGO_URI=mongodb://localhost:27018/zarza

# Seguridad
JWT_SECRET=tu_clave_secreta_minimo_32_caracteres
JWT_EXPIRES_IN=24h

# Cloudflare R2
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=ingestion_queue

# Notificaciones
FCM_SERVER_KEY=
```

---

### 2. `fruit-inference` — Servicio de Inferencia IA

**Stack:** Python 3 · FastAPI · Ultralytics YOLOv8 · Cloudflare R2 (`boto3`) · Pydantic

Microservicio Python que implementa el pipeline de análisis visual. Opera únicamente en la red interna Docker y nunca está expuesto a internet.

**Pipeline de procesamiento:**

```
1. Recibe { storage_key, image_id } desde fruit-ms
2. Descarga la imagen desde Cloudflare R2 (boto3)
3. Ejecuta inferencia YOLOv8 sobre la imagen (best.pt)
4. Clasifica cada fruto detectado en su etapa fenológica
5. Calcula: peso estimado, días para cosecha, % de merma
6. Retorna reporte JSON estructurado con métricas de salud
```

#### Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del servicio y disponibilidad del modelo. |
| `POST` | `/analyze` | Ejecuta la inferencia sobre una imagen cargada en R2. |

#### Variables de entorno

```env
MODEL_PATH=best.pt
CONF_THRESHOLD=0.25

# Cloudflare R2 (lectura)
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images
```

> **Importante:** Coloca el archivo de pesos entrenados en `fruit-inference/best.pt` antes de levantar los servicios.

---

### 3. `fruit-ms` — Microservicio Consumidor

**Stack:** NestJS 11 · TypeScript · RabbitMQ (`EventPattern` / `MessagePattern`) · Mongoose · MongoDB 7

Microservicio NestJS que opera **únicamente a través de RabbitMQ** (no expone puertos HTTP). Aplica arquitectura limpia con separación en capas `Domain / Infrastructure / Ports`.

**Flujo de procesamiento:**

```
RabbitMQ  ──▶  FruitsController (@EventPattern 'nueva_fruta')
               └─▶  FruitsService.process()
                    ├─▶  POST /analyze  →  fruit-inference
                    ├─▶  InferenceMapper.toDomain()
                    └─▶  IAnalysisRepository.save()  →  MongoDB
```

#### Patrones de mensajería

| Patrón | Tipo | Descripción |
|---|---|---|
| `nueva_fruta` | `EventPattern` | Dispara el análisis cuando llega una nueva imagen. |
| `get_fruits` | `MessagePattern` | Retorna análisis paginados con filtros opcionales. |
| `get_fruit_by_id` | `MessagePattern` | Retorna un análisis completo por `_id`. |

---

### 4. `zarza_ai` — Aplicación Móvil

**Stack:** Flutter 3 · Dart SDK `^3.11.1`

Aplicación móvil multiplataforma (Android / iOS) con arquitectura **Clean Architecture** (capas `Domain`, `Data`, `Presentation`) y soporte **Offline-First**.

#### Funcionalidades

- **Captura de imágenes** con la cámara del dispositivo o selección desde galería.
- **Modo Offline:** guarda muestreos localmente (SQLite) cuando no hay red; muestra indicador de "Guardado localmente".
- **Sincronización automática:** detecta el retorno de la red y envía los muestreos pendientes. Usa un `offline_sync_id` (UUID) para garantizar idempotencia y evitar duplicados.
- **Visualización de resultados:** etapas fenológicas detectadas, peso estimado, cronograma de cosecha y métricas de salud.
- **Notificaciones push (FCM):** recibe solicitudes de muestreo asignadas por el Administrador.
- **Historial paginado:** consulta de análisis anteriores con navegación cronológica.

#### Pantallas principales

| Ruta | Nombre | Descripción |
|---|---|---|
| `/home` | Inicio | Lista de análisis recientes y acceso rápido al escaneo. |
| `/capture` | Captura | Selector de origen (Cámara / Galería) y envío al servidor. |
| `/results` | Resultados | Reporte fenológico completo del análisis actual. |
| `/history` | Historial | Lista paginada de todos los muestreos anteriores. |
| `/admin` | Admin Web | Dashboard global (solo ADMIN). |
| `/admin/requests` | Solicitudes | Creación y gestión de solicitudes de muestreo. |
| `/dashboard` | Dashboard | Gráficas de producción (Productor / Agrónomo). |

---

## Modelo de Datos (MongoDB)

### Colección `users`

| Campo | Tipo | Descripción |
|---|---|---|
| `email` | String | Identificador de acceso. Único, indexado. |
| `passwordHash` | String | Hash bcrypt de la contraseña. Nunca expuesto en la API. |
| `role` | Enum | `ADMIN` · `PRODUCTOR` · `AGRONOMO` · `MONITOR`. Defecto: `MONITOR`. |
| `campos_asignados` | [ObjectId] | Referencias a `campos`. Controla el acceso a datos por huerta. |
| `fcm_token` | String | Token para notificaciones push. Defecto: `null`. |

### Colección `campos`

| Campo | Tipo | Descripción |
|---|---|---|
| `codigo_campo` | String | Código alfanumérico único de la huerta. |
| `nombre` | String | Nombre descriptivo de la parcela. |
| `productor_id` | ObjectId | Referencia al dueño en `users`. |
| `poligono_gps` | [Number] | Coordenadas del perímetro geográfico de la parcela. |

### Colección `analyses`

| Campo | Tipo | Descripción |
|---|---|---|
| `image_id` | String | ID único de la captura. Indexado. |
| `storage_key` | String | Ruta de la imagen cruda en Cloudflare R2. |
| `requester` | Object | Snapshot inmutable `{ userId, email }` del solicitante. |
| `fecha_analisis` | Date | Timestamp ISO 8601 de la inferencia. |
| `campo_id` | ObjectId | Referencia a `campos`. Indexado. |
| `productor_id` | ObjectId | Referencia a `users`. Indexado. |
| `ubicacion_gps` | GeoJSON Point | Coordenadas exactas. Índice `2dsphere`. |
| `offline_sync_id` | String | UUID del dispositivo. Único Sparse (evita duplicados). |
| `metricas_salud` | Object | `{ total_detectado, sanos, enfermos, porcentaje_merma }` |
| `cronograma_fenologico` | [Object] | Etapas detectadas y predicción de fecha de cosecha. |
| `validacion_experto` | Object | `{ fue_corregido, corregido_por, fecha_correccion }` (opcional). |

### Colección `solicitudes_muestreo`

| Campo | Tipo | Descripción |
|---|---|---|
| `creado_por` | ObjectId | Admin que crea la tarea. |
| `asignado_a` | ObjectId | Monitor o Agrónomo asignado. |
| `campo_id` | ObjectId | Lugar donde se realiza el muestreo. |
| `estado` | Enum | `PENDIENTE` · `EN_PROGRESO` · `COMPLETADO` · `CANCELADO`. |
| `mensaje` | String | Instrucciones de la tarea. |
| `fecha_creacion` | Date | Timestamp de creación. |

---

## Flujo Completo de un Análisis

```
 1. [Flutter]          Usuario captura imagen y pulsa "Analizar"
 2. [Flutter]          POST /api/ingestion/upload  (multipart/form-data + metadatos GPS)
 3. [fruit-backend]    Valida magic number del archivo
 4. [fruit-backend]    Sube imagen a Cloudflare R2  →  obtiene storage_key
 5. [fruit-backend]    Emite evento "nueva_fruta"  →  RabbitMQ
 6. [fruit-backend]    Responde 201 al cliente  { image_id, storage_key, status: "UPLOADED" }
 7. [fruit-ms]         Consume evento "nueva_fruta"
 8. [fruit-ms]         POST /analyze  →  fruit-inference  (timeout: 60 s)
 9. [fruit-inference]  Descarga imagen de Cloudflare R2  (boto3)
10. [fruit-inference]  Ejecuta inferencia YOLOv8  →  clasifica frutos por etapa
11. [fruit-inference]  Calcula métricas: peso, merma, días para cosecha, tonelaje
12. [fruit-inference]  Retorna reporte JSON estructurado
13. [fruit-ms]         Mapea reporte  →  entidad de dominio
14. [fruit-ms]         Persiste análisis en MongoDB
15. [Flutter]          GET /api/fruits/:id  ó  escucha WebSocket  →  muestra resultados
```

### Flujo Offline

```
 1. [Flutter]   Captura imagen sin internet
 2. [Flutter]   Genera UUID (offline_sync_id) y guarda en SQLite local
 3. [Flutter]   Muestra ícono "Guardado localmente"
    ...
 4. [Flutter]   Detecta retorno de la red
 5. [Flutter]   Muestra indicador "Sincronizando..."
 6. [Flutter]   POST /api/ingestion/upload  (incluye offline_sync_id)
 7. [fruit-backend]  Valida UUID → índice Sparse evita duplicados
 8. [Flutter]   Vacía la caché local al recibir 201
```

---

## Despliegue con Docker Compose

### Pre-requisitos

- Docker Desktop 4.x o superior
- Credenciales de Cloudflare R2 (bucket ya creado)
- Modelo entrenado `best.pt` colocado en `fruit-inference/best.pt`
- Archivos `.env` configurados en cada servicio

### Pasos

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd "Proyecto Dalet"

# 2. Configurar variables de entorno
cp fruit-backend/.env.example  fruit-backend/.env
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
| `fruit-backend` | `0.0.0.0:3001` | API REST + WebSocket |
| `fruit-inference` | `127.0.0.1:8000` | Servicio de inferencia (solo interno) |
| `mongo` | `127.0.0.1:27018` | MongoDB (acceso local) |
| `rabbitmq` | `127.0.0.1:5672` | AMQP |
| `rabbitmq` | `127.0.0.1:15672` | Panel de administración RabbitMQ |

> `fruit-ms` **no expone ningún puerto** directamente. Se comunica únicamente a través de RabbitMQ y la red interna `fruit-net`.

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

Asegúrate de tener MongoDB y RabbitMQ corriendo localmente, o usa:

```bash
docker compose up mongo rabbitmq
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

### `zarza_ai`

```bash
cd zarza_ai
flutter pub get
flutter run
```

---

## 🧪 Pruebas

### `fruit-backend`

```bash
cd fruit-backend
pnpm run test        # Unit tests (Jest)
pnpm run test:e2e    # End-to-end tests
pnpm run test:cov    # Cobertura de código
```

### `fruit-ms`

```bash
cd fruit-ms
pnpm run test
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
| **Autenticación** | JWT stateless con tiempo de expiración configurable (`JWT_EXPIRES_IN`). |
| **Autorización** | `JwtAuthGuard` + `RolesGuard` en cada endpoint. Devuelve HTTP 403 si el rol es insuficiente. |
| **Contraseñas** | Hash bcrypt (factor de costo mínimo: 12). Nunca se expone el hash en respuestas de la API. |
| **Rate limiting** | `ThrottlerGuard` para proteger contra ataques de fuerza bruta. |
| **Cabeceras HTTP** | `Helmet` para protección de cabeceras HTTP estándar. |
| **CORS** | Configurado para restringir el acceso a orígenes permitidos. |
| **Aislamiento del Worker IA** | `fruit-inference` solo es accesible desde la red interna Docker (`fruit-net`). |
| **Almacenamiento** | Las imágenes en Cloudflare R2 deben servirse con URLs firmadas con tiempo de expiración. |

---

## Stack Tecnológico Completo

| Área | Tecnología |
|---|---|
| API Gateway | NestJS 11, Fastify 5, TypeScript |
| Inferencia IA | FastAPI, Ultralytics YOLOv8, Python 3 |
| Microservicio | NestJS 11, Mongoose, TypeScript |
| App móvil | Flutter 3, Dart `^3.11.1` |
| Cola de mensajes | RabbitMQ 3 |
| Base de datos | MongoDB 7 |
| Almacenamiento | Cloudflare R2 (S3-compatible) |
| Contenedores | Docker Compose |
| Notificaciones | Firebase Cloud Messaging (FCM) |
| Seguridad | JWT, bcrypt, Helmet, ThrottlerGuard, CORS |
| Geolocalización | GeoJSON + índice MongoDB 2dsphere |

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
