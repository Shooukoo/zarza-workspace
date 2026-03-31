import { Readable } from 'stream';

/**
 * DTO de entrada para la capa de ingesta de imágenes.
 * Representa los datos extraídos de un request multipart.
 * Definido aquí (no en el Pipe) para que el controlador dependa
 * de un contrato de datos, no de un artefacto de NestJS.
 */
export type ParsedMultipartDto = {
  file:       Readable;
  filename:   string;
  mimetype:   string;
  capturedAt: Date | null;
  // V2: trazabilidad geoespacial y sincronización offline
  campoId:        string | null;
  productorId:    string | null;
  gpsLat:         number | null;
  gpsLon:         number | null;
  offlineSyncId:  string | null;
};

