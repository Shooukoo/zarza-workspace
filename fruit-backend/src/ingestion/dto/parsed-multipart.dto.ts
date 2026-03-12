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
};
