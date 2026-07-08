import '../entities/solicitud_entity.dart';
import '../repositories/i_solicitudes_repository.dart';

class GetSolicitudByIdUseCase {
  const GetSolicitudByIdUseCase(this._repository);
  final ISolicitudesRepository _repository;

  Future<SolicitudEntity> call(String id) => _repository.getById(id);
}
