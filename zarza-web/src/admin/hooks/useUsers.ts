import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { User } from '../types';
import type { Role } from '../../auth/types';

interface UsersResponse {
  data: User[];
  total: number;
  page: number;
  limit: number;
}

export function useUsers(page: number, rol?: Role) {
  return useQuery<UsersResponse>({
    queryKey: ['admin', 'users', page, rol],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (rol) params.set('rol', rol);
      return apiClient
        .get<UsersResponse>(`/admin/users?${params}`)
        .then((r) => r.data);
    },
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: { email: string; password: string; role: Role; firstName?: string; lastName?: string }) =>
      apiClient.post<User>('/admin/users', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateName() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, firstName, lastName }: { id: string; firstName?: string; lastName?: string }) =>
      apiClient.patch<User>(`/admin/users/${id}/name`, { firstName, lastName }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      apiClient
        .patch<User>(`/admin/users/${id}/role`, { role })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateCampos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, campos_ids }: { id: string; campos_ids: string[] }) =>
      apiClient
        .patch<User>(`/admin/users/${id}/campos`, { campos_ids })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdatePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, password }: { id: string; password: string }) =>
      apiClient.patch(`/admin/users/${id}/password`, { password }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/admin/users/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}
