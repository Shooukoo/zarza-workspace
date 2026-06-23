enum EstadoSolicitud {
  pendiente,
  enProgreso,
  completado,
  cancelado;

  static EstadoSolicitud fromString(String value) {
    return EstadoSolicitud.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EstadoSolicitud.pendiente,
    );
  }

  String get displayName => switch (this) {
        EstadoSolicitud.pendiente => 'Pendiente',
        EstadoSolicitud.enProgreso => 'En progreso',
        EstadoSolicitud.completado => 'Completado',
        EstadoSolicitud.cancelado => 'Cancelado',
      };
}
