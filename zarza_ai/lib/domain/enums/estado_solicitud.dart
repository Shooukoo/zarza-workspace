enum EstadoSolicitud {
  PENDIENTE,
  EN_PROGRESO,
  COMPLETADO,
  CANCELADO;

  static EstadoSolicitud fromString(String value) {
    return EstadoSolicitud.values.firstWhere(
      (e) => e.name == value,
      orElse: () => EstadoSolicitud.PENDIENTE,
    );
  }

  String get displayName => switch (this) {
        EstadoSolicitud.PENDIENTE => 'Pendiente',
        EstadoSolicitud.EN_PROGRESO => 'En progreso',
        EstadoSolicitud.COMPLETADO => 'Completado',
        EstadoSolicitud.CANCELADO => 'Cancelado',
      };
}
