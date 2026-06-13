import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/notificationsApi';

export function useUnreadNotificationCount(enabled = true) {
  return useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => notificationsApi.unreadCount(),
    enabled,
    refetchInterval: 30000,
  });
}

export function useNotifications(enabled = true) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list(),
    enabled,
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  return { ...listQuery, markRead, markAllRead };
}
