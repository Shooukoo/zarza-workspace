import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { AnalisisListResponse } from '../analisis/types';
import type {
  CreateDeteccionPayload,
  Deteccion,
  DeteccionFeedbackPayload,
} from './types';

export function useDetecciones(analysisId: string | null) {
  return useQuery<Deteccion[]>({
    queryKey: ['detecciones', analysisId],
    queryFn: () =>
      apiClient
        .get<Deteccion[]>(`/analyses/${analysisId}/detections`)
        .then((r) => r.data),
    enabled: !!analysisId,
  });
}

export function useAgregarDeteccion(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDeteccionPayload) =>
      apiClient
        .post<Deteccion>(`/analyses/${analysisId}/detections`, payload)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['detecciones', analysisId] }),
  });
}

export function useFeedbackDeteccion(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      detectionId,
      payload,
    }: {
      detectionId: string;
      payload: DeteccionFeedbackPayload;
    }) =>
      apiClient
        .post(
          `/analyses/${analysisId}/detections/${detectionId}/feedback`,
          payload,
        )
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['detecciones', analysisId] }),
  });
}

export function useMarcarRevisado(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.patch(`/analyses/${analysisId}/review`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['detecciones', analysisId] });
      qc.invalidateQueries({ queryKey: ['cola-revision'] });
    },
  });
}

export function useColaRevision(page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    revision_detecciones: 'pendiente',
  });
  return useQuery<AnalisisListResponse>({
    queryKey: ['cola-revision', page, limit],
    queryFn: () =>
      apiClient
        .get<AnalisisListResponse>(`/analyses?${params.toString()}`)
        .then((r) => r.data),
  });
}
