# Diseño: Pestaña de Solicitudes en zarza_ai

**Plan relacionado:** [[2026-05-07-solicitudes-tab]]

**Fecha:** 2026-05-07  
**Autor:** Santiago Nuñez  
**Estado:** Aprobado

---

## Resumen

Agregar una pestaña "Solicitudes" a la app Flutter para que monitores y agrónomos puedan ver las solicitudes de muestreo que les asigna el administrador y subir el análisis directamente desde ahí.

---

## Contexto

El backend ya cuenta con el módulo `solicitudes` completo:
- `GET /api/solicitudes` — devuelve lista paginada; si el usuario es MONITOR, filtra automáticamente las asignadas a él
- `PATCH /api/solicitudes/:id/estado` — actualiza el estado (`PENDIENTE` → `EN_PROGRESO` → `COMPLETADO`)
- Los roles habilitados son `ADMIN`, `AGRONOMO`, `MONITOR`

La app Flutter actual no tiene ningún concepto de solicitudes. Usa un drawer para navegación y un flujo de captura genérico.

---

## Sección 1 — Navegación

### Cambio principal
El drawer de `HomeScreen` se elimina como navegación primaria y se reemplaza por una `NavigationBar` de Material 3 (bottom tab bar) con tres destinos:

```
[ Inicio ]  [ Solicitudes ]  [ Historial ]
```

### Estructura en GoRouter
Se agrega un `ShellRoute` en la raíz que renderiza un `ScaffoldWithBottomNav`. Las rutas internas del shell son:
- `/home` — pantalla de inicio actual
- `/solicitudes` — nueva pantalla de lista de solicitudes
- `/history` — historial de análisis (ya existente)

Las rutas modales permanecen fuera del shell (pantalla completa sin barra inferior):
- `/capture`
- `/results/:id`
- `/queue`

### Visibilidad del tab
El tab "Solicitudes" solo se muestra si `user.role == MONITOR || user.role == AGRONOMO`. Para `PRODUCTOR`, no aparece. `ADMIN` usa su propio shell de administración y no tiene este flujo.

### Preservación de estado
El estado de cada BLoC se preserva entre tabs porque el shell no se destruye al cambiar de pestaña.

---

## Sección 2 — Dominio

### Entidad

```dart
// lib/domain/entities/solicitud_entity.dart
class SolicitudEntity {
  final String id;
  final String creadoPor;
  final String asignadoA;
  final String campoId;
  final String campoNombre;
  final String mensaje;
  final EstadoSolicitud estado;
  final DateTime? fechaLimite;
  final DateTime createdAt;
}
```

### Enum

```dart
// lib/domain/enums/estado_solicitud.dart
enum EstadoSolicitud { PENDIENTE, EN_PROGRESO, COMPLETADO, CANCELADO }
```

### Puerto (interfaz)

```dart
// lib/domain/repositories/i_solicitudes_repository.dart
abstract class ISolicitudesRepository {
  Future<PaginatedResult<SolicitudEntity>> getSolicitudes({
    int page,
    int limit,
    EstadoSolicitud? estado,
  });
  Future<SolicitudEntity> updateEstado(String id, EstadoSolicitud estado);
}
```

### Use cases

- `GetSolicitudesUseCase` — llama al repo con filtros, retorna `PaginatedResult<SolicitudEntity>`
- `UpdateSolicitudEstadoUseCase` — llama al repo con id + nuevo estado, retorna `SolicitudEntity`

Ambos siguen el patrón `call()` existente en los 21 use cases actuales.

---

## Sección 3 — Datos

### Modelo

```dart
// lib/data/models/solicitud_model.dart
class SolicitudModel extends SolicitudEntity {
  factory SolicitudModel.fromJson(Map<String, dynamic> json);
}
```

Mapea la respuesta de `GET /api/solicitudes` directamente.

### Datasource remoto

```dart
// lib/data/datasources/remote/solicitudes_remote_datasource.dart
class RemoteSolicitudesDatasource {
  Future<Map<String, dynamic>> getSolicitudes(int page, int limit, String? estado);
  Future<Map<String, dynamic>> updateEstado(String id, String estado);
}
```

- `getSolicitudes` → `GET /api/solicitudes?page=&limit=&estado=` vía Dio con `AuthInterceptor`
- `updateEstado` → `PATCH /api/solicitudes/{id}/estado` con body `{ "estado": "<valor>" }`

### Repositorio

```dart
// lib/data/repositories/solicitudes_repository_impl.dart
class SolicitudesRepositoryImpl implements ISolicitudesRepository
```

Delega al datasource, convierte `SolicitudModel` → `SolicitudEntity`. Maneja `DioException` con el mismo patrón que los repositorios existentes.

### DI

Registrado en `setupServiceLocator()` como `sl.registerLazySingleton` al igual que los demás repositorios.

---

## Sección 4 — Presentación

### SolicitudesBloc

**Eventos:**
- `SolicitudesLoad` — carga página 1, filtro opcional por estado
- `SolicitudesLoadMore` — carga siguiente página (patrón idéntico a `HistoryBloc`)
- `SolicitudUpdateEstado(id, estado)` — actualiza estado de un ítem en lista local sin recargar toda la lista

**Estados:**
- `SolicitudesInitial`
- `SolicitudesLoading`
- `SolicitudesLoaded(items, hasMore, page)`
- `SolicitudesLoadingMore`
- `SolicitudesError`

### SolicitudDetailBloc

Instancia fresca por pantalla.

**Eventos:**
- `SolicitudDetailLoad(solicitud)` — recibe entidad ya cargada, emite `SolicitudDetailLoaded`
- `SolicitudDetailMarcarEnProgreso` — PATCH a `EN_PROGRESO`
- `SolicitudDetailCompletar` — PATCH a `COMPLETADO` (lo dispara la pantalla tras `CaptureSuccess`)

### SolicitudesScreen

Lista paginada con pull-to-refresh. Cada ítem muestra:
- Nombre del campo
- Mensaje truncado
- Fecha límite (si existe)
- Badge de estado con color: gris (PENDIENTE), amarillo (EN_PROGRESO), verde (COMPLETADO), rojo (CANCELADO)

Toque en ítem → navega a `SolicitudDetailScreen`.

### SolicitudDetailScreen

Muestra todos los campos de la solicitud. Botones según estado:

| Estado | Botones disponibles |
|--------|---------------------|
| PENDIENTE | "Iniciar" (→ EN_PROGRESO) + "Subir análisis" |
| EN_PROGRESO | "Subir análisis" |
| COMPLETADO | Solo lectura |
| CANCELADO | Solo lectura |

Al tocar "Subir análisis": navega a `/capture` con `CaptureContext` como `extra` en GoRouter.

---

## Sección 5 — Integración con CaptureBloc

### Contexto de captura

```dart
class CaptureContext {
  final String? campoId;      // pre-llena el selector de campo
  final String? solicitudId;  // si viene de una solicitud
}
```

### Flujo de navegación

1. `SolicitudDetailScreen` hace `context.push('/capture', extra: CaptureContext(campoId: solicitud.campoId, solicitudId: solicitud.id))`
2. `CaptureScreen` lee el `extra` al iniciar y pre-llena `campoId`
3. Al emitir `CaptureSuccess`:
   - Si `solicitudId != null`: hace `Navigator.pop` con `solicitudId` como resultado
   - Si `solicitudId == null`: comportamiento actual sin cambios
4. `SolicitudDetailScreen` usa `await context.push(...)` — al recibir el resultado, dispara `SolicitudDetailCompletar`

### Caso offline

Si `CaptureBloc` emite `CaptureQueued` (sin conexión), **no** se marca la solicitud como COMPLETADO automáticamente. La pantalla muestra:

> *"Análisis en cola. Marca la solicitud como completada cuando tengas conexión."*

El botón "Subir análisis" vuelve a estar disponible para reintentar.

### Flujo normal (sin solicitud)

Si `extra` es null o `solicitudId` es null, `CaptureScreen` se comporta exactamente igual que hoy. Sin cambios de comportamiento.

---

## Archivos nuevos

```
lib/domain/entities/solicitud_entity.dart
lib/domain/enums/estado_solicitud.dart
lib/domain/repositories/i_solicitudes_repository.dart
lib/domain/usecases/get_solicitudes_usecase.dart
lib/domain/usecases/update_solicitud_estado_usecase.dart

lib/data/models/solicitud_model.dart
lib/data/datasources/remote/solicitudes_remote_datasource.dart
lib/data/repositories/solicitudes_repository_impl.dart

lib/presentation/solicitudes/solicitudes_bloc.dart
lib/presentation/solicitudes/solicitudes_event.dart
lib/presentation/solicitudes/solicitudes_state.dart
lib/presentation/solicitudes/solicitud_detail_bloc.dart
lib/presentation/solicitudes/solicitud_detail_event.dart
lib/presentation/solicitudes/solicitud_detail_state.dart
lib/presentation/solicitudes/solicitudes_screen.dart
lib/presentation/solicitudes/solicitud_detail_screen.dart

lib/presentation/shell/scaffold_with_bottom_nav.dart
lib/core/models/capture_context.dart
```

## Archivos modificados

```
lib/core/router/app_router.dart       — ShellRoute + nuevas rutas
lib/core/di/service_locator.dart      — registrar repositorio y use cases
lib/presentation/capture/capture_screen.dart  — leer CaptureContext del extra
lib/presentation/capture/capture_bloc.dart    — (mínimo, si necesita campoId inicial)
```
