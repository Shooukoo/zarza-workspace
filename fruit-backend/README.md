# Sistema de Ingestión para Detección de Frutas

Un microservicio de ingestión de alto rendimiento diseñado para procesar streams de imágenes de alta resolución provenientes de cámaras industriales, validar la integridad de los datos en tiempo real y distribuir cargas de trabajo asíncronamente para su procesamiento por IA.

## Visión General de la Arquitectura

Este sistema implementa una Arquitectura de Microservicio Híbrida que combina ingestión HTTP con distribución mediante Colas de Mensajes.

**Flujo de Datos:**
1.  **Ingestión:** Las cámaras industriales envían streams de imágenes al backend NestJS vía HTTP/2 (Adaptador Fastify).
2.  **Carga en Streaming:** El backend transmite los datos directamente al Almacenamiento de Objetos (Cloudflare R2 / MinIO) utilizando streams `PassThrough`, minimizando el uso de RAM (complejidad de memoria O(1) relativa al tamaño del archivo).
3.  **Validación:** Se inspeccionan los "Magic Numbers" (firmas binarias) al vuelo para asegurar la integridad del archivo sin bufferizar la carga completa.
4.  **Distribución:** Tras un almacenamiento exitoso, los metadatos se publican en RabbitMQ (patrón "Fire-and-Forget") para su procesamiento asíncrono por el Worker de IA en Python.

## Características Principales

-   **Streaming de Alto Rendimiento:** Utiliza el adaptador multipart de alto rendimiento de Fastify para manejar streams concurrentes de alta resolución con una sobrecarga mínima.
-   **Seguridad Reforzada (Hardening):**
    -   **Helmet:** Implementa cabeceras HTTP seguras para mitigar vectores de ataque comunes (XSS, Clickjacking).
    -   **Rate Limiting:** Estrangulamiento global (1000 req/min) que previene ataques de Denegación de Servicio (DoS) desde dispositivos edge defectuosos o actores maliciosos.
    -   **Ejecución Rootless:** Los contenedores Docker se ejecutan como un usuario sin privilegios (`node`) para limitar estrictamente la superficie de ataque.
    -   **CORS Estricto:** Restricción de origen forzada a nivel de aplicación.
-   **Integridad de Datos:** Implementa validadores de stream personalizados para verificar firmas binarias antes de aceptar las cargas.
-   **Agnóstico a la Infraestructura:** Diseñado para ejecutarse sin problemas en Cloudflare R2 (Producción) o MinIO (Desarrollo Local) mediante SDKs compatibles con S3.

## Stack Tecnológico

-   **Framework Backend:** NestJS (Adaptador Fastify)
-   **Broker de Mensajería:** RabbitMQ 3 (Plugin de Gestión habilitado)
-   **Almacenamiento de Objetos:** Cloudflare R2 (API Compatible con S3) / MinIO
-   **Contenerización:** Docker y Docker Compose
-   **Lenguaje:** TypeScript (Node.js 22 LTS)

## Comenzando

### Prerrequisitos
-   Docker Engine 24.0+
-   Docker Compose v2.0+

### Instalación

1.  Clonar el repositorio:
    ```bash
    git clone https://github.com/organizacion/fruit-backend.git
    cd fruit-backend
    ```

2.  Configurar las variables de entorno:
    ```bash
    cp .env.example .env
    ```

3.  Iniciar los servicios:
    ```bash
    docker-compose up -d --build
    ```

## Configuración de Entorno

| Variable | Descripción | Ejemplo |
| :--- | :--- | :--- |
| `NODE_ENV` | Estado del entorno de la aplicación | `development` / `production` |
| `PORT` | Puerto de escucha de la aplicación | `3000` |
| `RABBITMQ_URL` | Cadena de Conexión AMQP | `amqp://guest:guest@rabbitmq:5672` |
| `RABBITMQ_QUEUE` | Cola objetivo para eventos de ingestión | `ingestion_queue` |
| `R2_ENDPOINT` | Endpoint de API compatible con S3 | `http://minio:9000` o `https://<cuenta>.r2.cloudflarestorage.com` |
| `R2_ACCESS_KEY_ID` | Clave de Acceso de Almacenamiento | `admin` |
| `R2_SECRET_ACCESS_KEY` | Clave Secreta de Almacenamiento | `password123` |
| `R2_BUCKET_NAME` | Nombre del Bucket Objetivo | `fruit-images` |
| `S3_FORCE_PATH_STYLE` | Forzar estilo de ruta para compatibilidad local con MinIO | `true` (Local), `false` (Prod) |
| `CORS_ORIGIN` | Origen CORS Permitido | `http://localhost:3000` |

## Referencia del API

### Subir Imagen (Upload Image)
Ingesta un archivo de imagen individual para procesamiento.

-   **URL:** `/ingestion/upload`
-   **Método:** `POST`
-   **Content-Type:** `multipart/form-data`

#### Cuerpo de la Petición (Request Body)
| Clave | Tipo | Descripción |
| :--- | :--- | :--- |
| `file` | `Binario` | El archivo de imagen (JPG/PNG) a ingestar. Máx 5MB. |

#### Respuesta Exitosa
**Código:** `201 Created`

```json
{
    "image_id": "camera_01_frame_992.jpg",
    "storage_key": "raw/1707523456789-camera_01_frame_992.jpg",
    "timestamp": "2024-02-10T05:25:00.000Z",
    "status": "UPLOADED"
}
```

#### Respuesta de Error
**Código:** `400 Bad Request`
-   Tipo de archivo inválido (no coincide con Magic Number).
-   El tamaño del archivo excede el límite.
-   Petición multipart malformada.

## Estructura del Proyecto

```
fruit-backend/
├── src/
│   ├── ingestion/       # Controlador de Ingestión, Servicio y Validadores
│   ├── storage/         # Servicio de Integración S3/R2
│   └── main.ts          # Punto de Entrada de la Aplicación y Configuración de Seguridad
├── docker/              # Archivos de configuración de Docker
├── docker-compose.yml   # Orquestación multi-contenedor
└── Dockerfile           # Definición de construcción multi-stage
```
