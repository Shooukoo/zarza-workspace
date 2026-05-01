import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface Campo {
  _id: string;
  codigo_campo: string;
  nombre: string;
  productor_id: string;
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

export function useProductores() {
  return useQuery<UserOption[]>({
    queryKey: ['admin', 'users', 'PRODUCTOR'],
    queryFn: () =>
      apiClient
        .get<{ data: UserOption[] }>('/admin/users?rol=PRODUCTOR&limit=200')
        .then((r) => r.data.data),
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
