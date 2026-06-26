import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CheckCheck, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { glassPanelStyles } from '@/components/layout/glassStyles';
import { useNotifications } from '@/hooks/useNotifications';
import { isCriticalNotification } from '@/lib/notificationVisuals';
import NotificationItem from './NotificationItem';

export default function NotificationPanel({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const { data: notifications = [], isLoading, markRead, markAllRead } = useNotifications(open);

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') return notifications.filter(n => !n.read_at);
    if (filter === 'critical') return notifications.filter(isCriticalNotification);
    return notifications;
  }, [notifications, filter]);

  const handleMarkRead = (notification) => {
    if (!notification.is_read && !notification.read_at) {
      markRead.mutate(notification.id);
    }
  };

  const handleActivate = (notification) => {
    onOpenChange(false);
    if (notification.action_url) navigate(notification.action_url);
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            className={cn(
              'fixed right-0 top-0 bottom-0 z-[61] flex w-full max-w-md flex-col',
              'rounded-bl-2xl border-l sm:rounded-none',
              glassPanelStyles
            )}
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex items-center justify-between border-b border-border/50 p-4">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => markAllRead.mutate()}
                    disabled={markAllRead.isPending}
                  >
                    <CheckCheck className="mr-1 h-3.5 w-3.5" />
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close notifications"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="px-4 pt-3">
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList className="h-9 w-full bg-muted/50 text-foreground/60">
                  <TabsTrigger value="all" className="flex-1 text-xs data-[state=active]:text-foreground">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="flex-1 text-xs data-[state=active]:text-foreground">
                    Unread
                  </TabsTrigger>
                  <TabsTrigger value="critical" className="flex-1 text-xs data-[state=active]:text-foreground">
                    Critical
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1 px-3 py-2">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <Bell className="mb-3 h-10 w-10 opacity-30" />
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="mt-1 text-xs text-foreground/60 dark:text-muted-foreground">You&apos;re all caught up!</p>
                </div>
              ) : (
                <div className="space-y-2.5 pb-2">
                  {filteredNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                      onActivate={handleActivate}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="border-t border-border/50 p-3">
              <Button variant="outline" className="h-9 w-full text-sm" asChild>
                <Link to="/notifications" onClick={() => onOpenChange(false)}>
                  View All Notifications
                </Link>
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
