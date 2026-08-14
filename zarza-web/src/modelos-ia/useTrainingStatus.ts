import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { TrainingStatus } from './types';

export function useTrainingStatus() {
  return useQuery<TrainingStatus>({
    queryKey: ['training', 'status'],
    queryFn: () => apiClient.get<TrainingStatus>('/training/status').then((r) => r.data),
    refetchInterval: (query) => (query.state.data?.activeJob ? 15_000 : false),
  });
}

export function useIniciarEntrenamiento() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post<{ jobId: string }>('/training/jobs').then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'status'] }),
  });
}

export function usePromoverVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) =>
      apiClient.post(`/training/jobs/${jobId}/promote`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training', 'status'] }),
  });
}
