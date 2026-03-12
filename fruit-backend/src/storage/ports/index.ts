/**
 * Barrel file — punto de entrada único para las abstracciones de storage.
 *
 * Importa así:
 *   import { STORAGE_PORT } from './ports';
 *   import type { IStoragePort } from './ports';
 */

// Valor (runtime): token de inyección
export { STORAGE_PORT } from './storage.port';

// Tipo (compile-time): contrato de comportamiento
export type { IStoragePort } from './storage.port';
