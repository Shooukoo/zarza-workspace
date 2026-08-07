# Diseño: Validación de Análisis por Agrónomo

**Plan relacionado:** [[2026-05-05-analisis-validacion]]

**Fecha:** 2026-05-05  
**Feature:** `PATCH /api/analyses/:id/validate` + pantalla de revisión en zarza-web

---

## Resumen

Un usuario con rol `AGRONOMO` puede revisar los análisis generados por el modelo IA, corregir los conteos fenológicos por etapa y agregar observaciones en texto libre. El sistema marca el análisis como `fue_corregido: true` y guarda el diagnóstico corregido junto al original.

---

## 1. Modelo de Datos

### Nuevo módulo `analyses/` en `fruit-backend`

Schema Mongoose completo apuntando a la colección `analyses` (paralelo al schema minimal del admin, que no se modifica).

Campos clave del schema:

```ts
{
  image_id:        String,
  storage_key:     String,       // clave en R2 para generar presigned URL
  campo_id:        ObjectId,
  productor_id:    ObjectId,
  fecha_analisis:  Date,
  metricas_salud: {
    total_elementos_detectados: Number,
    elementos_sanos:            Number,
    elementos_enfermos:         Number,
    porcentaje_merma_general:   Number,
  },
  cronograma_fenologico: [{
    etapa:    String,
    cantidad: Number,
    prediccion: {
      cambio_a:          String,
      en_dias:           Number,
      dias_para_cosecha: Number,
    },
  }],
  validacion_experto: {
    fue_corregido:        Boolean,   // default false
    corregido_por:        ObjectId,  // ref → User
    fecha_correccion:     Date,
    diagnostico_original: String,    // guardado solo la primera vez
    cronograma_corregido: [{         // conteos ajustados por el agrónomo
      etapa:    String,
      cantidad: Number,
    }],
    observaciones: String,           // texto libre del agrónomo
  },
}
```

---

## 2. Backend — Módulo `analyses/`

**Ubicación:** `fruit-backend/src/analyses/`

### Endpoints

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| `GET` | `/analyses` | ADMIN, AGRONOMO | Listado paginado. Query param `?validado=true\|false\|all` (default `false`) |
| `GET` | `/analyses/:id` | ADMIN, AGRONOMO | Detalle completo del análisis |
| `GET` | `/analyses/:id/image` | ADMIN, AGRONOMO | Devuelve `{ url: string }` con presigned URL de R2 (expiración 15 min, `staleTime: 0`) |
| `PATCH` | `/analyses/:id/validate` | AGRONOMO | Guarda la corrección del agrónomo |

### PATCH body (DTO)

```ts
class ValidateAnalysisDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  cronograma_corregido: { etapa: string; cantidad: number }[];

  @IsString()
  @IsNotEmpty()
  observaciones: string;
}
```

### Lógica del PATCH

1. Buscar el análisis por `id` — `404` si no existe.
2. Si `fue_corregido` es `false`, serializar `cronograma_fenologico` del análisis como JSON string y guardarlo en `diagnostico_original` (snapshot del estado IA antes de la primera corrección).
3. Guardar `cronograma_corregido`, `observaciones`, `fue_corregido: true`, `corregido_por: req.user._id`, `fecha_correccion: new Date()`.
4. Devolver el análisis actualizado completo.

### Presigned URL

Reutiliza el cliente R2/S3 del módulo `storage/` de `fruit-backend`. Se agrega el método `getPresignedUrl(key: string, expiresIn: number): Promise<string>`.

---

## 3. Frontend — zarza-web

**Nueva ruta:** `/analisis`  
**Acceso:** `AGRONOMO`, `ADMIN`  
**Enlace en sidebar:** visible para ambos roles

### Estructura de archivos

```
zarza-web/src/analisis/
  AnalisisPage.tsx          — tabla con tabs Pendientes / Validados
  AnalisisDetailModal.tsx   — modal detalle + formulario de corrección
  useAnalisis.ts            — hooks React Query
  types.ts                  — interfaces TypeScript
```

### `AnalisisPage.tsx`

- Tabla Ant Design con columnas: `campo`, `fecha`, `etapa predominante`, `productor`, badge de estado validación.
- Dos pestañas Ant Design: **Pendientes** (sin validar) y **Validados**.
- Click en fila → abre `AnalisisDetailModal`.

### `AnalisisDetailModal.tsx`

Modal ancho (~900px) dividido en dos columnas:

- **Columna izquierda:** foto del análisis cargada desde presigned URL, con skeleton de carga y placeholder en caso de error.
- **Columna derecha:** métricas de salud del modelo IA y `cronograma_fenologico` con etapas y cantidades.

**Formulario de corrección** (solo visible y editable para `AGRONOMO`):
- Un campo numérico por cada etapa fenológica, pre-cargado con el valor del modelo.
- Textarea para observaciones.
- Botón "Guardar corrección" — deshabilitado durante `isLoading`, no aparece para `ADMIN`.

Al guardar exitosamente: `queryClient.invalidateQueries(['analisis'])` para refrescar ambas pestañas.

### Hooks (`useAnalisis.ts`)

```ts
useAnalisisList(validado: boolean | 'all')   // GET /analyses?validado=...
useAnalisisDetail(id: string)                 // GET /analyses/:id
useAnalisisImage(id: string)                  // GET /analyses/:id/image (staleTime: 0)
useValidateAnalisis()                         // PATCH /analyses/:id/validate
```

---

## 4. Manejo de Errores

### Backend
- `404` si el análisis no existe.
- `403` si un rol distinto a `AGRONOMO` intenta el PATCH (guard).
- Validación de DTO: `cronograma_corregido` requiere `@ArrayMinSize(1)`.
- `diagnostico_original` no se sobreescribe en correcciones sucesivas.

### Frontend
- Imagen: skeleton de carga + placeholder si falla la presigned URL.
- Error en PATCH: `message.error` de Ant Design con mensaje del servidor.
- Botón "Guardar" bloqueado durante la mutación.
- Inputs del formulario deshabilitados para `ADMIN`.

---

## 5. Archivos a Crear / Modificar

### fruit-backend
- `src/analyses/analyses.module.ts` — nuevo
- `src/analyses/analyses.schema.ts` — nuevo (schema completo)
- `src/analyses/analyses.service.ts` — nuevo
- `src/analyses/analyses.controller.ts` — nuevo
- `src/analyses/dto/validate-analysis.dto.ts` — nuevo
- `src/storage/storage.service.ts` — agregar `getPresignedUrl()`
- `src/app.module.ts` — registrar `AnalysesModule`

### zarza-web
- `src/analisis/types.ts` — nuevo
- `src/analisis/useAnalisis.ts` — nuevo
- `src/analisis/AnalisisPage.tsx` — nuevo
- `src/analisis/AnalisisDetailModal.tsx` — nuevo
- `src/App.tsx` — agregar ruta `/analisis`
- `src/shared/AppShell.tsx` — agregar enlace en sidebar
