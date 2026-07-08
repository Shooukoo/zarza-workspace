import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { Campo } from '../../campos/hooks/useCampos';

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface PopulatedCampo {
  id: string;
  nombre: string;
  codigoCampo: string;
}

export interface PopulatedUser {
  id: string;
  email: string;
}

export interface Solicitud {
  id: string;
  campo: PopulatedCampo;
  asignadoA: PopulatedUser;
  creadoPorId: string;
  mensaje: string;
  estado: EstadoSolicitud;
  fechaLimite: string | null;
  createdAt: string;
}

export interface MonitorOption {
  id: string;
  email: string;
}

/** @deprecated Usar PopulatedCampo / PopulatedUser */
export interface PopulatedRef {
  _id: string;
  nombre?: string;
  codigo_campo?: string;
  email?: string;
}

interface SolicitudesFilters {
  page?: number;
  limit?: number;
  estado?: EstadoSolicitud | '';
  campo_id?: string;
}

interface SolicitudesResponse {
  data: Solicitud[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export function useSolicitudes(filters: SolicitudesFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.campo_id) params.set('campo_id', filters.campo_id);

  return useQuery<SolicitudesResponse>({
    queryKey: ['solicitudes', filters],
    queryFn: () =>
      apiClient
        .get<SolicitudesResponse>(`/solicitudes?${params.toString()}`)
        .then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useCamposOptions() {
  return useQuery<Campo[]>({
    queryKey: ['campos'],
    queryFn: () => apiClient.get<Campo[]>('/campos').then((r) => r.data),
  });
}

export function useMonitores(enabled = false) {
  return useQuery<MonitorOption[]>({
    queryKey: ['admin', 'users', 'MONITOR'],
    queryFn: () =>
      apiClient
        .get<{ data: MonitorOption[] }>('/admin/users?rol=MONITOR&limit=200')
        .then((r) => r.data.data),
    enabled,
  });
}

export function useCreateSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      campo_id: string;
      asignado_a: string;
      mensaje: string;
      fecha_limite?: string;
    }) => apiClient.post<Solicitud>('/solicitudes', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  });
}

export function useUpdateEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoSolicitud }) =>
      apiClient
        .patch<Solicitud>(`/solicitudes/${id}/estado`, { estado })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  });
}
