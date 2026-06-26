import { formatDistanceToNow } from 'date-fns';
import { BellOff, Check, Clock, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { normalizeNotification } from '@/lib/notificationVisuals';
import NotificationVisualBadges from './NotificationVisualBadges';

export default function NotificationItem({
  notification: rawNotification,
  onActivate,
  onMarkRead,
}) {
  const notification = normalizeNotification(rawNotification);
  const isUnread = !notification.is_read;
  const { typeVisual } = notification;
  const TypeIcon = typeVisual.Icon;

  const handleActivate = () => {
    if (isUnread && onMarkRead) onMarkRead(notification);
    if (onActivate) onActivate(notification);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={cn(
        'group relative flex cursor-pointer gap-3 rounded-xl border p-3.5 transition-all duration-200',
        isUnread
          ? cn(
              typeVisual.bg,
              typeVisual.border,
              'shadow-sm ring-1 ring-black/[0.05] dark:ring-white/[0.08]',
              'hover:opacity-95'
            )
          : cn(
              'border-border bg-card/70 shadow-sm dark:bg-muted/30',
              'hover:border-border/90 hover:bg-muted/40 dark:hover:bg-muted/50'
            )
      )}
    >
      <div
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/[0.06] dark:border-white/10',
          typeVisual.bg
        )}
      >
        <TypeIcon className={cn('h-[18px] w-[18px]', typeVisual.color)} />
      </div>

      <div className="min-w-0 flex-1 pr-6">
        <div className="flex items-start gap-2">
          <p
            className={cn(
              'min-w-0 flex-1 text-sm leading-snug text-foreground',
              isUnread ? 'font-semibold' : 'font-medium'
            )}
          >
            {notification.title}
          </p>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
                aria-label="Notification actions"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40" onClick={(e) => e.stopPropagation()}>
              {isUnread && (
                <DropdownMenuItem
                  onClick={() => onMarkRead?.(notification)}
                >
                  <Check />
                  Mark as read
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => toast.info('Snooze is not available yet')}>
                <Clock />
                Snooze 1hr
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => toast.info('Dismiss is not available yet')}
              >
                <BellOff />
                Dismiss
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {notification.body && (
          <p className="mt-0.5 line-clamp-2 text-xs text-foreground/75 dark:text-muted-foreground">
            {notification.body}
          </p>
        )}

        <div className="flex items-end gap-2">
          <NotificationVisualBadges notification={notification} />
          <span className="ml-auto shrink-0 text-[10px] text-foreground/60 dark:text-muted-foreground">
            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {isUnread && (
        <span
          className={cn('absolute right-3.5 top-3.5 h-2 w-2 rounded-full', typeVisual.dot)}
          aria-hidden
        />
      )}
    </div>
  );
}
