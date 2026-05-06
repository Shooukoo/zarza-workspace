import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type {
  Analysis,
  AnalisisListResponse,
  ValidateAnalisisPayload,
} from './types';

export function useAnalisisList(validado: boolean | 'all', page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    validado: validado === 'all' ? 'all' : String(validado),
  });

  return useQuery<AnalisisListResponse>({
    queryKey: ['analisis', validado, page, limit],
    queryFn: () =>
      apiClient
        .get<AnalisisListResponse>(`/analyses?${params.toString()}`)
        .then((r) => r.data),
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

export function useAnalisisImage(id: string | null) {
  return useQuery<{ url: string }>({
    queryKey: ['analisis-image', id],
    queryFn: () =>
      apiClient
        .get<{ url: string }>(`/analyses/${id}/image`)
        .then((r) => r.data),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
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
