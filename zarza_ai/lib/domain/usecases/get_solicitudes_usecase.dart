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
