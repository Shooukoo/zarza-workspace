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
    final campoRaw = json['campo'] as Map<String, dynamic>?;
    final campoId = campoRaw?['id']?.toString() ?? '';
    final campoNombre = campoRaw?['nombre']?.toString() ?? campoId;

    final asignadoARaw = json['asignadoA'] as Map<String, dynamic>?;
    final asignadoA = asignadoARaw?['email']?.toString() ?? '';

    return SolicitudModel(
      id: (json['id'] ?? '').toString(),
      creadoPor: (json['creadoPorId'] ?? '').toString(),
      asignadoA: asignadoA,
      campoId: campoId,
      campoNombre: campoNombre,
      mensaje: json['mensaje'] as String? ?? '',
      estado: EstadoSolicitud.fromString(json['estado'] as String? ?? 'PENDIENTE'),
      fechaLimite: json['fechaLimite'] != null
          ? DateTime.tryParse(json['fechaLimite'] as String)?.toLocal()
          : null,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String)?.toLocal() ??
              DateTime.now()
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
