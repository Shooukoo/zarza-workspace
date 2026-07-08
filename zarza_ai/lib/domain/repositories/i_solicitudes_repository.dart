import '../entities/paginated_list.dart';
import '../entities/solicitud_entity.dart';
import '../enums/estado_solicitud.dart';

abstract class ISolicitudesRepository {
  Future<PaginatedList<SolicitudEntity>> getSolicitudes({
    int page = 1,
    int limit = 20,
    EstadoSolicitud? estado,
  });

  Future<SolicitudEntity> getById(String id);

  Future<SolicitudEntity> updateEstado(String id, EstadoSolicitud estado);
}
