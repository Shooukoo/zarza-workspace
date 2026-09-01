import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export function useUpdateOwnProfile() {
  return useMutation({
    mutationFn: (dto: { firstName?: string; lastName?: string }) =>
      apiClient.patch('/auth/profile', dto),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiClient.patch('/auth/password', dto),
  });
}
