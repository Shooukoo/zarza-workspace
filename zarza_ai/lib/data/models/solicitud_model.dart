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
