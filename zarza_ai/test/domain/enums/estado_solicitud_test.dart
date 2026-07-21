import 'package:flutter_test/flutter_test.dart';
import 'package:zarza_ai/domain/enums/estado_solicitud.dart';

void main() {
  group('EstadoSolicitud.apiValue', () {
    test('maps each variant to the uppercase value expected by the backend', () {
      expect(EstadoSolicitud.pendiente.apiValue, 'PENDIENTE');
      expect(EstadoSolicitud.enProgreso.apiValue, 'EN_PROGRESO');
      expect(EstadoSolicitud.completado.apiValue, 'COMPLETADO');
      expect(EstadoSolicitud.cancelado.apiValue, 'CANCELADO');
    });
  });

  group('EstadoSolicitud.fromString', () {
    test('parses each uppercase value returned by the backend', () {
      expect(EstadoSolicitud.fromString('PENDIENTE'), EstadoSolicitud.pendiente);
      expect(EstadoSolicitud.fromString('EN_PROGRESO'), EstadoSolicitud.enProgreso);
      expect(EstadoSolicitud.fromString('COMPLETADO'), EstadoSolicitud.completado);
      expect(EstadoSolicitud.fromString('CANCELADO'), EstadoSolicitud.cancelado);
    });

    test('falls back to pendiente on an unknown value', () {
      expect(EstadoSolicitud.fromString('ALGO_DESCONOCIDO'), EstadoSolicitud.pendiente);
    });

    // Regresión: antes se comparaba contra e.name (camelCase), que nunca
    // coincide con lo que manda el backend en mayúsculas.
    test('round-trips through apiValue for every variant', () {
      for (final estado in EstadoSolicitud.values) {
        expect(EstadoSolicitud.fromString(estado.apiValue), estado);
      }
    });
  });
}
