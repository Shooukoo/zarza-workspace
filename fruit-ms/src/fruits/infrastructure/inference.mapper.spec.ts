import { InferenceMapper } from './inference.mapper';
import { AnalysisResponseDto } from '../dto/analysis-response.dto';
import type { UserSnapshot } from '../domain/analysis.entity';

describe('InferenceMapper', () => {
  const requester: UserSnapshot = {
    userId: 'user-1',
    email: 'user@example.com',
  };

  const validDto: AnalysisResponseDto = {
    image_id: 'image-1',
    variedad: 'Hass',
    fecha_analisis: '2026-08-09T12:00:00.000Z',
    metricas_salud: {
      total_elementos_detectados: 10,
      elementos_sanos: 8,
      elementos_enfermos: 2,
      porcentaje_merma_general: 20,
    },
    proyeccion_financiera: {
      peso_sano_gramos: 1500,
    },
    cronograma_fenologico: [
      {
        etapa: 'Floración',
        cantidad: 5,
        prediccion: {
          cambio_a: 'Fruto',
          en_dias: 10,
          dias_para_cosecha: 60,
        },
      },
    ],
    detecciones: [
      {
        clase: 'naranja',
        etapa: 'naranja',
        sano: true,
        confidence: 0.87,
        bbox: [10, 20, 30, 40],
      },
    ],
  };

  describe('mapeo básico', () => {
    it('convierte correctamente un DTO completo a AnalysisDomain', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage/key/image-1.jpg',
        requester,
      );

      expect(result).toEqual({
        image_id: 'storage/key/image-1.jpg',
        storage_key: 'storage/key/image-1.jpg',
        requester,
        variedad: 'Hass',
        fecha_analisis: new Date('2026-08-09T12:00:00.000Z'),
        metricas_salud: {
          total_elementos_detectados: 10,
          elementos_sanos: 8,
          elementos_enfermos: 2,
          porcentaje_merma_general: 20,
        },
        proyeccion_financiera: {
          peso_sano_gramos: 1500,
        },
        cronograma_fenologico: [
          {
            etapa: 'Floración',
            cantidad: 5,
            prediccion: {
              cambio_a: 'Fruto',
              en_dias: 10,
              dias_para_cosecha: 60,
            },
          },
        ],
        detecciones: [
          {
            clase: 'naranja',
            etapa: 'naranja',
            sano: true,
            confidence: 0.87,
            bbox: [10, 20, 30, 40],
          },
        ],
        campo_id: null,
        productor_id: 'user-1',
        ubicacion_gps: null,
        offline_sync_id: null,
        validacion_experto: null,
      });
    });

    it('convierte fecha_analisis de string a Date', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
      );

      expect(result.fecha_analisis).toBeInstanceOf(Date);
      expect(result.fecha_analisis.toISOString()).toBe(
        '2026-08-09T12:00:00.000Z',
      );
    });

    it('usa null cuando variedad es undefined', () => {
      const dto = {
        ...validDto,
        variedad: undefined,
      } as AnalysisResponseDto;

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.variedad).toBeNull();
    });
  });

  describe('contexto V2', () => {
    it('crea la ubicación GeoJSON cuando existen latitud y longitud', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
        {
          gpsLat: 19.4326,
          gpsLon: -99.1332,
        },
      );

      expect(result.ubicacion_gps).toEqual({
        type: 'Point',
        coordinates: [-99.1332, 19.4326],
      });
    });

    it('no crea ubicación cuando falta la longitud', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
        {
          gpsLat: 19.4326,
        },
      );

      expect(result.ubicacion_gps).toBeNull();
    });

    it('no crea ubicación cuando falta la latitud', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
        {
          gpsLon: -99.1332,
        },
      );

      expect(result.ubicacion_gps).toBeNull();
    });

    it('usa productorId del contexto cuando está disponible', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
        {
          productorId: 'producer-1',
        },
      );

      expect(result.productor_id).toBe('producer-1');
    });

    it('usa requester.userId cuando no existe productorId', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
        {
          productorId: null,
        },
      );

      expect(result.productor_id).toBe('user-1');
    });

    it('conserva campoId y offlineSyncId del contexto', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
        {
          campoId: 'campo-1',
          offlineSyncId: 'offline-123',
        },
      );

      expect(result.campo_id).toBe('campo-1');
      expect(result.offline_sync_id).toBe('offline-123');
    });

    it('establece validacion_experto como null', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
      );

      expect(result.validacion_experto).toBeNull();
    });
  });

  describe('cronograma fenológico', () => {
    it('mapea todas las etapas y sus predicciones', () => {
      const dto = {
        ...validDto,
        cronograma_fenologico: [
          {
            etapa: 'Floración',
            cantidad: 5,
            prediccion: {
              cambio_a: 'Fruto',
              en_dias: 10,
              dias_para_cosecha: 60,
            },
          },
          {
            etapa: 'Fruto',
            cantidad: 8,
            prediccion: {
              cambio_a: 'Maduración',
              en_dias: 20,
              dias_para_cosecha: 40,
            },
          },
        ],
      };

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.cronograma_fenologico).toEqual([
        {
          etapa: 'Floración',
          cantidad: 5,
          prediccion: {
            cambio_a: 'Fruto',
            en_dias: 10,
            dias_para_cosecha: 60,
          },
        },
        {
          etapa: 'Fruto',
          cantidad: 8,
          prediccion: {
            cambio_a: 'Maduración',
            en_dias: 20,
            dias_para_cosecha: 40,
          },
        },
      ]);
    });

    it('devuelve un arreglo vacío cuando no hay etapas', () => {
      const dto = {
        ...validDto,
        cronograma_fenologico: [],
      };

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.cronograma_fenologico).toEqual([]);
    });
  });

  describe('detecciones', () => {
    it('mapea clase, etapa, sano, confidence y bbox', () => {
      const result = InferenceMapper.toDomain(
        validDto,
        'storage-key',
        requester,
      );

      expect(result.detecciones).toEqual([
        {
          clase: 'naranja',
          etapa: 'naranja',
          sano: true,
          confidence: 0.87,
          bbox: [10, 20, 30, 40],
        },
      ]);
    });

    it('devuelve un arreglo vacío cuando no hay detecciones', () => {
      const dto = { ...validDto, detecciones: [] };

      const result = InferenceMapper.toDomain(dto, 'storage-key', requester);

      expect(result.detecciones).toEqual([]);
    });
  });
});
