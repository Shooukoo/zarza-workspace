import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:zarza_ai/data/datasources/remote_solicitudes_datasource.dart';
import 'package:zarza_ai/data/models/solicitud_model.dart';
import 'package:zarza_ai/data/repositories/solicitudes_repository_impl.dart';
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
}
