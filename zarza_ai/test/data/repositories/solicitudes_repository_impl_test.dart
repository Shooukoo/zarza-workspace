import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zarza_ai/data/datasources/remote_solicitudes_datasource.dart';
import 'package:zarza_ai/data/models/solicitud_model.dart';
import 'package:zarza_ai/data/repositories/solicitudes_repository_impl.dart';
import 'package:zarza_ai/domain/entities/paginated_list.dart';
import 'package:zarza_ai/domain/enums/estado_solicitud.dart';

class MockRemoteSolicitudesDatasource extends Mock
    implements RemoteSolicitudesDatasource {}

void main() {
  late MockRemoteSolicitudesDatasource datasource;
  late SolicitudesRepositoryImpl repo;

  final model = SolicitudModel(
    id: 'sol-1',
    creadoPor: 'admin@zarza.com',
    asignadoA: 'monitor@zarza.com',
    campoId: 'campo-1',
    campoNombre: 'Huerta Norte',
    mensaje: 'toma fotos',
    estado: EstadoSolicitud.enProgreso,
    createdAt: DateTime(2026, 7, 21),
  );

  setUp(() {
    datasource = MockRemoteSolicitudesDatasource();
    repo = SolicitudesRepositoryImpl(datasource);
  });

  group('updateEstado', () {
    // Regresión: se enviaba estado.name ("enProgreso") en vez del valor
    // en mayúsculas que espera el backend ("EN_PROGRESO"), lo que producía
    // un 400 al presionar "Iniciar" en una solicitud.
    test('sends the uppercase apiValue, not estado.name', () async {
      when(() => datasource.updateEstado('sol-1', 'EN_PROGRESO'))
          .thenAnswer((_) async => model);

      final result =
          await repo.updateEstado('sol-1', EstadoSolicitud.enProgreso);

      verify(() => datasource.updateEstado('sol-1', 'EN_PROGRESO')).called(1);
      expect(result.estado, EstadoSolicitud.enProgreso);
    });
  });

  group('getSolicitudes', () {
    // Mismo bug que updateEstado: el filtro por estado mandaba
    // estado.name ("enProgreso"), que el backend rechaza con 400 porque
    // valida el query param contra los valores en mayúsculas.
    test('filters using the uppercase apiValue, not estado.name', () async {
      when(
        () => datasource.getSolicitudes(
          page: 1,
          limit: 20,
          estado: 'EN_PROGRESO',
        ),
      ).thenAnswer(
        (_) async => PaginatedList(
          items: [model],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasMore: false,
        ),
      );

      final result = await repo.getSolicitudes(
        estado: EstadoSolicitud.enProgreso,
      );

      verify(
        () => datasource.getSolicitudes(
          page: 1,
          limit: 20,
          estado: 'EN_PROGRESO',
        ),
      ).called(1);
      expect(result.items.single.estado, EstadoSolicitud.enProgreso);
    });
  });
}
