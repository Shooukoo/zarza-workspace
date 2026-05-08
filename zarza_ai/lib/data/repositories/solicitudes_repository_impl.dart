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
