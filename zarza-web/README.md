# zarza-web

Dashboard web de Zarza AI. React 18 + Vite + TypeScript, con Ant Design como sistema de componentes y TanStack Query para el estado de servidor. Consume la API de `fruit-backend` y se conecta a su WebSocket para notificaciones en tiempo real.

Ver también el [README raíz](../README.md) para la arquitectura completa del sistema.

## Stack

React 18.3 · Vite 6 · TypeScript 5.7 · Ant Design (`antd` + `@ant-design/icons`) · `@tanstack/react-query` · `react-router-dom` · `axios` · `recharts` · `dayjs`.

## Estructura del código

```
src/
├── admin/          # Gestión de usuarios (UsersPage, CreateUserModal, UserDrawer) — solo ADMIN
├── analisis/        # Listado y detalle de análisis (AnalisisPage, AnalisisDetailModal)
├── api/             # Cliente axios único (client.ts)
├── auth/             # AuthContext, LoginPage, PrivateRoute, Role enum, defaultRoute (landing por rol)
├── campos/           # CRUD de campos y asignación de agrónomos/monitores
├── dashboard/         # DashboardPage + gráficas de producción (recharts)
├── solicitudes/       # Solicitudes de muestreo (listado, detalle, creación, cambio de estado)
├── shared/            # AppShell (layout + WebSocket), páginas 403/404, useWebSocket
├── App.tsx            # Definición de rutas y guards por rol
└── main.tsx           # Bootstrap: BrowserRouter, QueryClientProvider, ConfigProvider (tema + es_ES)
```

## Comunicación con el backend

`src/api/client.ts` expone una única instancia de axios con `baseURL: '/api/v1'` y `withCredentials: true` — la autenticación es por cookie (JWT), no hay token en `localStorage`. Un interceptor de respuesta redirige a `/login` ante cualquier `401` (salvo si ya se está en `/login`).

Actualizaciones en tiempo real vía `WebSocket` nativo a `/ws` (`shared/useWebSocket.ts`), consumido desde `shared/AppShell.tsx`.

En desarrollo, Vite hace de proxy: `/api` y `/ws` se redirigen al backend configurado en `VITE_API_TARGET` (default `http://localhost:3001`; en Docker Compose apunta a `http://fruit-backend:3000`). El código de la app siempre llama a rutas relativas — no hay URL base "horneada" en el build.

## Rutas y RBAC (`App.tsx`)

| Ruta | Roles permitidos |
|---|---|
| `/login`, `/403` | Público |
| `/` | Redirige según rol: `AGRONOMO` → `/analisis`, `MONITOR` → `/solicitudes`, resto → `/dashboard` |
| `/dashboard` | `ADMIN`, `PRODUCTOR` |
| `/usuarios` | `ADMIN` |
| `/campos` | `ADMIN`, `PRODUCTOR`, `AGRONOMO` |
| `/solicitudes` | `ADMIN`, `AGRONOMO`, `MONITOR` |
| `/analisis` | `ADMIN`, `AGRONOMO`, `PRODUCTOR` |

Rutas no reconocidas → página 404; rol sin permiso sobre una ruta protegida → `/403`.

## Comandos

```bash
npm install
npm run dev         # Servidor de desarrollo Vite (puerto 5173)
npm run build       # tsc -b && vite build
npm run preview     # Sirve el build de producción localmente
```

## Variables de entorno

No hay `.env`/`.env.example` en este servicio. La única configuración por entorno es `VITE_API_TARGET` (usada solo por `vite.config.ts` como destino del proxy de desarrollo; default `http://localhost:3001`).

## Docker

`Dockerfile` multi-stage con tres targets:

- `dev` — `node:20-alpine`, instala dependencias y corre `npm run dev` (usado por `docker-compose.yml`, puerto `5173`, con el código montado como volumen para hot-reload).
- `build` — compila con `npm run build`.
- `prod` — copia `dist/` a un `nginx:alpine` y sirve estático en el puerto 80.

> El `docker-compose.yml` raíz actualmente construye el target `dev` (Vite en modo desarrollo, no el build estático de `nginx`). El target `prod` existe en el Dockerfile pero no está referenciado en ningún compose todavía — tenerlo en cuenta antes de un despliegue productivo.
