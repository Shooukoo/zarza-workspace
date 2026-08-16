import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface Campo {
  id: string;
  codigoCampo: string;
  nombre: string;
  productorId: string;
  productor: { id: string; email: string };
  poligonoGps: number[][] | null;
  createdAt: string;
}

export interface UserOption {
  id: string;
  email: string;
}

export function useCampos() {
  return useQuery<Campo[]>({
    queryKey: ['campos'],
    queryFn: () => apiClient.get<Campo[]>('/campos').then((r) => r.data),
  });
}

export function useProductores(enabled = true) {
  return useQuery<UserOption[]>({
    queryKey: ['admin', 'users', 'PRODUCTOR'],
    queryFn: () =>
      apiClient
        .get<{ data: UserOption[] }>('/admin/users?rol=PRODUCTOR&limit=200')
        .then((r) => r.data.data),
    enabled,
  });
}

export function useCreateCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      codigo_campo: string;
      nombre: string;
      productor_id: string;
    }) => apiClient.post<Campo>('/campos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos'] }),
  });
}

export function useDeleteCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/campos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos'] }),
  });
}

export function useUpdateCampoPoligono() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, poligono_gps }: { id: string; poligono_gps: number[][] }) =>
      apiClient
        .patch<Campo>(`/campos/${id}/poligono`, { poligono_gps })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos'] }),
  });
}

export interface AgronomoUser {
  id: string;
  email: string;
  campos_asignados: string[];
}

export function useAgronomosList(enabled = false) {
  return useQuery<AgronomoUser[]>({
    queryKey: ['admin', 'users', 'AGRONOMO'],
    queryFn: () =>
      apiClient
        .get<{ data: AgronomoUser[] }>('/admin/users?rol=AGRONOMO&limit=200')
        .then((r) => r.data.data),
    enabled,
  });
}

export function useAssignAgronomoToCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      campoId,
      newAgronomoId,
      agronoms,
    }: {
      campoId: string;
      newAgronomoId: string | null;
      agronoms: AgronomoUser[];
    }) => {
      const old = agronoms.find((a) => a.campos_asignados.includes(campoId));

      if (old && old.id !== newAgronomoId) {
        const newList = old.campos_asignados.filter((id) => id !== campoId);
        await apiClient.patch(`/admin/users/${old.id}/campos`, {
          campos_ids: newList,
        });
      }

      if (newAgronomoId) {
        const nw = agronoms.find((a) => a.id === newAgronomoId);
        const current = nw?.campos_asignados ?? [];
        if (!current.includes(campoId)) {
          await apiClient.patch(`/admin/users/${newAgronomoId}/campos`, {
            campos_ids: [...current, campoId],
          });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users', 'AGRONOMO'] });
      qc.invalidateQueries({ queryKey: ['campos'] });
    },
  });
}
