import { cn } from '@/lib/utils';
import {
  getNotificationCategoryIcon,
  getNotificationPriorityVisual,
} from '@/lib/notificationVisuals';

export default function NotificationVisualBadges({ notification }) {
  const CategoryIcon = getNotificationCategoryIcon(notification.category);
  const priorityVisual = getNotificationPriorityVisual(notification.priority);
  const showPriority = notification.priority === 'high' || notification.priority === 'critical';

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {notification.category && (
        <span className="inline-flex items-center gap-1 rounded border border-border/50 bg-background/90 px-1.5 py-0.5 text-[10px] font-medium text-foreground/80 dark:bg-muted dark:text-muted-foreground">
          <CategoryIcon className="h-2.5 w-2.5" />
          <span className="capitalize">{notification.category}</span>
        </span>
      )}
      {notification.system_id && (
        <span className="rounded border border-border/40 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] text-foreground/70 dark:bg-muted/80 dark:text-muted-foreground">
          {notification.system_id}
        </span>
      )}
      {showPriority && (
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
            priorityVisual.color,
            priorityVisual.bg
          )}
        >
          {notification.priority}
        </span>
      )}
    </div>
  );
}
