enum EstadoSolicitud {
  pendiente,
  enProgreso,
  completado,
  cancelado;

  static EstadoSolicitud fromString(String value) {
    switch (value) {
      case 'PENDIENTE':
        return EstadoSolicitud.pendiente;
      case 'EN_PROGRESO':
        return EstadoSolicitud.enProgreso;
      case 'COMPLETADO':
        return EstadoSolicitud.completado;
      case 'CANCELADO':
        return EstadoSolicitud.cancelado;
      default:
        return EstadoSolicitud.pendiente;
    }
  }

  String get displayName => switch (this) {
        EstadoSolicitud.pendiente => 'Pendiente',
        EstadoSolicitud.enProgreso => 'En progreso',
        EstadoSolicitud.completado => 'Completado',
        EstadoSolicitud.cancelado => 'Cancelado',
      };
  
  String get apiValue => switch (this) {
    EstadoSolicitud.pendiente => 'PENDIENTE',
    EstadoSolicitud.enProgreso => 'EN_PROGRESO',
    EstadoSolicitud.completado => 'COMPLETADO',
    EstadoSolicitud.cancelado => 'CANCELADO',
  };
}
