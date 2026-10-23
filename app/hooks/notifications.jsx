import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadNotificationCount,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/notifications';

const notificationKeys = {
  all: ['notifications'],
  list: (params) => ['notifications', 'list', params],
  unreadCount: ['notifications', 'unread-count'],
  detail: (id) => ['notifications', 'detail', id],
};

// Powers: the notification feed / list screen (infinite scroll).
// Each page returns the paginated payload { content, page, totalPages, ... };
// the screen flattens `data.pages`. Using useInfiniteQuery means only the FIRST
// load flips `isLoading` — subsequent pages surface via `isFetchingNextPage`
// (a bottom-only loader), not a full-screen spinner.
export function useNotifications(params) {
  const { size = 20, unreadOnly = false } = params ?? {};
  return useInfiniteQuery({
    queryKey: notificationKeys.list({ size, unreadOnly }),
    queryFn: async ({ pageParam = 0 }) => {
      const res = await getNotifications({ page: pageParam, size, unreadOnly });
      if (!res.ok) throw new Error(res.message);
      return res.data?.data ?? res.data; // paginated payload
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const total = lastPage?.totalPages ?? 0;
      return allPages.length < total ? allPages.length : undefined;
    },
  });
}

// Powers: the bell icon / badge count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const res = await getUnreadNotificationCount();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
  });
}

// Powers: the single notification detail screen
export function useNotificationById(id) {
  return useQuery({
    queryKey: notificationKeys.detail(id),
    queryFn: async () => {
      const res = await getNotificationById(id);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    enabled: !!id,
  });
}

// Powers: marking one notification read (e.g. on tap/open)
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id) => {
      const res = await markNotificationRead(id);
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

// Powers: the "mark all read" button
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) throw new Error(res.message);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
