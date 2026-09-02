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

export function useRevokeOtherSessions() {
  return useMutation({
    mutationFn: () => apiClient.post('/auth/sessions/revoke-all'),
  });
}

export function useUpdateNotificationPreferences() {
  return useMutation({
    mutationFn: (dto: { pushNotificationsEnabled: boolean }) =>
      apiClient.patch('/auth/notification-preferences', dto),
  });
}
