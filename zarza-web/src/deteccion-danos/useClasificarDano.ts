import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { DamageClassificationResult } from './types';

export function useClasificarDano() {
  return useMutation({
    mutationFn: (foto: File) => {
      const form = new FormData();
      form.append('file', foto);
      // apiClient trae Content-Type: application/json por defecto. Si lo dejáramos,
      // el transformRequest por defecto de axios detectaría el FormData y, al ver un
      // Content-Type "application/json", lo serializaría con JSON.stringify(...) en vez
      // de mandarlo tal cual (ver axios/lib/defaults/index.js). Forzar aquí
      // 'multipart/form-data' evita esa serialización y deja pasar el FormData intacto.
      // El header que ponemos no es el que termina viajando: en entorno de navegador,
      // axios detecta que el body es FormData y descarta cualquier Content-Type explícito
      // (axios/lib/helpers/resolveConfig.js hace headers.setContentType(undefined)), así
      // que es el propio XHR/fetch del navegador quien agrega el
      // "multipart/form-data; boundary=..." real al enviar la petición.
      return apiClient
        .post<DamageClassificationResult>('/damage-classification', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 60_000,
        })
        .then((r) => r.data);
    },
  });
}

export function mensajeDeErrorClasificacion(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: unknown } } })
    ?.response;
  if (response?.status === 413) return 'La imagen supera el límite de 5 MB.';
  const message = response?.data?.message;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message) && message.length) return message.join(', ');
  if (!response) return 'No se pudo conectar con el servidor. Intenta de nuevo.';
  return 'No se pudo analizar la imagen. Intenta de nuevo.';
}
