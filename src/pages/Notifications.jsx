import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import NotificationItem from '@/components/notifications/NotificationItem';
import { useNotifications } from '@/hooks/useNotifications';

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, markRead, markAllRead } = useNotifications(true);
  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleMarkRead = (notification) => {
    if (!notification.read_at) markRead.mutate(notification.id);
  };

  const handleActivate = (notification) => {
    if (notification.link) navigate(notification.link);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Bell}
        title="Notifications"
        description="Booking updates and alerts for your account"
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              className="gap-2 w-full sm:w-auto"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You'll see booking updates here when something happens."
        />
      ) : (
        <div className="space-y-2.5 rounded-2xl border border-border bg-card p-2.5">
          {notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              onActivate={handleActivate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
