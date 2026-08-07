import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type {
  Analysis,
  AnalisisListResponse,
  EstadoValidacion,
  ValidateAnalisisPayload,
} from './types';

export function useAnalisisList(estado: EstadoValidacion, page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    estado,
  });

  return useQuery<AnalisisListResponse>({
    queryKey: ['analisis', estado, page, limit],
    queryFn: () =>
      apiClient
        .get<AnalisisListResponse>(`/analyses?${params.toString()}`)
        .then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useAnalisisDetail(id: string | null) {
  return useQuery<Analysis>({
    queryKey: ['analisis', id],
    queryFn: () =>
      apiClient.get<Analysis>(`/analyses/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useAnalisisImage(id: string | null, enabled = true) {
  return useQuery<{ url: string }>({
    queryKey: ['analisis-image', id],
    queryFn: () =>
      apiClient
        .get<{ url: string }>(`/analyses/${id}/image`)
        .then((r) => r.data),
    enabled: enabled && !!id,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useAnalisisByCampo(campoId: string | null, enabled = true) {
  const params = new URLSearchParams({
    campo_id: campoId ?? '',
    estado: 'all',
    limit: '50',
    page: '1',
  });
  return useQuery<AnalisisListResponse>({
    queryKey: ['analisis', 'byCampo', campoId],
    queryFn: () =>
      apiClient
        .get<AnalisisListResponse>(`/analyses?${params.toString()}`)
        .then((r) => r.data),
    enabled: enabled && !!campoId,
    refetchInterval: 30_000,
  });
}

export function useValidateAnalisis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ValidateAnalisisPayload }) =>
      apiClient
        .patch<Analysis>(`/analyses/${id}/validate`, payload)
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['analisis'] }),
  });
}
