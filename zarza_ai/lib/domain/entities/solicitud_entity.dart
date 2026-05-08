import 'package:equatable/equatable.dart';
import '../enums/estado_solicitud.dart';

class SolicitudEntity extends Equatable {
  const SolicitudEntity({
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

  SolicitudEntity copyWith({EstadoSolicitud? estado}) => SolicitudEntity(
        id: id,
        creadoPor: creadoPor,
        asignadoA: asignadoA,
        campoId: campoId,
        campoNombre: campoNombre,
        mensaje: mensaje,
        estado: estado ?? this.estado,
        fechaLimite: fechaLimite,
        createdAt: createdAt,
      );

  @override
  List<Object?> get props => [id, creadoPor, asignadoA, campoId, campoNombre, mensaje, estado, fechaLimite, createdAt];
}
