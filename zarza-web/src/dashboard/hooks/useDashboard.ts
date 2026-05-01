import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface YieldPoint {
  daysToHarvest: number;
  estimatedWeightGrams: number;
}

export interface HealthMetrics {
  avgLossPercent: number;
  totalSickCount: number;
  totalHealthyCount: number;
  totalDetected: number;
}

export interface PhenologyPoint {
  stage: string;
  count: number;
}

export function useYieldForecast() {
  return useQuery<YieldPoint[]>({
    queryKey: ['dashboard', 'yield'],
    queryFn: () =>
      apiClient
        .get<YieldPoint[]>('/admin/dashboard/yield')
        .then((r) => r.data),
  });
}

export function useHealthMetrics() {
  return useQuery<HealthMetrics>({
    queryKey: ['dashboard', 'health'],
    queryFn: () =>
      apiClient
        .get<HealthMetrics>('/admin/dashboard/health')
        .then((r) => r.data),
  });
}

export function usePhenologyDistribution() {
  return useQuery<PhenologyPoint[]>({
    queryKey: ['dashboard', 'phenology'],
    queryFn: () =>
      apiClient
        .get<PhenologyPoint[]>('/admin/dashboard/phenology')
        .then((r) => r.data),
  });
}
