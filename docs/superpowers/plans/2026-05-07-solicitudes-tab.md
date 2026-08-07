# Solicitudes Tab Implementation Plan

**Spec relacionado:** [[2026-05-07-solicitudes-tab-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una pestaña de Solicitudes a zarza_ai para que monitores y agrónomos vean sus solicitudes de muestreo asignadas y suban el análisis desde ahí.

**Architecture:** Clean Architecture completa: dominio → datos → presentación. Un `ShellRoute` de GoRouter envuelve `/home`, `/solicitudes`, `/solicitudes/:id` e `/history` con una `NavigationBar` persistente. `SolicitudesBloc` vive en el shell para preservar estado entre tabs. `CaptureScreen` se modifica para recibir un `CaptureContext` que pre-llena el campo y dispara el marcado automático de COMPLETADO al subir exitosamente.

**Tech Stack:** Flutter 3, flutter_bloc, go_router, GetIt, Dio, Equatable, Dart 3

---

## File Map

### Archivos nuevos
| Archivo | Responsabilidad |
|---------|-----------------|
| `lib/domain/enums/estado_solicitud.dart` | Enum `EstadoSolicitud` |
| `lib/domain/entities/solicitud_entity.dart` | Entidad de dominio `SolicitudEntity` |
| `lib/domain/repositories/i_solicitudes_repository.dart` | Puerto abstracto |
| `lib/domain/usecases/get_solicitudes_usecase.dart` | Caso de uso: listar |
| `lib/domain/usecases/update_solicitud_estado_usecase.dart` | Caso de uso: actualizar estado |
| `lib/data/models/solicitud_model.dart` | DTO + `fromJson` + `toEntity` |
| `lib/data/datasources/remote_solicitudes_datasource.dart` | Llamadas HTTP Dio |
| `lib/data/repositories/solicitudes_repository_impl.dart` | Implementación del puerto |
| `lib/core/models/capture_context.dart` | Datos opcionales para captura desde solicitud |
| `lib/presentation/solicitudes/solicitudes_bloc.dart` | Eventos + Estados + BLoC de lista |
| `lib/presentation/solicitudes/solicitud_detail_bloc.dart` | Eventos + Estados + BLoC de detalle |
| `lib/presentation/solicitudes/solicitudes_screen.dart` | Pantalla lista |
| `lib/presentation/solicitudes/solicitud_detail_screen.dart` | Pantalla detalle |
| `lib/presentation/shell/scaffold_with_bottom_nav.dart` | Shell con `NavigationBar` |

### Archivos modificados
| Archivo | Cambio |
|---------|--------|
| `fruit-backend/src/solicitudes/solicitudes.service.ts` | Añadir `.populate('campo_id', 'nombre')` en `findAll` |
| `lib/core/constants/app_constants.dart` | Añadir `solicitudesEndpoint` |
| `lib/core/di/service_locator.dart` | Registrar datasource, repo, use cases y BLoCs |
| `lib/core/router/app_router.dart` | Añadir `ShellRoute` móvil + rutas de solicitudes |
| `lib/presentation/capture/capture_screen.dart` | Leer `CaptureContext`, comportamiento condicional |

---

## Task 1: Backend — Populate campo_id en findAll

**Files:**
- Modify: `fruit-backend/src/solicitudes/solicitudes.service.ts`

- [ ] **Step 1: Leer el método `findAll` actual**

Abrir `fruit-backend/src/solicitudes/solicitudes.service.ts` y localizar el bloque `Promise.all` dentro de `findAll`.

- [ ] **Step 2: Añadir `.populate('campo_id', 'nombre')` a la query**

Encontrar:
```typescript
this.solicitudModel.find(query)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean(),
```

Reemplazar por:
```typescript
this.solicitudModel.find(query)
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .populate('campo_id', 'nombre')
  .lean(),
```

- [ ] **Step 3: Verificar que el backend compila**

```bash
cd fruit-backend
pnpm run build
```

Resultado esperado: sin errores de TypeScript.

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/solicitudes/solicitudes.service.ts
git commit -m "feat(solicitudes): populate campo_id.nombre in findAll response"
```

---

## Task 2: Dominio — Enum, Entidad, Puerto, Use Cases

**Files:**
- Create: `zarza_ai/lib/domain/enums/estado_solicitud.dart`
- Create: `zarza_ai/lib/domain/entities/solicitud_entity.dart`
- Create: `zarza_ai/lib/domain/repositories/i_solicitudes_repository.dart`
- Create: `zarza_ai/lib/domain/usecases/get_solicitudes_usecase.dart`
- Create: `zarza_ai/lib/domain/usecases/update_solicitud_estado_usecase.dart`

- [ ] **Step 1: Crear el enum `EstadoSolicitud`**

Crear `zarza_ai/lib/domain/enums/estado_solicitud.dart`:
```dart
enum EstadoSolicitud {
  PENDIENTE,
  EN_PROGRESO,
  COMPLETADO,
  CANCELADO;

  static EstadoSolicitud fromString(String value) {
    return EstadoSolicitud.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EstadoSolicitud.PENDIENTE,
    );
  }

  String get displayName => switch (this) {
        EstadoSolicitud.PENDIENTE => 'Pendiente',
        EstadoSolicitud.EN_PROGRESO => 'En progreso',
        EstadoSolicitud.COMPLETADO => 'Completado',
        EstadoSolicitud.CANCELADO => 'Cancelado',
      };
}
```

- [ ] **Step 2: Crear la entidad `SolicitudEntity`**

Crear `zarza_ai/lib/domain/entities/solicitud_entity.dart`:
```dart
import 'package:equatable/equatable.dart';
import '../enums/estado_solicitud.dart';

class SolicitudEntity extends Equatable {
  const SolicitudEntity({
    required this.id,
    required this.creadoPor,
    required this.asignadoA,
    required this.campoId,
    required this.campoNombre,
    required this.mensaje,
    required this.estado,
    required this.createdAt,
    this.fechaLimite,
  });

  final String id;
  final String creadoPor;
  final String asignadoA;
  final String campoId;
  final String campoNombre;
  final String mensaje;
  final EstadoSolicitud estado;
  final DateTime? fechaLimite;
  final DateTime createdAt;

  SolicitudEntity copyWith({EstadoSolicitud? estado}) => SolicitudEntity(
        id: id,
        creadoPor: creadoPor,
        asignadoA: asignadoA,
        campoId: campoId,
        campoNombre: campoNombre,
        mensaje: mensaje,
        estado: estado ?? this.estado,
        fechaLimite: fechaLimite,
        createdAt: createdAt,
      );

  @override
  List<Object?> get props =>
      [id, creadoPor, asignadoA, campoId, mensaje, estado, fechaLimite, createdAt];
}
```

- [ ] **Step 3: Crear el puerto `ISolicitudesRepository`**

Crear `zarza_ai/lib/domain/repositories/i_solicitudes_repository.dart`:
```dart
import '../entities/solicitud_entity.dart';
import '../enums/estado_solicitud.dart';

abstract class ISolicitudesRepository {
  Future<List<SolicitudEntity>> getSolicitudes({
    int page = 1,
    int limit = 20,
    EstadoSolicitud? estado,
  });

  Future<SolicitudEntity> updateEstado(String id, EstadoSolicitud estado);
}
```

- [ ] **Step 4: Crear `GetSolicitudesUseCase`**

Crear `zarza_ai/lib/domain/usecases/get_solicitudes_usecase.dart`:
```dart
import '../entities/solicitud_entity.dart';
import '../enums/estado_solicitud.dart';
import '../repositories/i_solicitudes_repository.dart';

class GetSolicitudesUseCase {
  const GetSolicitudesUseCase(this._repository);
  final ISolicitudesRepository _repository;

  Future<List<SolicitudEntity>> call({
    int page = 1,
    int limit = 20,
    EstadoSolicitud? estado,
  }) =>
      _repository.getSolicitudes(page: page, limit: limit, estado: estado);
}
```

- [ ] **Step 5: Crear `UpdateSolicitudEstadoUseCase`**

Crear `zarza_ai/lib/domain/usecases/update_solicitud_estado_usecase.dart`:
```dart
import '../entities/solicitud_entity.dart';
import '../enums/estado_solicitud.dart';
import '../repositories/i_solicitudes_repository.dart';

class UpdateSolicitudEstadoUseCase {
  const UpdateSolicitudEstadoUseCase(this._repository);
  final ISolicitudesRepository _repository;

  Future<SolicitudEntity> call(String id, EstadoSolicitud estado) =>
      _repository.updateEstado(id, estado);
}
```

- [ ] **Step 6: Commit**

```bash
cd zarza_ai
git add lib/domain/enums/estado_solicitud.dart \
        lib/domain/entities/solicitud_entity.dart \
        lib/domain/repositories/i_solicitudes_repository.dart \
        lib/domain/usecases/get_solicitudes_usecase.dart \
        lib/domain/usecases/update_solicitud_estado_usecase.dart
git commit -m "feat(solicitudes): add domain layer — entity, enum, port, use cases"
```

---

## Task 3: AppConstants — Añadir endpoint

**Files:**
- Modify: `zarza_ai/lib/core/constants/app_constants.dart`

- [ ] **Step 1: Añadir la constante del endpoint**

En `app_constants.dart`, dentro del bloque de endpoints (después de `fruitsEndpoint`), añadir:
```dart
static const String solicitudesEndpoint = '/api/solicitudes';
```

- [ ] **Step 2: Commit**

```bash
git add lib/core/constants/app_constants.dart
git commit -m "feat(solicitudes): add solicitudesEndpoint to AppConstants"
```

---

## Task 4: Capa de Datos

**Files:**
- Create: `zarza_ai/lib/data/models/solicitud_model.dart`
- Create: `zarza_ai/lib/data/datasources/remote_solicitudes_datasource.dart`
- Create: `zarza_ai/lib/data/repositories/solicitudes_repository_impl.dart`

- [ ] **Step 1: Crear `SolicitudModel`**

Crear `zarza_ai/lib/data/models/solicitud_model.dart`:
```dart
import '../../core/constants/app_constants.dart';
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';

class SolicitudModel {
  const SolicitudModel({
    required this.id,
    required this.creadoPor,
    required this.asignadoA,
    required this.campoId,
    required this.campoNombre,
    required this.mensaje,
    required this.estado,
    required this.createdAt,
    this.fechaLimite,
  });

  final String id;
  final String creadoPor;
  final String asignadoA;
  final String campoId;
  final String campoNombre;
  final String mensaje;
  final EstadoSolicitud estado;
  final DateTime? fechaLimite;
  final DateTime createdAt;

  factory SolicitudModel.fromJson(Map<String, dynamic> json) {
    // campo_id puede ser un ObjectId string o un objeto populado { _id, nombre }
    final campoRaw = json['campo_id'];
    final String campoId;
    final String campoNombre;
    if (campoRaw is Map<String, dynamic>) {
      campoId = (campoRaw['_id'] ?? '').toString();
      campoNombre = campoRaw['nombre'] as String? ?? campoId;
    } else {
      campoId = campoRaw?.toString() ?? '';
      campoNombre = campoId;
    }

    return SolicitudModel(
      id: (json['_id'] ?? json['id'] ?? '').toString(),
      creadoPor: (json['creado_por'] ?? '').toString(),
      asignadoA: (json['asignado_a'] ?? '').toString(),
      campoId: campoId,
      campoNombre: campoNombre,
      mensaje: json['mensaje'] as String? ?? '',
      estado: EstadoSolicitud.fromString(json['estado'] as String? ?? 'PENDIENTE'),
      fechaLimite: json['fecha_limite'] != null
          ? DateTime.tryParse(json['fecha_limite'] as String)
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  SolicitudEntity toEntity() => SolicitudEntity(
        id: id,
        creadoPor: creadoPor,
        asignadoA: asignadoA,
        campoId: campoId,
        campoNombre: campoNombre,
        mensaje: mensaje,
        estado: estado,
        fechaLimite: fechaLimite,
        createdAt: createdAt,
      );
}
```

- [ ] **Step 2: Crear `RemoteSolicitudesDatasource`**

Crear `zarza_ai/lib/data/datasources/remote_solicitudes_datasource.dart`:
```dart
import 'package:dio/dio.dart';
import '../../core/constants/app_constants.dart';
import '../models/solicitud_model.dart';

class RemoteSolicitudesDatasource {
  RemoteSolicitudesDatasource(this._dio);
  final Dio _dio;

  Future<List<SolicitudModel>> getSolicitudes({
    int page = 1,
    int limit = 20,
    String? estado,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit};
    if (estado != null) query['estado'] = estado;

    final response = await _dio.get(
      AppConstants.solicitudesEndpoint,
      queryParameters: query,
    );

    final data = response.data;
    List<dynamic> items;
    if (data is Map && data['data'] is List) {
      items = data['data'] as List;
    } else if (data is List) {
      items = data;
    } else {
      items = [];
    }

    return items
        .map((e) => SolicitudModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<SolicitudModel> updateEstado(String id, String estado) async {
    final response = await _dio.patch(
      '${AppConstants.solicitudesEndpoint}/$id/estado',
      data: {'estado': estado},
    );
    return SolicitudModel.fromJson(response.data as Map<String, dynamic>);
  }
}
```

- [ ] **Step 3: Crear `SolicitudesRepositoryImpl`**

Crear `zarza_ai/lib/data/repositories/solicitudes_repository_impl.dart`:
```dart
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import '../../domain/repositories/i_solicitudes_repository.dart';
import '../datasources/remote_solicitudes_datasource.dart';

class SolicitudesRepositoryImpl implements ISolicitudesRepository {
  SolicitudesRepositoryImpl(this._datasource);
  final RemoteSolicitudesDatasource _datasource;

  @override
  Future<List<SolicitudEntity>> getSolicitudes({
    int page = 1,
    int limit = 20,
    EstadoSolicitud? estado,
  }) async {
    final models = await _datasource.getSolicitudes(
      page: page,
      limit: limit,
      estado: estado?.name,
    );
    return models.map((m) => m.toEntity()).toList();
  }

  @override
  Future<SolicitudEntity> updateEstado(String id, EstadoSolicitud estado) async {
    final model = await _datasource.updateEstado(id, estado.name);
    return model.toEntity();
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/data/models/solicitud_model.dart \
        lib/data/datasources/remote_solicitudes_datasource.dart \
        lib/data/repositories/solicitudes_repository_impl.dart
git commit -m "feat(solicitudes): add data layer — model, datasource, repository"
```

---

## Task 5: DI Wiring

**Files:**
- Modify: `zarza_ai/lib/core/di/service_locator.dart`

- [ ] **Step 1: Añadir los imports de solicitudes**

Al final del bloque de imports existentes (después de `offline_queue_bloc.dart`), añadir:
```dart
// Solicitudes — Data
import '../../data/datasources/remote_solicitudes_datasource.dart';
import '../../data/repositories/solicitudes_repository_impl.dart';
// Solicitudes — Domain
import '../../domain/repositories/i_solicitudes_repository.dart';
import '../../domain/usecases/get_solicitudes_usecase.dart';
import '../../domain/usecases/update_solicitud_estado_usecase.dart';
// Solicitudes — Presentation
import '../../presentation/solicitudes/solicitudes_bloc.dart';
import '../../presentation/solicitudes/solicitud_detail_bloc.dart';
```

- [ ] **Step 2: Registrar datasource, repositorio y use cases**

Al final de `setupServiceLocator()`, antes del cierre de la función (después del bloque `// ── Inicializar sesión`), añadir:
```dart
  // ── Solicitudes ───────────────────────────────────────────────────────────
  sl.registerLazySingleton<RemoteSolicitudesDatasource>(
    () => RemoteSolicitudesDatasource(sl<Dio>()),
  );

  sl.registerLazySingleton<ISolicitudesRepository>(
    () => SolicitudesRepositoryImpl(sl<RemoteSolicitudesDatasource>()),
  );

  sl.registerLazySingleton<GetSolicitudesUseCase>(
    () => GetSolicitudesUseCase(sl<ISolicitudesRepository>()),
  );

  sl.registerLazySingleton<UpdateSolicitudEstadoUseCase>(
    () => UpdateSolicitudEstadoUseCase(sl<ISolicitudesRepository>()),
  );

  sl.registerFactory<SolicitudesBloc>(
    () => SolicitudesBloc(sl<GetSolicitudesUseCase>()),
  );

  sl.registerFactory<SolicitudDetailBloc>(
    () => SolicitudDetailBloc(sl<UpdateSolicitudEstadoUseCase>()),
  );
```

- [ ] **Step 3: Commit**

```bash
git add lib/core/di/service_locator.dart
git commit -m "feat(solicitudes): register solicitudes DI in service locator"
```

---

## Task 6: CaptureContext Model

**Files:**
- Create: `zarza_ai/lib/core/models/capture_context.dart`

- [ ] **Step 1: Crear la clase `CaptureContext`**

Crear `zarza_ai/lib/core/models/capture_context.dart`:
```dart
class CaptureContext {
  const CaptureContext({
    this.campoId,
    this.solicitudId,
  });

  /// Pre-llena el selector de campo en CaptureScreen.
  final String? campoId;

  /// Si viene de una solicitud, se marca COMPLETADO al subir exitosamente.
  final String? solicitudId;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/core/models/capture_context.dart
git commit -m "feat(solicitudes): add CaptureContext model for solicitud-driven capture"
```

---

## Task 7: SolicitudesBloc

**Files:**
- Create: `zarza_ai/lib/presentation/solicitudes/solicitudes_bloc.dart`

- [ ] **Step 1: Crear el archivo con eventos, estados y BLoC**

Crear `zarza_ai/lib/presentation/solicitudes/solicitudes_bloc.dart`:
```dart
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../core/constants/app_constants.dart';
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import '../../domain/usecases/get_solicitudes_usecase.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class SolicitudesEvent extends Equatable {
  const SolicitudesEvent();
  @override
  List<Object?> get props => [];
}

class SolicitudesLoad extends SolicitudesEvent {
  const SolicitudesLoad({this.estado});
  final EstadoSolicitud? estado;
  @override
  List<Object?> get props => [estado];
}

class SolicitudesLoadMore extends SolicitudesEvent {
  const SolicitudesLoadMore();
}

class SolicitudUpdateEstado extends SolicitudesEvent {
  const SolicitudUpdateEstado({required this.id, required this.estado});
  final String id;
  final EstadoSolicitud estado;
  @override
  List<Object?> get props => [id, estado];
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class SolicitudesState extends Equatable {
  const SolicitudesState();
  @override
  List<Object?> get props => [];
}

class SolicitudesInitial extends SolicitudesState {
  const SolicitudesInitial();
}

class SolicitudesLoading extends SolicitudesState {
  const SolicitudesLoading();
}

class SolicitudesLoaded extends SolicitudesState {
  const SolicitudesLoaded({
    required this.items,
    this.hasMore = false,
    this.page = 1,
  });
  final List<SolicitudEntity> items;
  final bool hasMore;
  final int page;
  @override
  List<Object?> get props => [items, hasMore, page];
}

class SolicitudesLoadingMore extends SolicitudesState {
  const SolicitudesLoadingMore(this.current);
  final List<SolicitudEntity> current;
  @override
  List<Object?> get props => [current];
}

class SolicitudesError extends SolicitudesState {
  const SolicitudesError(this.message);
  final String message;
  @override
  List<Object?> get props => [message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────

class SolicitudesBloc extends Bloc<SolicitudesEvent, SolicitudesState> {
  SolicitudesBloc(this._getSolicitudesUseCase) : super(const SolicitudesInitial()) {
    on<SolicitudesLoad>(_onLoad);
    on<SolicitudesLoadMore>(_onLoadMore);
    on<SolicitudUpdateEstado>(_onUpdateEstado);
  }

  final GetSolicitudesUseCase _getSolicitudesUseCase;
  int _currentPage = 1;
  final List<SolicitudEntity> _items = [];
  EstadoSolicitud? _currentEstado;

  Future<void> _onLoad(
    SolicitudesLoad event,
    Emitter<SolicitudesState> emit,
  ) async {
    emit(const SolicitudesLoading());
    _currentPage = 1;
    _items.clear();
    _currentEstado = event.estado;

    try {
      final result = await _getSolicitudesUseCase(
        page: _currentPage,
        limit: AppConstants.defaultPageSize,
        estado: _currentEstado,
      );
      _items.addAll(result);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e) {
      emit(SolicitudesError('No se pudieron cargar las solicitudes: ${e.toString()}'));
    }
  }

  Future<void> _onLoadMore(
    SolicitudesLoadMore event,
    Emitter<SolicitudesState> emit,
  ) async {
    if (state is! SolicitudesLoaded) return;
    emit(SolicitudesLoadingMore(List.unmodifiable(_items)));
    try {
      _currentPage++;
      final result = await _getSolicitudesUseCase(
        page: _currentPage,
        limit: AppConstants.defaultPageSize,
        estado: _currentEstado,
      );
      _items.addAll(result);
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: result.length == AppConstants.defaultPageSize,
        page: _currentPage,
      ));
    } catch (e) {
      _currentPage--;
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: false,
        page: _currentPage,
      ));
    }
  }

  void _onUpdateEstado(
    SolicitudUpdateEstado event,
    Emitter<SolicitudesState> emit,
  ) {
    final index = _items.indexWhere((s) => s.id == event.id);
    if (index == -1) return;
    _items[index] = _items[index].copyWith(estado: event.estado);
    final current = state;
    if (current is SolicitudesLoaded) {
      emit(SolicitudesLoaded(
        items: List.unmodifiable(_items),
        hasMore: current.hasMore,
        page: current.page,
      ));
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/presentation/solicitudes/solicitudes_bloc.dart
git commit -m "feat(solicitudes): add SolicitudesBloc with load, loadMore and updateEstado"
```

---

## Task 8: SolicitudDetailBloc

**Files:**
- Create: `zarza_ai/lib/presentation/solicitudes/solicitud_detail_bloc.dart`

- [ ] **Step 1: Crear el archivo con eventos, estados y BLoC**

Crear `zarza_ai/lib/presentation/solicitudes/solicitud_detail_bloc.dart`:
```dart
import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import '../../domain/usecases/update_solicitud_estado_usecase.dart';

// ── Events ────────────────────────────────────────────────────────────────────

abstract class SolicitudDetailEvent extends Equatable {
  const SolicitudDetailEvent();
  @override
  List<Object?> get props => [];
}

class SolicitudDetailLoad extends SolicitudDetailEvent {
  const SolicitudDetailLoad(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailMarcarEnProgreso extends SolicitudDetailEvent {
  const SolicitudDetailMarcarEnProgreso();
}

class SolicitudDetailCompletar extends SolicitudDetailEvent {
  const SolicitudDetailCompletar();
}

// ── States ────────────────────────────────────────────────────────────────────

abstract class SolicitudDetailState extends Equatable {
  const SolicitudDetailState();
  @override
  List<Object?> get props => [];
}

class SolicitudDetailInitial extends SolicitudDetailState {
  const SolicitudDetailInitial();
}

class SolicitudDetailLoaded extends SolicitudDetailState {
  const SolicitudDetailLoaded(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailUpdating extends SolicitudDetailState {
  const SolicitudDetailUpdating(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailEstadoActualizado extends SolicitudDetailState {
  const SolicitudDetailEstadoActualizado(this.solicitud);
  final SolicitudEntity solicitud;
  @override
  List<Object?> get props => [solicitud];
}

class SolicitudDetailError extends SolicitudDetailState {
  const SolicitudDetailError({required this.solicitud, required this.message});
  final SolicitudEntity solicitud;
  final String message;
  @override
  List<Object?> get props => [solicitud, message];
}

// ── BLoC ──────────────────────────────────────────────────────────────────────

class SolicitudDetailBloc
    extends Bloc<SolicitudDetailEvent, SolicitudDetailState> {
  SolicitudDetailBloc(this._updateEstadoUseCase)
      : super(const SolicitudDetailInitial()) {
    on<SolicitudDetailLoad>(_onLoad);
    on<SolicitudDetailMarcarEnProgreso>(_onMarcarEnProgreso);
    on<SolicitudDetailCompletar>(_onCompletar);
  }

  final UpdateSolicitudEstadoUseCase _updateEstadoUseCase;
  SolicitudEntity? _current;

  void _onLoad(SolicitudDetailLoad event, Emitter<SolicitudDetailState> emit) {
    _current = event.solicitud;
    emit(SolicitudDetailLoaded(event.solicitud));
  }

  Future<void> _onMarcarEnProgreso(
    SolicitudDetailMarcarEnProgreso event,
    Emitter<SolicitudDetailState> emit,
  ) async {
    if (_current == null) return;
    emit(SolicitudDetailUpdating(_current!));
    try {
      final updated =
          await _updateEstadoUseCase(_current!.id, EstadoSolicitud.EN_PROGRESO);
      _current = updated;
      emit(SolicitudDetailEstadoActualizado(updated));
    } catch (e) {
      emit(SolicitudDetailError(
        solicitud: _current!,
        message: 'No se pudo actualizar: ${e.toString()}',
      ));
    }
  }

  Future<void> _onCompletar(
    SolicitudDetailCompletar event,
    Emitter<SolicitudDetailState> emit,
  ) async {
    if (_current == null) return;
    emit(SolicitudDetailUpdating(_current!));
    try {
      final updated =
          await _updateEstadoUseCase(_current!.id, EstadoSolicitud.COMPLETADO);
      _current = updated;
      emit(SolicitudDetailEstadoActualizado(updated));
    } catch (e) {
      emit(SolicitudDetailError(
        solicitud: _current!,
        message: 'No se pudo completar: ${e.toString()}',
      ));
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/presentation/solicitudes/solicitud_detail_bloc.dart
git commit -m "feat(solicitudes): add SolicitudDetailBloc"
```

---

## Task 9: Shell Widget

**Files:**
- Create: `zarza_ai/lib/presentation/shell/scaffold_with_bottom_nav.dart`

- [ ] **Step 1: Crear el widget `ScaffoldWithBottomNav`**

Crear `zarza_ai/lib/presentation/shell/scaffold_with_bottom_nav.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/user_entity.dart';
import '../../domain/enums/user_role.dart';

class ScaffoldWithBottomNav extends StatelessWidget {
  const ScaffoldWithBottomNav({
    super.key,
    required this.child,
    required this.user,
  });

  final Widget child;
  final UserEntity? user;

  bool get _canSeeSolicitudes =>
      user?.role == UserRole.monitor || user?.role == UserRole.agronomo;

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).uri.path;
    final selectedIndex = _selectedIndex(location);

    return Scaffold(
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        onDestinationSelected: (index) => _onTap(context, index),
        destinations: [
          const NavigationDestination(
            icon: Icon(Icons.home_outlined),
            selectedIcon: Icon(Icons.home_rounded),
            label: 'Inicio',
          ),
          if (_canSeeSolicitudes)
            const NavigationDestination(
              icon: Icon(Icons.assignment_outlined),
              selectedIcon: Icon(Icons.assignment_rounded),
              label: 'Solicitudes',
            ),
          const NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history_rounded),
            label: 'Historial',
          ),
        ],
      ),
    );
  }

  int _selectedIndex(String location) {
    if (_canSeeSolicitudes) {
      if (location.startsWith('/solicitudes')) return 1;
      if (location.startsWith('/history')) return 2;
      return 0;
    } else {
      if (location.startsWith('/history')) return 1;
      return 0;
    }
  }

  void _onTap(BuildContext context, int index) {
    if (_canSeeSolicitudes) {
      switch (index) {
        case 0:
          context.go('/home');
        case 1:
          context.go('/solicitudes');
        case 2:
          context.go('/history');
      }
    } else {
      switch (index) {
        case 0:
          context.go('/home');
        case 1:
          context.go('/history');
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/presentation/shell/scaffold_with_bottom_nav.dart
git commit -m "feat(solicitudes): add ScaffoldWithBottomNav shell widget"
```

---

## Task 10: Router Refactor

**Files:**
- Modify: `zarza_ai/lib/core/router/app_router.dart`

- [ ] **Step 1: Añadir los nuevos imports en `app_router.dart`**

En el bloque de imports existente, añadir:
```dart
import '../../core/auth/auth_state.dart';  // ya existe
import '../../presentation/shell/scaffold_with_bottom_nav.dart';
import '../../presentation/solicitudes/solicitudes_screen.dart';
import '../../presentation/solicitudes/solicitud_detail_screen.dart';
import '../../presentation/solicitudes/solicitudes_bloc.dart';
import '../../core/models/capture_context.dart';
```

- [ ] **Step 2: Reemplazar el bloque de rutas móviles con el ShellRoute**

Encontrar el bloque comentado `// ── Rutas de app móvil normal ──────` y reemplazar todo hasta el bloque `// ── Panel de administración` (exclusive) con:

```dart
      // ── Shell móvil con NavigationBar ────────────────────────────────────
      ShellRoute(
        builder: (context, state, child) {
          final authState = GetIt.I<AuthCubit>().state;
          final user = authState is AuthAuthenticated ? authState.user : null;
          return BlocProvider(
            create: (_) => sl<SolicitudesBloc>()..add(const SolicitudesLoad()),
            child: ScaffoldWithBottomNav(user: user, child: child),
          );
        },
        routes: [
          GoRoute(
            path: '/home',
            builder: (context, state) {
              final authState = GetIt.I<AuthCubit>().state;
              final userId =
                  authState is AuthAuthenticated ? authState.user.id : null;
              return BlocProvider(
                create: (_) =>
                    sl<HistoryBloc>()..add(HistoryLoadEvent(userId: userId)),
                child: const HomeScreen(),
              );
            },
          ),
          GoRoute(
            path: '/solicitudes',
            builder: (context, state) => const SolicitudesScreen(),
          ),
          GoRoute(
            path: '/solicitudes/:id',
            builder: (context, state) {
              final solicitud =
                  state.extra as SolicitudEntity;
              return BlocProvider(
                create: (_) => sl<SolicitudDetailBloc>()
                  ..add(SolicitudDetailLoad(solicitud)),
                child: const SolicitudDetailScreen(),
              );
            },
          ),
          GoRoute(
            path: '/history',
            builder: (context, state) {
              final authState = GetIt.I<AuthCubit>().state;
              final userId =
                  authState is AuthAuthenticated ? authState.user.id : null;
              return BlocProvider(
                create: (_) =>
                    sl<HistoryBloc>()..add(HistoryLoadEvent(userId: userId)),
                child: const HistoryScreen(showAppBar: false),
              );
            },
          ),
        ],
      ),

      // ── Rutas modales (pantalla completa, sin NavigationBar) ─────────────
      GoRoute(
        path: '/capture',
        builder: (context, state) {
          final captureContext = state.extra as CaptureContext?;
          return BlocProvider(
            create: (_) => sl<CaptureBloc>(),
            child: CaptureScreen(captureContext: captureContext),
          );
        },
      ),
      GoRoute(
        path: '/results/:id',
        builder: (context, state) {
          final id = state.pathParameters['id']!;
          return BlocProvider(
            create: (_) => sl<ResultsBloc>()..add(ResultsLoadEvent(id: id)),
            child: const ResultsScreen(),
          );
        },
      ),
      GoRoute(
        path: '/queue',
        builder: (context, state) => const OfflineQueueScreen(),
      ),
```

- [ ] **Step 3: Añadir los imports que faltan en `app_router.dart`**

Verificar que están presentes (añadir si faltan):
```dart
import '../../presentation/solicitudes/solicitud_detail_bloc.dart';
import '../../domain/entities/solicitud_entity.dart';
```

- [ ] **Step 4: Verificar que el proyecto compila sin errores**

```bash
cd zarza_ai
flutter analyze
```

Resultado esperado: 0 errores (puede haber warnings sobre archivos de pantalla no implementados aún — son normales).

- [ ] **Step 5: Commit**

```bash
git add lib/core/router/app_router.dart
git commit -m "feat(solicitudes): refactor router — add mobile ShellRoute with NavigationBar"
```

---

## Task 11: SolicitudesScreen

**Files:**
- Create: `zarza_ai/lib/presentation/solicitudes/solicitudes_screen.dart`

- [ ] **Step 1: Crear la pantalla de lista**

Crear `zarza_ai/lib/presentation/solicitudes/solicitudes_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import 'solicitudes_bloc.dart';

class SolicitudesScreen extends StatelessWidget {
  const SolicitudesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: BlocBuilder<SolicitudesBloc, SolicitudesState>(
        builder: (context, state) {
          if (state is SolicitudesLoading || state is SolicitudesInitial) {
            return const Center(child: CircularProgressIndicator());
          }
          if (state is SolicitudesError) {
            return _ErrorView(
              message: state.message,
              onRetry: () =>
                  context.read<SolicitudesBloc>().add(const SolicitudesLoad()),
            );
          }

          final items = state is SolicitudesLoaded
              ? state.items
              : (state as SolicitudesLoadingMore).current;
          final hasMore = state is SolicitudesLoaded ? state.hasMore : false;

          if (items.isEmpty) return const _EmptyView();

          return RefreshIndicator(
            color: const Color(0xFF69F0AE),
            onRefresh: () async =>
                context.read<SolicitudesBloc>().add(const SolicitudesLoad()),
            child: CustomScrollView(
              slivers: [
                const SliverAppBar(
                  title: Text('Mis solicitudes'),
                  floating: true,
                  pinned: false,
                ),
                SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      if (index == items.length) {
                        return _LoadMoreButton(
                          isLoading: state is SolicitudesLoadingMore,
                          onTap: () => context
                              .read<SolicitudesBloc>()
                              .add(const SolicitudesLoadMore()),
                        );
                      }
                      return _SolicitudCard(solicitud: items[index]);
                    },
                    childCount: items.length + (hasMore ? 1 : 0),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SolicitudCard extends StatelessWidget {
  const _SolicitudCard({required this.solicitud});
  final SolicitudEntity solicitud;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (badgeColor, badgeText) = _badgeForEstado(solicitud.estado);

    String? fechaStr;
    if (solicitud.fechaLimite != null) {
      final f = solicitud.fechaLimite!;
      fechaStr = '${f.day}/${f.month}/${f.year}';
    }

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => context.push('/solicitudes/${solicitud.id}', extra: solicitud),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      solicitud.campoNombre,
                      style: theme.textTheme.titleMedium,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 8),
                  _EstadoBadge(color: badgeColor, label: badgeText),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                solicitud.mensaje,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall!.copyWith(color: Colors.white70),
              ),
              if (fechaStr != null) ...[
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.calendar_today_rounded,
                        size: 13, color: Colors.white38),
                    const SizedBox(width: 4),
                    Text(
                      'Límite: $fechaStr',
                      style: theme.textTheme.labelSmall!
                          .copyWith(color: Colors.white38),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  (Color, String) _badgeForEstado(EstadoSolicitud estado) => switch (estado) {
        EstadoSolicitud.PENDIENTE => (Colors.grey, 'Pendiente'),
        EstadoSolicitud.EN_PROGRESO => (Colors.orange, 'En progreso'),
        EstadoSolicitud.COMPLETADO => (const Color(0xFF4CAF50), 'Completado'),
        EstadoSolicitud.CANCELADO => (Colors.redAccent, 'Cancelado'),
      };
}

class _EstadoBadge extends StatelessWidget {
  const _EstadoBadge({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _LoadMoreButton extends StatelessWidget {
  const _LoadMoreButton({required this.isLoading, required this.onTap});
  final bool isLoading;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: OutlinedButton(
        onPressed: isLoading ? null : onTap,
        style: OutlinedButton.styleFrom(
          side: BorderSide(
              color: const Color(0xFF2E7D32).withValues(alpha: 0.5)),
          minimumSize: const Size.fromHeight(46),
        ),
        child: isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(
                    strokeWidth: 2, color: Color(0xFF69F0AE)),
              )
            : const Text('Cargar más'),
      ),
    );
  }
}

class _EmptyView extends StatelessWidget {
  const _EmptyView();
  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.assignment_outlined, size: 64, color: Colors.white24),
          const SizedBox(height: 16),
          Text(
            'No tienes solicitudes asignadas.',
            style: Theme.of(context)
                .textTheme
                .bodyMedium!
                .copyWith(color: Colors.white38),
          ),
        ],
      ),
    );
  }
}

class _ErrorView extends StatelessWidget {
  const _ErrorView({required this.message, required this.onRetry});
  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.cloud_off_rounded, size: 56, color: Colors.white24),
            const SizedBox(height: 16),
            Text(message,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white54)),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh_rounded),
              label: const Text('Reintentar'),
            ),
          ],
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/presentation/solicitudes/solicitudes_screen.dart
git commit -m "feat(solicitudes): add SolicitudesScreen with paginated list"
```

---

## Task 12: SolicitudDetailScreen

**Files:**
- Create: `zarza_ai/lib/presentation/solicitudes/solicitud_detail_screen.dart`

- [ ] **Step 1: Crear la pantalla de detalle**

Crear `zarza_ai/lib/presentation/solicitudes/solicitud_detail_screen.dart`:
```dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../core/models/capture_context.dart';
import '../../domain/entities/solicitud_entity.dart';
import '../../domain/enums/estado_solicitud.dart';
import 'solicitud_detail_bloc.dart';
import 'solicitudes_bloc.dart';

class SolicitudDetailScreen extends StatelessWidget {
  const SolicitudDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<SolicitudDetailBloc, SolicitudDetailState>(
      listener: (context, state) {
        if (state is SolicitudDetailEstadoActualizado) {
          // Sincronizar la lista del tab de solicitudes
          context.read<SolicitudesBloc>().add(
                SolicitudUpdateEstado(
                  id: state.solicitud.id,
                  estado: state.solicitud.estado,
                ),
              );
        }
        if (state is SolicitudDetailError) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
      },
      builder: (context, state) {
        if (state is SolicitudDetailInitial || state is SolicitudDetailLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final solicitud = switch (state) {
          SolicitudDetailLoaded(solicitud: final s) => s,
          SolicitudDetailUpdating(solicitud: final s) => s,
          SolicitudDetailEstadoActualizado(solicitud: final s) => s,
          SolicitudDetailError(solicitud: final s) => s,
          _ => null,
        };

        if (solicitud == null) return const SizedBox.shrink();
        final isUpdating = state is SolicitudDetailUpdating;

        return Scaffold(
          appBar: AppBar(
            title: Text(solicitud.campoNombre),
            leading: const BackButton(),
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _InfoCard(solicitud: solicitud),
                const SizedBox(height: 24),
                if (!isUpdating)
                  _ActionButtons(solicitud: solicitud)
                else
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: CircularProgressIndicator(),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _InfoCard extends StatelessWidget {
  const _InfoCard({required this.solicitud});
  final SolicitudEntity solicitud;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (badgeColor, badgeText) = _badgeForEstado(solicitud.estado);

    String? fechaStr;
    if (solicitud.fechaLimite != null) {
      final f = solicitud.fechaLimite!;
      fechaStr = '${f.day}/${f.month}/${f.year}';
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.assignment_rounded,
                    color: Color(0xFF4CAF50), size: 20),
                const SizedBox(width: 8),
                Text('Solicitud de muestreo',
                    style: theme.textTheme.labelMedium!
                        .copyWith(color: Colors.white54)),
                const Spacer(),
                _EstadoBadge(color: badgeColor, label: badgeText),
              ],
            ),
            const Divider(height: 24),
            _Row(icon: Icons.location_on_rounded, label: 'Campo', value: solicitud.campoNombre),
            const SizedBox(height: 12),
            _Row(icon: Icons.message_rounded, label: 'Instrucciones', value: solicitud.mensaje),
            if (fechaStr != null) ...[
              const SizedBox(height: 12),
              _Row(icon: Icons.calendar_today_rounded, label: 'Fecha límite', value: fechaStr),
            ],
          ],
        ),
      ),
    );
  }

  (Color, String) _badgeForEstado(EstadoSolicitud estado) => switch (estado) {
        EstadoSolicitud.PENDIENTE => (Colors.grey, 'Pendiente'),
        EstadoSolicitud.EN_PROGRESO => (Colors.orange, 'En progreso'),
        EstadoSolicitud.COMPLETADO => (const Color(0xFF4CAF50), 'Completado'),
        EstadoSolicitud.CANCELADO => (Colors.redAccent, 'Cancelado'),
      };
}

class _Row extends StatelessWidget {
  const _Row({required this.icon, required this.label, required this.value});
  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: Colors.white38),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: theme.textTheme.labelSmall!
                      .copyWith(color: Colors.white38)),
              const SizedBox(height: 2),
              Text(value, style: theme.textTheme.bodyMedium),
            ],
          ),
        ),
      ],
    );
  }
}

class _ActionButtons extends StatelessWidget {
  const _ActionButtons({required this.solicitud});
  final SolicitudEntity solicitud;

  Future<void> _subirAnalisis(BuildContext context) async {
    final result = await context.push<String?>(
      '/capture',
      extra: CaptureContext(
        campoId: solicitud.campoId,
        solicitudId: solicitud.id,
      ),
    );
    if (result != null && context.mounted) {
      context.read<SolicitudDetailBloc>().add(const SolicitudDetailCompletar());
    }
  }

  @override
  Widget build(BuildContext context) {
    final estado = solicitud.estado;

    if (estado == EstadoSolicitud.COMPLETADO ||
        estado == EstadoSolicitud.CANCELADO) {
      return const _ReadOnlyBanner();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (estado == EstadoSolicitud.PENDIENTE)
          OutlinedButton.icon(
            onPressed: () => context
                .read<SolicitudDetailBloc>()
                .add(const SolicitudDetailMarcarEnProgreso()),
            icon: const Icon(Icons.play_arrow_rounded),
            label: const Text('Iniciar'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.orange,
              side:
                  BorderSide(color: Colors.orange.withValues(alpha: 0.5)),
              minimumSize: const Size.fromHeight(50),
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14)),
            ),
          ),
        if (estado == EstadoSolicitud.PENDIENTE) const SizedBox(height: 12),
        ElevatedButton.icon(
          onPressed: () => _subirAnalisis(context),
          icon: const Icon(Icons.camera_alt_rounded),
          label: const Text('Subir análisis'),
          style: ElevatedButton.styleFrom(
            minimumSize: const Size.fromHeight(52),
          ),
        ),
      ],
    );
  }
}

class _ReadOnlyBanner extends StatelessWidget {
  const _ReadOnlyBanner();
  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white10,
        borderRadius: BorderRadius.circular(12),
      ),
      child: const Row(
        children: [
          Icon(Icons.info_outline_rounded, color: Colors.white38, size: 18),
          SizedBox(width: 10),
          Expanded(
            child: Text(
              'Esta solicitud ya no admite cambios.',
              style: TextStyle(color: Colors.white54),
            ),
          ),
        ],
      ),
    );
  }
}

class _EstadoBadge extends StatelessWidget {
  const _EstadoBadge({required this.color, required this.label});
  final Color color;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.5)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 11,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/presentation/solicitudes/solicitud_detail_screen.dart
git commit -m "feat(solicitudes): add SolicitudDetailScreen"
```

---

## Task 13: CaptureScreen Integration

**Files:**
- Modify: `zarza_ai/lib/presentation/capture/capture_screen.dart`

- [ ] **Step 1: Añadir el import de `CaptureContext` en `capture_screen.dart`**

En la sección de imports de `capture_screen.dart`, añadir:
```dart
import '../../core/models/capture_context.dart';
```

- [ ] **Step 2: Añadir `captureContext` como parámetro en `CaptureScreen`**

Cambiar la clase `CaptureScreen` de:
```dart
class CaptureScreen extends StatelessWidget {
  const CaptureScreen({super.key});
```
a:
```dart
class CaptureScreen extends StatelessWidget {
  const CaptureScreen({super.key, this.captureContext});
  final CaptureContext? captureContext;
```

- [ ] **Step 3: Modificar el `BlocListener` de `CaptureScreen`**

El `listener` actual maneja `CaptureSuccess` y `CaptureQueued` siempre de la misma forma. Reemplazar el `BlocListener` completo por:

```dart
return BlocListener<CaptureBloc, CaptureState>(
  listener: (context, state) {
    if (state is CaptureSuccess) {
      if (captureContext?.solicitudId != null) {
        // Viene de solicitud: retornar solicitudId al llamador
        context.pop(captureContext!.solicitudId);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('¡Imagen subida! Procesando análisis…')),
        );
        context.go('/results/${state.result.imageId}');
      }
    }
    if (state is CaptureQueued) {
      if (captureContext?.solicitudId != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Análisis en cola. Marca la solicitud como completada cuando tengas conexión.',
            ),
            duration: Duration(seconds: 5),
          ),
        );
        context.pop(null); // Sin resultado — no se marca COMPLETADO
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
                'Sin conexión — captura guardada. Se subirá al abrir la app.'),
            duration: Duration(seconds: 4),
          ),
        );
        context.go('/home');
      }
    }
    if (state is CaptureFailure) {
      showDialog<void>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Error al subir'),
          content: Text(state.message),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('Cancelar'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(ctx).pop();
                context
                    .read<CaptureBloc>()
                    .add(const CaptureUploadRequested());
              },
              child: const Text('Reintentar'),
            ),
          ],
        ),
      );
    }
  },
```

- [ ] **Step 4: Pasar `captureContext` a `_CaptureBody`**

Cambiar el `BlocBuilder` builder de:
```dart
builder: (context, state) => _CaptureBody(state: state),
```
a:
```dart
builder: (context, state) => _CaptureBody(
  state: state,
  captureContext: captureContext,
),
```

- [ ] **Step 5: Añadir `captureContext` a `_CaptureBody`**

Cambiar:
```dart
class _CaptureBody extends StatefulWidget {
  const _CaptureBody({required this.state});
  final CaptureState state;
```
a:
```dart
class _CaptureBody extends StatefulWidget {
  const _CaptureBody({required this.state, this.captureContext});
  final CaptureState state;
  final CaptureContext? captureContext;
```

- [ ] **Step 6: Pre-llenar el campo desde `captureContext.campoId`**

En `_CaptureBodyState`, añadir la variable `_campoPreloaded`:
```dart
bool _campoPreloaded = false;
```

En el `FutureBuilder<List<CampoEntity>>`, dentro del bloque `if (snapshot.connectionState == ConnectionState.waiting)`, justo después de `final campos = snapshot.data ?? [];`, añadir:

```dart
// Pre-seleccionar campo si viene de una solicitud
if (!_campoPreloaded && widget.captureContext?.campoId != null) {
  _campoPreloaded = true;
  final preselect = campos
      .where((c) => c.id == widget.captureContext!.campoId)
      .firstOrNull;
  if (preselect != null) {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _onCampoSelected(preselect);
    });
  }
}
```

El bloque completo del FutureBuilder builder queda así:
```dart
builder: (context, snapshot) {
  if (snapshot.connectionState == ConnectionState.waiting) {
    return const LinearProgressIndicator();
  }
  final campos = snapshot.data ?? [];

  if (!_campoPreloaded && widget.captureContext?.campoId != null) {
    _campoPreloaded = true;
    final preselect = campos
        .where((c) => c.id == widget.captureContext!.campoId)
        .firstOrNull;
    if (preselect != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _onCampoSelected(preselect);
      });
    }
  }

  return DropdownButtonFormField<CampoEntity>(
    initialValue: _selectedCampo,
    hint: const Text('Selecciona un campo'),
    dropdownColor: const Color(0xFF1E1E1E),
    decoration: InputDecoration(
      labelText: 'Campo',
      prefixIcon: const Icon(Icons.location_on_rounded),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
    ),
    items: campos
        .map((c) => DropdownMenuItem(
              value: c,
              child: Text(c.nombre),
            ))
        .toList(),
    onChanged: _onCampoSelected,
  );
},
```

- [ ] **Step 7: Verificar que el análisis compila sin errores**

```bash
flutter analyze
```

Resultado esperado: 0 errores.

- [ ] **Step 8: Commit final**

```bash
git add lib/presentation/capture/capture_screen.dart
git commit -m "feat(solicitudes): integrate CaptureScreen with CaptureContext for solicitud flow"
```

---

## Verificación final

- [ ] Correr `flutter analyze` y confirmar 0 errores
- [ ] Iniciar el stack con `docker compose up mongo rabbitmq` y `pnpm run start:dev` en `fruit-backend`
- [ ] Lanzar la app en un emulador: `flutter run`
- [ ] Verificar que la `NavigationBar` aparece con las tabs correctas según el rol
- [ ] Verificar que el tab Solicitudes carga la lista correctamente para un MONITOR
- [ ] Verificar que tocar una solicitud abre el detalle
- [ ] Verificar flujo completo: Iniciar → Subir análisis → captura → vuelve al detalle como COMPLETADO
- [ ] Verificar que el badge en la lista también se actualiza a COMPLETADO
- [ ] Verificar que usuarios PRODUCTOR no ven el tab Solicitudes
