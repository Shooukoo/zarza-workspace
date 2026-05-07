# Diseño Fase 1 — AGRONOMO: Fix 403 + Assignment Model + Validación de Análisis

**Fecha:** 2026-05-06  
**Estado:** Aprobado  
**Autor:** Santiago Nuñez

---

## Contexto

El rol AGRONOMO recibe un 403 al iniciar sesión porque `LoginPage.tsx` siempre redirige a `/dashboard`, ruta que solo permite `[Role.ADMIN, Role.PRODUCTOR]`. Además, el AGRONOMO carece de funcionalidades operativas clave: no tiene campos asignados y no puede actuar sobre los análisis de la IA.

Esta Fase 1 establece la base de datos y lógica de negocio que la Fase 2 (Dashboard AGRONOMO) consumirá.

---

## Alcance

1. Fix 403: redirect inteligente post-login por rol
2. Campo-Agrónomo assignment model (backend + frontend)
3. Validación de análisis IA con override y notificación al Productor

---

## Sección 1: Fix 403 — Redirect por Rol

### Problema
`LoginPage.tsx:22` navega siempre a `/dashboard`. AGRONOMO y MONITOR no tienen acceso a esa ruta, lo que dispara la redirección a `/403`.

### Solución
Agregar una función `defaultRouteForRole(role: Role): string` en `zarza-web/src/auth/`:

| Rol | Ruta de inicio |
|---|---|
| ADMIN | `/dashboard` |
| PRODUCTOR | `/dashboard` |
| AGRONOMO | `/analisis` *(temporal hasta Fase 2, donde tendrá su propio dashboard)* |
| MONITOR | `/solicitudes` |

### Archivos afectados
- `zarza-web/src/auth/LoginPage.tsx` — reemplazar `navigate('/dashboard')` por `navigate(defaultRouteForRole(user.role))`
- `zarza-web/src/auth/types.ts` o nuevo `zarza-web/src/auth/defaultRoute.ts` — función helper

### Restricciones
- No modifica guards ni rutas existentes
- No altera el comportamiento para ADMIN/PRODUCTOR

---

## Sección 2: Campo-Agrónomo Assignment Model

### Data Model

Añadir campo opcional al schema de `Campo` en MongoDB:

```ts
agronomoId?: ObjectId  // ref → User (role: AGRONOMO)
```

Relación: **uno-a-uno por campo** (un campo tiene máximo un agrónomo asignado; un agrónomo puede tener muchos campos).

### Backend

**Nuevo endpoint:**
```
PATCH /campos/:id/agronomo
Body: { agronomoId: string | null }
Roles: ADMIN únicamente
```

- `agronomoId: null` desasigna el agrónomo del campo
- Validación: el `agronomoId` debe corresponder a un usuario con `role: AGRONOMO`
- Actualiza solo el campo `agronomoId` — no afecta otros campos del documento

**Scoping en `GET /campos`:**

Cuando el solicitante tiene `role: AGRONOMO`, el backend filtra `{ agronomoId: req.user._id }`. Para ADMIN y PRODUCTOR, sin cambios.

**Archivos afectados (backend):**
- `fruit-backend/src/campos/campo.schema.ts` — añadir `agronomoId`
- `fruit-backend/src/campos/campos.controller.ts` — nuevo endpoint PATCH
- `fruit-backend/src/campos/campos.service.ts` — lógica de asignación + scoping por rol

### Frontend

**UserDrawer** (`zarza-web/src/admin/UserDrawer.tsx`):
- Si el usuario tiene `role: AGRONOMO`, mostrar sección "Campos asignados"
- `<Select mode="multiple">` con todos los campos disponibles
- Al guardar, itera y llama `PATCH /campos/:id/agronomo` por cada cambio

**CamposPage** (`zarza-web/src/campos/CamposPage.tsx`):
- Nueva columna "Agrónomo" en la tabla, visible solo para ADMIN
- Selector inline (`<Select>`) que lista usuarios con `role: AGRONOMO`
- Al seleccionar, llama `PATCH /campos/:id/agronomo` directamente

---

## Sección 3: Validación de Análisis IA

### Data Model

El schema de `Analysis` en `fruit-ms` ya tiene un subdocumento `validacion_experto`. Se extiende (no se duplica):

```ts
// fruit-ms/src/fruits/schemas/analysis.schema.ts — validacion_experto extendido
validacion_experto: {
  estado:               'pendiente' | 'validado' | 'rechazado'  // nuevo, default: 'pendiente'
  fue_corregido:        Boolean          // ya existe
  corregido_por:        ObjectId | null  // ya existe — ref → User (el agrónomo)
  diagnostico_original: string | null    // ya existe — reusado como etapa_override
  fecha_validacion:     Date | null      // nuevo
}
```

Las 7 etapas fenológicas válidas para `overriddenStage` (de `fruit-inference/model_config.py`):
`boton`, `flor`, `verde`, `naranja`, `marron`, `maduro`, `deteccion_gen`

### Backend — Flujo de escritura

`fruit-backend` NO escribe directamente a MongoDB. Sigue el mismo patrón que `get_fruits`: envía un `MessagePattern` a `fruit-ms` via RabbitMQ, y `fruit-ms` persiste.

**Nuevo MessagePattern en `fruit-ms`:** `validate_analysis`
```ts
// Payload
{ analysisId: string, action: 'validado' | 'rechazado', overriddenStage?: string, validatedBy: string }
```

**Nuevo endpoint en `fruit-backend`:**
```
PATCH /analyses/:id/validate
Body: { action: 'validado' | 'rechazado', overriddenStage?: string }
Roles: ADMIN, AGRONOMO
```

**Reglas de negocio (aplicadas en `fruit-ms`):**
- Solo se puede validar/rechazar si `estado === 'pendiente'`
- `overriddenStage` solo se acepta cuando `action === 'rechazado'`
- `overriddenStage` debe ser una de las 7 etapas fenológicas listadas arriba
- Al rechazar con override: `fue_corregido: true`, `diagnostico_original: overriddenStage`
- `corregido_por` y `fecha_validacion` se setean desde el payload

**Notificación al Productor:**

`fruit-backend` emite evento WebSocket al canal del productor dueño del campo tras confirmación de `fruit-ms`:

```ts
{
  event: 'analysis_validated',
  data: {
    analysisId: string,
    action: 'validado' | 'rechazado',
    fieldName: string,
    overriddenStage?: string,
    validatedBy: string, // email del agrónomo
  }
}
```

En `zarza-web`, el PRODUCTOR recibe una notificación Ant Design (`notification.info` para validado, `notification.warning` para rechazado).

**Archivos afectados (backend):**
- `fruit-backend/src/fruits-query/fruits-query.controller.ts` — nuevo endpoint PATCH
- `fruit-backend/src/fruits-query/fruits-query.service.ts` — envía MessagePattern `validate_analysis`
- `fruit-ms/src/fruits/schemas/analysis.schema.ts` — extender `validacion_experto` con `estado` y `fecha_validacion`
- `fruit-ms/src/fruits/fruits.controller.ts` — nuevo handler `validate_analysis`
- `fruit-ms/src/fruits/fruits.service.ts` — lógica de validación + reglas de negocio
- `fruit-backend/src/notifications/notifications.gateway.ts` — nuevo evento `analysis_validated`

### Frontend

**AnalisisPage** (`zarza-web/src/analisis/AnalisisPage.tsx`):
- Nueva columna "Validación" con badge de color:
  - `pendiente` → gris
  - `validado` → verde
  - `rechazado` → rojo
- Botones "Validar" / "Rechazar" en cada fila, visibles solo para `role: AGRONOMO` y `ADMIN`
- Estado `pendiente` muestra ambos botones; `validado`/`rechazado` muestra badge sin botones

**Modal de rechazo:**
- Título: "Rechazar análisis — corregir etapa"
- `<Select>` con las 7 etapas fenológicas de YOLOv8 (campo opcional)
- Botón "Confirmar rechazo"

---

## Fuera de alcance (Fase 2)

- Dashboard propio del AGRONOMO con Quick Actions y alertas automáticas
- Redirect post-login de AGRONOMO a su dashboard (se actualiza en Fase 2)
- Alertas por umbrales (merma alta, etapa crítica)

---

## Orden de implementación sugerido

1. Fix 403 (independiente, bajo riesgo)
2. Schema changes (campo + analysis) — base para todo lo demás
3. Backend: assignment endpoint + scoping en GET /campos
4. Backend: validación endpoint + notificación WebSocket
5. Frontend: UserDrawer + CamposPage (assignment UI)
6. Frontend: AnalisisPage (validación UI + notificación listener)
