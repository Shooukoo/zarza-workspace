import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { AnalisisHeatmapPoint, CamposHeatmapResponse } from '../types';

export interface DateRange {
  from?: string;
  to?: string;
}

export function useCamposHeatmap(range: DateRange) {
  return useQuery<CamposHeatmapResponse>({
    queryKey: ['mapas-calor', 'campos', range.from ?? null, range.to ?? null],
    queryFn: () =>
      apiClient
        .get<CamposHeatmapResponse>('/mapas-calor/campos', { params: range })
        .then((r) => r.data),
  });
}

export function useAnalisisHeatmap(campoId: string | null, range: DateRange) {
  return useQuery<AnalisisHeatmapPoint[]>({
    queryKey: [
      'mapas-calor',
      'campos',
      campoId,
      'analisis',
      range.from ?? null,
      range.to ?? null,
    ],
    queryFn: () =>
      apiClient
        .get<AnalisisHeatmapPoint[]>(`/mapas-calor/campos/${campoId}/analisis`, {
          params: range,
        })
        .then((r) => r.data),
    enabled: !!campoId,
  });
}
