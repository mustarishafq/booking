import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { useNotifications } from '@/hooks/useNotifications';

export default function Notifications() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading, markRead, markAllRead } = useNotifications(true);
  const unreadCount = notifications.filter(n => !n.read_at).length;

  const handleClick = (n) => {
    if (!n.read_at) markRead.mutate(n.id);
    if (n.link) navigate(n.link);
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
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notifications yet"
          description="You'll see booking updates here when something happens."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <Card
              key={n.id}
              className={cn(
                'rounded-2xl border border-border cursor-pointer transition-all duration-300',
                'hover:shadow-md hover:shadow-primary/5',
                !n.read_at && 'border-primary/20 bg-primary/5'
              )}
              onClick={() => handleClick(n)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold leading-snug">{n.title}</p>
                    {n.body && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-2">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  {!n.read_at && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" aria-hidden />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
