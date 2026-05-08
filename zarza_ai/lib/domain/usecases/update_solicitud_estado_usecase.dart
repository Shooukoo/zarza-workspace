import '../entities/solicitud_entity.dart';
import '../enums/estado_solicitud.dart';
import '../repositories/i_solicitudes_repository.dart';

class UpdateSolicitudEstadoUseCase {
  const UpdateSolicitudEstadoUseCase(this._repository);
  final ISolicitudesRepository _repository;

  Future<SolicitudEntity> call(String id, EstadoSolicitud estado) =>
      _repository.updateEstado(id, estado);
}
