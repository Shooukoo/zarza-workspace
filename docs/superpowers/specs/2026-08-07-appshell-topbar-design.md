# AppShell: sidebar → top bar + saludo de bienvenida — Diseño

**Fecha:** 2026-08-07
**Servicios:** `zarza-web`, `fruit-backend`
**Estado:** Aprobado

## Problema

`AppShell.tsx` usa una sidebar fija oscura para navegar entre secciones,
inconsistente con la dirección clara/moderna que ya tomaron `LoginPage.tsx`
y `DashboardPage.tsx`. El usuario pidió reemplazarla por una top bar, con
las tabs agrupadas por intención de uso y visibles/ocultas según rol, y de
paso construir un saludo de bienvenida real en el Dashboard.

## Decisiones tomadas

- **Alcance de este proyecto:** rediseño de `AppShell.tsx` (top bar) +
  saludo de bienvenida en `DashboardPage.tsx` + el cambio de backend mínimo
  necesario para el saludo (nombre real del usuario). **No** incluye migrar
  Usuarios/Campos/Solicitudes/Revisión IA al tema claro — eso es un
  proyecto separado, a especificar después.
- **Fondo compartido de `AppShell`:** pasa de oscuro (`obsidian`) a claro
  (`lightTheme.canvas`, `#EEF0F5`) — es el contenedor de **todas** las
  páginas. Usuarios/Campos/Solicitudes/Revisión IA mantienen sus propias
  tarjetas/tablas oscuras (self-contained vía los tokens del
  `ConfigProvider` oscuro global de `main.tsx`), así que temporalmente se
  verán como tarjetas oscuras flotando sobre un lienzo claro. Es una
  inconsistencia visual aceptada hasta el proyecto de migración de esas
  páginas — no es una regresión a corregir aquí.
- **Sin logo/marca en el panel:** se elimina el logo de `AppShell` (y con
  él, el botón de colapsar la sidebar que dependía de él). RubusAI solo
  sigue apareciendo en `LoginPage.tsx` y como favicon del navegador.
- **Sin modo colapsado:** la sidebar se podía contraer a solo íconos; la
  top bar no tiene equivalente — se elimina esa función por completo.
- **Grupos de navegación por intención** (confirmado con el usuario tras
  revisar qué hace realmente la app móvil `zarza_ai`, que no replica
  captura ni funciones exclusivas de campo en el web):
  - **Visión general:** Dashboard
  - **Campo:** Campos/Huertas, Solicitudes, Revisión IA
  - **Administración:** Usuarios
  - Los grupos se separan con una línea vertical delgada, **sin** etiqueta
    de texto por grupo (el usuario probó la versión con etiquetas y
    prefirió la más limpia, sin ellas).
  - Visibilidad por rol: **sin cambios** respecto a `NAV_ITEMS` actual
    (ver tabla en Diseño §2).
- **Tabs solo texto**, sin íconos (se descartan los íconos de Ant Design
  que tenía la sidebar).
- **Usuario en la barra:** solo avatar circular con iniciales (sin
  nombre/rol visible inline). Clic abre un menú desplegable con: encabezado
  no interactivo (email + rol), luego **"Cerrar sesión"** — sin opción de
  "Configuración" (no existe página de perfil todavía; queda fuera de
  alcance para un proyecto futuro).
- **Sin fondo propio en la top bar** (transparente, se funde con el
  `canvas` de la página) mientras el contenido está arriba del todo. Al
  hacer scroll dentro del área de contenido (`main`, que es el contenedor
  con `overflow: auto` — la barra en sí no se desplaza porque vive fuera
  de esa región, así que no hace falta `position: sticky`), la barra gana
  fondo blanco sólido + sombra sutil para no encimarse visualmente con el
  contenido que pasa debajo.
- **Saludo de bienvenida:** el `<h1>Dashboard</h1>` actual se reemplaza por
  `Hola, {nombre} 👋`, usando el `firstName` real del usuario si existe, o
  el prefijo del email (antes de `@`) como fallback. El subtítulo de
  estado ("Vista general de la salud del cultivo · ● En línea") se
  mantiene igual.
- **Cambio de backend necesario:** el modelo `User` en Prisma ya tiene
  `firstName`/`lastName`, y `AuthService.login()` **ya** los devuelve
  dentro de `user` (vía `_toProfile`) — el frontend simplemente los estaba
  descartando en `AuthContext.tsx`. El problema real está en
  `GET /auth/me` (usado para hidratar la sesión al recargar la página):
  hoy devuelve `req.user`, que es el payload crudo del JWT
  (`{ sub, email, role }`, sin nombre). Se agrega `AuthService.getProfile
  (userId)` (reutiliza `findUserById` + `_toProfile`, mismo patrón que
  `refresh()`) y el controller llama a ese método en vez de devolver
  `req.user` directamente.

## Diseño

### 1. Backend — `fruit-backend/src/auth`

**`application/auth.service.ts`** — nuevo método público:

```ts
async getProfile(userId: string): Promise<UserProfile> {
  const user = await this.userRepository.findUserById(userId);
  if (!user) throw new UnauthorizedException('Usuario no encontrado');
  return this._toProfile(user);
}
```

**`infrastructure/http/auth.controller.ts`** — `me()` pasa a async y usa el
nuevo método:

```ts
@Get('me')
@UseGuards(JwtAuthGuard)
async me(@Req() req: any) {
  return this.authService.getProfile(req.user.sub);
}
```

`/auth/login` no cambia — ya devuelve `firstName`/`lastName` en `user`.

### 2. `zarza-web/src/auth/types.ts` — `AuthUser`

```ts
export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
}
```

`AuthContext.tsx`:
- `login()`: el tipo del `res.data.user` gana `firstName`/`lastName`, y se
  incluyen al construir `authUser` (ya no se descartan).
- El hidrata-sesión (`GET /auth/me`) no cambia de forma — ya tipaba la
  respuesta como `AuthUser`, ahora esa respuesta trae los campos nuevos
  gracias al cambio de backend.

Helper nuevo (co-ubicado en `types.ts` o `defaultRoute.ts`, el que ya
existe con lógica auxiliar de auth):

```ts
export function displayName(user: AuthUser): string {
  const first = user.firstName?.trim();
  if (first) return first;
  return user.email.split('@')[0];
}
```

### 3. `zarza-web/src/shared/AppShell.tsx` — reescritura completa

Estructura general (reemplaza el layout `sidebar + main` por `top bar +
main`, ambos hijos directos de un contenedor `flex-direction: column`,
`height: 100vh`):

```
<div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden', background: T.canvas }}>
  <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm, token: { colorPrimary: T.rubus, colorBgElevated: T.surface, colorText: T.ink, borderRadius: 12, fontFamily: "'Lexend', sans-serif" } }}>
    <TopBar user={user} visibleItems={visibleItems} scrolled={scrolled} onLogout={handleLogout} location={location} />
  </ConfigProvider>
  <main ref={mainRef} onScroll={...} style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
    <Outlet/>
  </main>
</div>
```

- El `<ConfigProvider>` local envuelve **solo** la top bar, no `<main>` —
  así `Dropdown`/`Avatar` (antd) dentro de la barra usan tokens claros,
  mientras `<Outlet/>` sigue bajo el `ConfigProvider` oscuro global de
  `main.tsx` (necesario porque Usuarios/Campos/Solicitudes/Revisión IA
  siguen siendo páginas oscuras en este proyecto). Mismo patrón ya usado
  en `LoginPage.tsx`/`DashboardPage.tsx` para su propio `<Spin/>`.
- `main` ya no tiene `background` propio explícito (hereda el `canvas` del
  contenedor padre); su `padding: '28px 32px'` se mantiene igual — es lo
  que ya consume `DashboardPage.tsx` tras el fix de padding duplicado.
- Estado `scrolled` (`useState<boolean>`) se actualiza en el handler
  `onScroll` de `main`: `setScrolled(e.currentTarget.scrollTop > 0)`.

**`TopBar` — subcomponente nuevo, dentro del mismo archivo** (no amerita
archivo propio: es un solo bloque de JSX consumido únicamente por
`AppShell`):

- Contenedor: `position: relative` (no `sticky`, no hace falta — ver
  Decisiones), `padding: '16px 32px'`, `display: flex`,
  `justify-content: flex-end`, `align-items: center`, `gap: 20px`,
  transición de `background`/`box-shadow` (`180ms ease`):
  - `scrolled = false`: `background: transparent`, sin `boxShadow`.
  - `scrolled = true`: `background: T.surface`, `boxShadow: '0 2px 12px rgba(17,17,40,0.06)'`.
- Grupos (en orden): Visión general → divider → Campo → divider →
  Administración → divider → avatar. Cada grupo es un `<div style={{display:'flex', gap:16}}>`
  con sus `<Link>` (mismo patrón de `aria-current="page"` ya usado).
  Divider: `<div style={{width:1, height:20, background:T.grayLine}}/>`.
- Estilo de cada `<Link>`: `fontSize:13`, `color: active ? T.ink : T.gray`,
  `fontWeight: active ? 600 : 400`, `borderBottom: active ? '2px solid ' + T.rubus : '2px solid transparent'`,
  `paddingBottom: 4`, `textDecoration:'none'`.
- Avatar: `Avatar` de antd (círculo, iniciales = primeras 2 letras del
  email en mayúsculas — mismo cálculo que ya existe en `AppShell.tsx`
  actual) envuelto en `Dropdown` de antd con contenido custom (panel
  propio, no la API `items` de `Menu`): encabezado no clickeable (email +
  `ROLE_LABEL[user.role]`), separador, ítem "Cerrar sesión" (color
  `T.danger`, `onClick={handleLogout}`). El proyecto tiene antd `5.29.3`
  instalado — usar la prop `popupRender` si los tipos la exponen en esa
  versión; si no, `dropdownRender` (prop equivalente, previa al rename)
  como alternativa — confirmar contra los tipos de `Dropdown` al
  implementar en vez de asumir. `Dropdown` de antd cierra solo con click
  afuera o `Escape` — no requiere lógica adicional.

**NAV_ITEMS** (sin cambios de roles, solo se reorganiza en 3 arrays para
los 3 grupos en vez de un array plano):

| Grupo | Ruta | Etiqueta | Roles |
|---|---|---|---|
| Visión general | `/dashboard` | Dashboard | ADMIN, PRODUCTOR |
| Campo | `/campos` | Campos / Huertas | ADMIN, PRODUCTOR, AGRONOMO |
| Campo | `/solicitudes` | Solicitudes | ADMIN, AGRONOMO, MONITOR |
| Campo | `/analisis` | Revisión IA | ADMIN, AGRONOMO, PRODUCTOR |
| Administración | `/usuarios` | Usuarios | ADMIN |

Cada grupo filtra sus propios items por rol (`item.roles.includes(user.role)`)
igual que hoy; un grupo que quede vacío tras el filtro no renderiza su
`<div>` contenedor ni el divisor siguiente.

### 4. `zarza-web/src/dashboard/DashboardPage.tsx` — saludo

Reemplaza:

```tsx
<h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
  Dashboard
</h1>
```

por:

```tsx
<h1 style={{ fontSize: 22, fontWeight: 700, color: T.ink, margin: 0, marginBottom: 4 }}>
  Hola, {displayName(user)} 👋
</h1>
```

`DashboardPage` obtiene `user` de `useAuthContext()` (ya usado en otras
páginas del panel vía el mismo hook). El subtítulo de estado no cambia.

### 5. Accesibilidad

- Menú del avatar: `Dropdown` de antd expone los atributos ARIA de menú
  por defecto (`role="menu"`, foco por teclado, cierre con `Escape`) — no
  se requiere trabajo manual adicional.
- Objetivo táctil del avatar: `Avatar` a `size={32}` con `cursor:pointer`
  cumple el mínimo de 44×44px si se le agrega `padding: 6px` al contenedor
  clickeable (32 + 6×2 = 44).
- Contraste: `T.ink` (`#13102B`) sobre `T.canvas`/`T.surface` y `T.gray`
  (`#6B7280`) sobre los mismos fondos cumplen 4.5:1 (mismos tokens ya
  usados y no cuestionados en el trabajo previo del Dashboard).
- Navegación por teclado: los `<Link>` de cada grupo son tabulables en
  orden DOM natural (izquierda→derecha por grupo); el foco visible lo da
  el estilo por defecto del navegador (sin `outline: none` en ningún
  punto del árbol).

### 6. Verificación

- `npm run dev` en `zarza-web`, login con cada rol (ADMIN, PRODUCTOR,
  AGRONOMO, MONITOR) y confirmar que la top bar muestra exactamente las
  tabs esperadas por rol (tabla §3), con los grupos vacíos correctamente
  ocultos (p. ej. MONITOR no debe ver el grupo "Visión general" en
  absoluto, ya que su único ítem, Dashboard, no es visible para ese rol).
- Confirmar visualmente: barra transparente arriba del todo, gana fondo
  blanco + sombra al hacer scroll en cualquier página con contenido largo,
  sin logo en ningún punto del panel.
- Avatar: clic abre el menú, clic afuera y `Escape` lo cierran, "Cerrar
  sesión" funciona igual que el botón de logout anterior.
- Dashboard: recargar la página (F5) tras loguearse y confirmar que el
  saludo sigue mostrando el nombre real (no cae al fallback de email) —
  este es el caso que ejercita el fix de `GET /auth/me`.
- `npm run build` (`tsc -b && vite build`) en `zarza-web`;
  `pnpm --filter fruit-backend run build` para el cambio de backend.

## Fuera de alcance

- Migrar Usuarios/Campos/Solicitudes/Revisión IA al tema claro (proyecto
  separado).
- Página de perfil/configuración de usuario (la opción "Configuración" del
  menú del avatar no se construye en este proyecto).
- Cualquier comportamiento responsive/mobile de la top bar — `zarza-web`
  sigue siendo un panel de escritorio, sin breakpoints móviles definidos
  hoy en el resto de la app.
