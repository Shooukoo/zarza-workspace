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
