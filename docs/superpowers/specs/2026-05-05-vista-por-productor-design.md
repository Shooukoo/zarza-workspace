# Vista por Productor — Privacidad de datos entre productores

**Fecha:** 2026-05-05
**Estado:** Aprobado

## Contexto

La plataforma tiene cuatro roles: ADMIN, AGRONOMO, PRODUCTOR y MONITOR. Actualmente `GET /fruits` y `GET /fruits/:id` no aplican ningún filtro basado en el rol del usuario autenticado — un PRODUCTOR puede pasar el `user_id` de otro productor y ver sus análisis. El endpoint `GET /analyses` (revisión AI) tampoco filtra por productor. Este spec define la política de privacidad completa y los cambios necesarios para aplicarla.

## Matriz de acceso objetivo

| Endpoint | ADMIN | AGRONOMO | PRODUCTOR | MONITOR |
|---|---|---|---|---|
| `GET /fruits` | Todo | Todo | Solo propios (`productor_id = sub`) | Solo sus campos (`campo_id IN campos_asignados`) |
| `GET /fruits/:id` | Todo | Todo | Solo propio | Solo sus campos |
| `GET /analyses` | Todo | Todo | Solo propios | — (sin acceso) |
| `GET /analyses/:id` | Todo | Todo | Solo propio | — (sin acceso) |
| `PATCH /analyses/:id/validate` | Sí | Sí | No | No |
| `GET /dashboard/*` | Todo | — | Solo propios | — (ya implementado) |
| `GET /campos` | Todo | Todo | Solo propios | — (ya implementado) |

## Arquitectura

### Patrón: UserScope

Tipo compartido que representa el contexto de acceso del usuario autenticado:

```typescript
type UserScope = {
  role: Role;
  sub: string;
  camposAsignados?: string[];  // solo presente para MONITOR
};
```

Cada controller que aplica scoping implementa un método privado `buildScope(jwtUser: JwtPayload): Promise<UserScope>`. Para MONITOR, este método consulta `UserRepository.findById(jwtUser.sub)` para leer `campos_asignados`. Para los demás roles, solo empaqueta `role` y `sub` del JWT sin DB round-trip.

El `UserRepository` ya existe (token `I_USER_REPOSITORY`) y se inyecta en el constructor del controller.

### Precedencia de filtros

Cuando el scope del JWT contradice un query param del cliente (ej. PRODUCTOR envía `productor_id` de otro usuario), el scope del JWT tiene precedencia. Los query params de filtro enviados por el cliente se ignoran si el rol impone un scope más restrictivo.

## Cambios por componente

### 1. `fruits-query` module (`fruit-backend`)

**Controller** (`fruits-query.controller.ts`):
- Inyectar `I_USER_REPOSITORY`
- Añadir método privado `buildScope`
- `GET /fruits`: construir scope, pasarlo al servicio
- `GET /fruits/:id`: construir scope, pasarlo al servicio; responder 404 si el servicio devuelve `null`

**Service** (`fruits-query.service.ts`):
- `findAll(query, scope)`: incluir en el payload RabbitMQ `get_fruits`:
  - Si PRODUCTOR: `{ ...query, productor_id: scope.sub }`
  - Si MONITOR: `{ ...query, campo_ids: scope.camposAsignados }`
  - Si ADMIN/AGRONOMO: `{ ...query }` sin modificar
- `findOne(id, scope)`: incluir scope en payload `get_fruit_by_id` para que fruit-ms verifique ownership

### 2. `fruit-ms`

**Handler `get_fruits`**:
- Soportar nuevo filtro opcional `campo_ids?: string[]` en el `$match` de MongoDB: `{ campo_id: { $in: campo_ids.map(ObjectId) } }`
- El filtro `productor_id` ya existe o se añade al `$match` si viene en el payload

**Handler `get_fruit_by_id`**:
- Recibir `scope` en el payload
- Tras encontrar el documento, verificar:
  - Si scope incluye `productor_id`: el doc debe tener `productor_id === scope.sub`
  - Si scope incluye `campo_ids`: el doc debe tener `campo_id IN scope.camposAsignados`
  - Si ADMIN/AGRONOMO: sin verificación adicional
- Devolver `null` si no pasa la verificación (el controller responderá 404)

### 3. `analyses` module (`fruit-backend`)

**Controller** (`analyses.controller.ts`):
- Inyectar `I_USER_REPOSITORY`
- Añadir método privado `buildScope`
- `GET /analyses`: añadir `Role.PRODUCTOR` a `@Roles`, construir scope, pasarlo al servicio
- `GET /analyses/:id`: añadir `Role.PRODUCTOR` a `@Roles`, construir scope, pasarlo al servicio; 404 si `null`
- `PATCH /analyses/:id/validate`: mantener solo `Role.ADMIN, Role.AGRONOMO`

**Service** (`analyses.service.ts`):
- `findAll(query, scope)`: añadir filtro MongoDB condicional:
  - Si PRODUCTOR: `filter.productor_id = new ObjectId(scope.sub)`
  - Si ADMIN/AGRONOMO: sin filtro adicional
- `findOne(id, scope)`: tras encontrar, verificar ownership si PRODUCTOR; devolver `null` si no coincide

### 4. `zarza-web` (frontend)

**`App.tsx`**:
- Añadir `Role.PRODUCTOR` a la ruta `/analisis`

**Página `/analisis`**:
- Ocultar el botón/formulario de validación experto cuando `user.role === 'PRODUCTOR'`
- Sin cambio en la llamada API — el backend filtra automáticamente por scope

## Casos edge

| Caso | Comportamiento |
|---|---|
| MONITOR sin `campos_asignados` | `buildScope` devuelve `camposAsignados: []`; servicio aplica `campo_id IN []` → lista vacía, sin error |
| PRODUCTOR solicita `GET /fruits/:id` ajeno | fruit-ms devuelve `null` → controller responde 404 |
| PRODUCTOR solicita `GET /analyses/:id` ajeno | service devuelve `null` → controller responde 404 |
| PRODUCTOR envía `productor_id` en query params | Se ignora; el scope del JWT tiene precedencia |
| AGRONOMO solicita cualquier análisis | Sin filtro, acceso total |

## Sin cambios en

- `POST /ingestion` — `productor_id` ya se toma del campo seleccionado en el cliente
- `GET /dashboard/*` — ya filtrado por productor
- `GET /campos` — ya filtrado por productor
- `/solicitudes` — no expone datos de análisis
- `/admin/users` — ADMIN only, sin cambios
