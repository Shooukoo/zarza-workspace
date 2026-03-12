# Zarza AI — Sistema de Análisis Fenológico de Zarzamora

**Zarza AI** es una plataforma de visión por computadora orientada a la agricultura de precisión. Permite capturar imágenes de plantas de zarzamora desde una aplicación móvil Flutter y obtener en tiempo real un **reporte fenológico automático**: detección por etapa de madurez, estimación de peso, predicción de días para cosecha y métricas de salud del cultivo.

---

## Arquitectura del sistema

El proyecto sigue una arquitectura de **microservicios desacoplados** orquestados con Docker Compose. La comunicación entre servicios es asíncrona vía **RabbitMQ**, y el almacenamiento de imágenes utiliza **Cloudflare R2** (compatible S3).

```
┌──────────────────────────────────────────────────────────────────┐
│                         Cliente móvil                            │
│                        zarza_ai (Flutter)                        │
└────────────────────────────┬─────────────────────────────────────┘
                             │  POST /api/ingestion/upload  (multipart)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│               fruit-backend  (NestJS + Fastify)                  │
│  • Recibe imagen → valida → sube a Cloudflare R2                 │
│  • Emite evento  "nueva_fruta"  → RabbitMQ                       │
│  • GET /api/fruits  →  consulta resultados vía RabbitMQ          │
│  • WebSocket para notificaciones en tiempo real                  │
└────────┬──────────────────────────────────────────┬──────────────┘
         │ RabbitMQ (amqp)                           │ RabbitMQ (amqp)
         ▼                                           │
┌──────────────────────────────────────────────────────────────────┐
│               fruit-ms  (NestJS Microservice)                    │
│  • Consume evento "nueva_fruta"                                  │
│  • Llama a fruit-inference  →  obtiene reporte fenológico        │
│  • Persiste resultado en MongoDB                                 │
│  • Expone patrones "get_fruits" / "get_fruit_by_id"              │
└────────┬─────────────────────────────────────────────────────────┘
         │ HTTP POST /analyze
         ▼
┌──────────────────────────────────────────────────────────────────┐
│             fruit-inference  (FastAPI + YOLOv8)                  │
│  • Descarga imagen de Cloudflare R2                              │
│  • Ejecuta inferencia YOLO sobre la imagen                       │
│  • Calcula etapa fenológica, peso estimado, días para cosecha    │
│  • Retorna reporte JSON detallado                                │
└──────────────────────────────────────────────────────────────────┘

         Infraestructura compartida
         ├── MongoDB 7      → persistencia de análisis
         └── RabbitMQ 3    → cola de mensajería asíncrona
```

---

## Estructura del repositorio

```
Proyecto Dalet/
├── docker-compose.yml        # Orquestación de todos los servicios
├── docs/                     # Documentos de investigación y modelo IA
│
├── fruit-backend/            # API Gateway principal (NestJS + Fastify)
├── fruit-inference/          # Servicio de inferencia IA (FastAPI + YOLOv8)
├── fruit-ms/                 # Microservicio consumidor (NestJS + MongoDB)
└── zarza_ai/                 # Aplicación móvil (Flutter / Dart)
```

---

## Módulos

### 1. `fruit-backend` — API Gateway

> **Stack:** NestJS 11 · Fastify 5 · TypeScript · RabbitMQ (amqplib) · Cloudflare R2 (AWS SDK v3)

API principal que recibe peticiones de la aplicación móvil. Gestiona la carga de imágenes, las reenvía a la cola de mensajes y expone los resultados de análisis almacenados en MongoDB.

| Módulo NestJS      | Responsabilidad |
|--------------------|-----------------|
| `IngestionModule`  | Recibe imágenes multipart, valida el magic number del archivo, sube a Cloudflare R2 y publica el evento `nueva_fruta` en RabbitMQ |
| `FruitsQueryModule`| Lee resultados de análisis desde `fruit-ms` vía RabbitMQ (GET paginado y por ID) |
| `NotificationsModule` | Canal WebSocket para notificaciones en tiempo real al cliente Flutter |

**Endpoints REST**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/ingestion/upload` | Sube una imagen (multipart/form-data). Devuelve `image_id`, `storage_key` y metadatos. |
| `GET`  | `/api/fruits?page=&limit=&image_id=` | Lista paginada de análisis fenológicos |
| `GET`  | `/api/fruits/:id` | Obtiene un análisis específico por su `_id` de MongoDB |

**Variables de entorno** (ver `fruit-backend/.env.example`)

```env
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_QUEUE=ingestion_queue
```

---

### 2. `fruit-inference` — Servicio de Inferencia IA

> **Stack:** Python 3 · FastAPI · Ultralytics YOLOv8 · Cloudflare R2 (boto3) · Pydantic

Microservicio Python que implementa el pipeline de análisis visual:

1. **Descarga** la imagen desde Cloudflare R2.
2. **Ejecuta inferencia** con el modelo YOLOv8 (`best.pt`) entrenado para detección de zarzamora por etapa de madurez.
3. **Construye el reporte fenológico** calculando por cada detección: etapa, peso estimado, días para la siguiente fase y días para cosecha.
4. Devuelve un JSON estructurado con métricas de salud y proyección financiera.

**Clases detectadas por el modelo**

| Clase | Etapa fenológica | Peso aprox. | Días para cosecha |
|-------|-----------------|-------------|-------------------|
| `boton` | Botón floral | 0.1 g | 45 días |
| `flor` | Floración | 0.2 g | 35 días |
| `verde` | Fruto verde | 1.8 g | 28 días |
| `naranja` | Pintón / naranja | 3.5 g | 8 días |
| `marron` | Café / casi maduro | 4.5 g | 3 días |
| `maduro` | Maduro / listo | 6.0 g | 0 días |
| `zarzamora` | Detección general | 3.0 g | 0 días |

**Variedades soportadas:** Regina · Aketzali · Amelali · Erandi

**Endpoints**

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET`  | `/health` | Estado del servicio y disponibilidad del modelo |
| `POST` | `/analyze` | Ejecuta la inferencia sobre una imagen cargada en R2 |

**Variables de entorno** (ver `fruit-inference/.env.example`)

```env
MODEL_PATH=model.pt
CONF_THRESHOLD=0.25
R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=fruit-images
```

---

### 3. `fruit-ms` — Microservicio Consumidor

> **Stack:** NestJS 11 · TypeScript · RabbitMQ (EventPattern/MessagePattern) · Mongoose · MongoDB 7

Microservicio NestJS que opera únicamente a través de RabbitMQ (no expone puertos HTTP). Aplica arquitectura limpia con separación en capas Domain / Infrastructure / Ports.

**Flujo de procesamiento:**

```
RabbitMQ  ──▶  FruitsController (@EventPattern 'nueva_fruta')
               └─▶  FruitsService.process()
                    ├─▶  POST /analyze  →  fruit-inference
                    ├─▶  InferenceMapper.toDomain()
                    └─▶  IAnalysisRepository.save()  →  MongoDB
```

**Patrones de mensajería**

| Patrón | Tipo | Descripción |
|--------|------|-------------|
| `nueva_fruta` | EventPattern | Dispara el análisis cuando llega una nueva imagen |
| `get_fruits` | MessagePattern | Retorna análisis paginados |
| `get_fruit_by_id` | MessagePattern | Retorna un análisis por `_id` |

---

### 4. `zarza_ai` — Aplicación Móvil

> **Stack:** Flutter 3 · Dart SDK ^3.11.1

Aplicación móvil multiplataforma (Android / iOS) que sirve como interfaz de usuario del sistema. En su arquitectura actual sigue los principios de **Clean Architecture** con separación en capas Domain, Data y Presentation.

**Funcionalidades previstas:**
- Captura de imágenes de la planta con la cámara del dispositivo
- Carga de imágenes al backend (`POST /api/ingestion/upload`)
- Visualización de resultados fenológicos (etapas, peso estimado, cronograma)
- Recepción de notificaciones en tiempo real vía WebSocket

---

## Despliegue con Docker Compose

### Pre-requisitos

- Docker Desktop 4.x o superior
- Credenciales de Cloudflare R2 (bucket ya creado)
- Modelo entrenado `best.pt` colocado en `fruit-inference/best.pt`
- Archivos `.env` configurados en cada servicio

### Pasos

1. **Clonar el repositorio y configurar variables de entorno:**
   ```bash
   cp fruit-backend/.env.example  fruit-backend/.env
   cp fruit-inference/.env.example fruit-inference/.env
   # Editar cada .env con las credenciales reales
   ```

2. **Levantar todos los servicios:**
   ```bash
   docker compose up --build
   ```

3. **Verificar que todo está corriendo:**
   ```bash
   docker compose ps
   ```

### Puertos expuestos

| Servicio | Host | Descripción |
|----------|------|-------------|
| `fruit-backend` | `0.0.0.0:3001` | API REST + WebSocket |
| `fruit-inference` | `127.0.0.1:8000` | Servicio de inferencia (interno) |
| `mongo` | `127.0.0.1:27018` | MongoDB (acceso local) |
| `rabbitmq` | `127.0.0.1:5672` | AMQP |
| `rabbitmq` | `127.0.0.1:15672` | Panel de administración RabbitMQ |

> `fruit-ms` no expone ningún puerto directamente; se comunica únicamente a través de RabbitMQ y la red interna `fruit-net`.

---

## Desarrollo local (sin Docker)

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

> Asegúrate de tener MongoDB y RabbitMQ corriendo localmente (o usa `docker compose up mongo rabbitmq`).

---

## Flujo completo de una análisis

```
1.  [Flutter]         Usuario captura imagen y pulsa "Analizar"
2.  [Flutter]         POST /api/ingestion/upload  (multipart/form-data)
3.  [fruit-backend]   Valida magic number del archivo
4.  [fruit-backend]   Sube imagen a Cloudflare R2
5.  [fruit-backend]   Emite evento  "nueva_fruta"  →  RabbitMQ
6.  [fruit-backend]   Responde 201 al cliente con  { image_id, storage_key, status: "UPLOADED" }
7.  [fruit-ms]        Consume evento "nueva_fruta"
8.  [fruit-ms]        POST /analyze  →  fruit-inference (timeout 60 s)
9.  [fruit-inference]  Descarga imagen de R2
10. [fruit-inference]  Ejecuta inferencia YOLOv8
11. [fruit-inference]  Calcula métricas fenológicas y proyección financiera
12. [fruit-inference]  Retorna reporte JSON
13. [fruit-ms]        Mapea reporte → entidad de dominio
14. [fruit-ms]        Persiste análisis en MongoDB
15. [Flutter]         GET /api/fruits/:id  o  escucha WebSocket para obtener el resultado
```

---

## Pruebas

### fruit-backend
```bash
cd fruit-backend
pnpm run test          # Unit tests (Jest)
pnpm run test:e2e      # End-to-end tests
pnpm run test:cov      # Cobertura
```

### fruit-ms
```bash
cd fruit-ms
pnpm run test
```

### zarza_ai
```bash
cd zarza_ai
flutter test
```

---

## Documentación adicional

Los documentos de investigación y diseño del modelo IA se encuentran en la carpeta [`docs/`](./docs/):

- **`INFORME_MODELO_IA.docx`** — Informe técnico del modelo de visión artificial
- **`InvestigacionMicroservicio.pdf`** — Investigación sobre la arquitectura de microservicios adoptada

---

## Stack tecnológico completo

| Área | Tecnología |
|------|-----------|
| API Gateway | NestJS 11, Fastify 5, TypeScript |
| Inferencia IA | FastAPI, Ultralytics YOLOv8, Python 3 |
| Microservicio | NestJS 11, Mongoose, TypeScript |
| App móvil | Flutter 3, Dart ^3.11.1 |
| Cola de mensajes | RabbitMQ 3 |
| Base de datos | MongoDB 7 |
| Almacenamiento | Cloudflare R2 (S3-compatible) |
| Contenedores | Docker Compose |
| Seguridad | Helmet, ThrottlerGuard (rate limiting), CORS |
