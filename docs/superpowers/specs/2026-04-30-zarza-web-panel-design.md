# Zarza AI — Panel Web: Diseño

**Fecha:** 2026-04-30
**Estado:** Aprobado

## Resumen

Panel web administrativo para Zarza AI construido como SPA React + Vite. Cubre todos los roles del sistema (ADMIN, PRODUCTOR, AGRONOMO, MONITOR) con acceso diferenciado por ruta. Este sprint entrega la estructura base completa más tres módulos: Dashboard, Campos/Huertas y Solicitudes de Muestreo.

---

## Stack

| Decisión | Elección | Motivo |
|----------|----------|--------|
| Framework | React + Vite | SPA moderna, DX excelente, proxy nativo para dev |
| Componentes UI | Ant Design (antd) | Tablas, formularios y modales rich out-of-the-box |
| Routing | React Router v6 | Rutas protegidas por rol con `PrivateRoute` |
| Fetching/Cache | TanStack Query (React Query) | Cache automático, loading/error states, re-fetch |
| HTTP | Axios con `withCredentials: true` | Envío automático de cookies httpOnly |
| Gráficos | Recharts | Ligera, compatible con Ant Design |
| Auth | httpOnly cookie (JWT) | Más seguro contra XSS que localStorage |
| Ubicación | `zarza-web/` en el monorepo | Consistente con estructura de contenedores existente |

---

## Arquitectura

```
zarza-web/
├── src/
│   ├── api/              ← clientes Axios + interceptores globales
│   ├── auth/             ← AuthContext, useAuth hook, PrivateRoute HOC
│   ├── campos/           ← módulo Campos/Huertas
│   ├── solicitudes/      ← módulo Solicitudes de Muestreo
│   ├── dashboard/        ← módulo Dashboard
│   ├── shared/           ← AppShell, Sidebar, EstadoBadge, páginas 403/404
│   └── main.tsx
├── Dockerfile            ← stage dev (vite) + stage prod (nginx)
└── vite.config.ts        ← proxy /api → fruit-backend:3001
```

---

## Pantallas y Componentes

### Shell

- **`LoginPage`** — formulario email/password → `POST /api/auth/login` → cookie httpOnly
- **`AppShell`** — `Layout` + `Menu` sidebar colapsable de Ant Design, header con nombre de usuario y logout
- **`PrivateRoute`** — HOC que verifica sesión en `AuthContext`; acepta prop `allowedRoles: Role[]`; redirige a `/login` si no autenticado o a `/403` si rol no permitido

### Dashboard (`/dashboard`) — ADMIN, PRODUCTOR

- **`DashboardPage`** con tres secciones:
  - **Yield Forecast** — gráfico de barras (Recharts) con proyección de peso sano por campo (`GET /api/admin/dashboard/yield`)
  - **Health Metrics** — cards con % merma, total sanos vs enfermos (`GET /api/admin/dashboard/health`)
  - **Phenology** — gráfico donut con distribución de etapas fenológicas (`GET /api/admin/dashboard/phenology`)
- ADMIN ve datos globales; PRODUCTOR ve solo sus campos (backend filtra por `productor_id` del JWT)

### Campos/Huertas (`/campos`) — ADMIN, PRODUCTOR, AGRONOMO

- **`CamposPage`** — tabla paginada con columnas: Código, Nombre, Productor, Fecha de alta, Acciones
  - Botón "Nuevo Campo" visible solo para ADMIN y PRODUCTOR
- **`CreateCampoModal`** — formulario con campos: `codigo_campo`, `nombre`, `productor_id`
  - ADMIN: selector de productor desplegable
  - PRODUCTOR: `productor_id` se toma del contexto, no se muestra selector
- **`DeleteCampoButton`** — visible solo para ADMIN, con `Popconfirm` de Ant Design antes de eliminar

### Solicitudes de Muestreo (`/solicitudes`) — ADMIN, AGRONOMO, MONITOR

- **`SolicitudesPage`** — tabla paginada con filtros por `estado` y `campo_id`
  - Columnas: Campo, Asignado a, Mensaje, Fecha límite, Estado, Acciones
  - Botón "Nueva Solicitud" visible solo para ADMIN
- **`CreateSolicitudModal`** — formulario con:
  - Selector de campo (`GET /api/campos`)
  - Selector de monitor (`GET /api/admin/users?rol=MONITOR`)
  - Campo de texto `mensaje`
  - Date picker `fecha_limite` (opcional)
- **`EstadoBadge`** — Ant Design `Tag` con color semántico por estado:
  - PENDIENTE → naranja, EN_PROGRESO → azul, COMPLETADO → verde, CANCELADO → rojo
- **`UpdateEstadoDropdown`** — dropdown para que MONITOR/AGRONOMO cambie el estado de solicitudes asignadas a ellos (`PATCH /api/solicitudes/:id/estado`)

### Páginas de error

- **`Forbidden403Page`** — "No tienes permiso para ver esta página" + botón Volver
- **`NotFound404Page`** — ruta inexistente

---

## Visibilidad de Rutas por Rol

| Ruta | ADMIN | PRODUCTOR | AGRONOMO | MONITOR |
|------|:-----:|:---------:|:--------:|:-------:|
| `/dashboard` | ✓ | ✓ | — | — |
| `/campos` | ✓ | ✓ | ✓ | — |
| `/solicitudes` | ✓ | — | ✓ | ✓ |

---

## Flujo de Autenticación

1. `LoginPage` hace `POST /api/auth/login` con `withCredentials: true`
2. `fruit-backend` responde con `Set-Cookie: access_token=...; HttpOnly; SameSite=Lax` (cambio nuevo)
3. Al montar la app, `AuthContext` hace `GET /api/auth/me` para hidratar la sesión desde la cookie
4. Interceptor Axios captura `401` → limpia contexto → redirige a `/login`
5. Logout: `POST /api/auth/logout` → backend borra la cookie con `Max-Age=0`

---

## Flujo de Datos

- Un hook por módulo: `useCampos()`, `useSolicitudes()`, `useDashboard()` — todos via React Query
- `withCredentials: true` en Axios para envío automático de cookie
- Errores de API → `notification.error()` de Ant Design con mensaje legible
- Errores de validación de formulario → inline en campos (Ant Design Form `rules`)

---

## Cambios Requeridos en `fruit-backend`

| # | Endpoint | Cambio |
|---|----------|--------|
| 1 | `POST /api/auth/login` | Añadir `Set-Cookie` httpOnly en respuesta (no rompe clientes existentes) |
| 2 | `GET /api/auth/me` | Nuevo endpoint — devuelve usuario autenticado desde JWT de cookie |
| 3 | `POST /api/auth/logout` | Nuevo endpoint — borra cookie con `Max-Age=0` |
| 4 | `GET /api/admin/dashboard/*` | Filtrar por `productor_id` del JWT cuando `rol === PRODUCTOR` |
| 5 | `GET /api/admin/users` | Añadir query param `rol` (ej. `?rol=MONITOR`) para filtrar usuarios por rol |

---

## Docker

### `zarza-web/Dockerfile`

```dockerfile
# Stage dev
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Stage prod
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
```

### `docker-compose.yml` — nuevo servicio

```yaml
zarza-web:
  build:
    context: ./zarza-web
    target: dev
  ports:
    - "5173:5173"
  volumes:
    - ./zarza-web:/app
    - /app/node_modules
  depends_on:
    - fruit-backend
  networks:
    - backend-network
```

### `zarza-web/vite.config.ts` — proxy

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://fruit-backend:3001',
      changeOrigin: true
    }
  }
}
```

---

## Variables de Entorno

- `VITE_APP_TITLE=Zarza AI Panel` — título de la app en el `<title>` del HTML
- No se exponen credenciales ni URLs sensibles al frontend; toda comunicación va por proxy

---

## Fuera de Alcance (este sprint)

- Módulo de usuarios / gestión de roles (futuro)
- Módulo de historial de análisis / resultados IA (futuro)
- Módulo de notificaciones WebSocket en web (futuro)
- Internacionalización (i18n) (futuro)
- Tests unitarios y E2E del panel web (futuro)
