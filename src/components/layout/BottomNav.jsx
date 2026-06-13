import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { getDockEntries, isNavActive } from '@/lib/navigation';
import { glassDockStyles } from './glassStyles';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useCompactNav } from '@/hooks/use-mobile';

const dockItemClass =
  'flex flex-col items-center justify-end gap-1 px-2 py-1.5 relative shrink-0 min-w-[3.5rem] h-[3.75rem] transition-colors duration-200 hover:text-foreground';

function DockNavItem({ item, pathname, unreadCount }) {
  const Icon = item.icon;
  const active = isNavActive(item, pathname);
  const label = item.dockLabel || item.label;
  const showBadge = item.badgeKey === 'notifications' && unreadCount > 0;

  return (
    <Link
      to={item.path}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      className={dockItemClass}
    >
      {active && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary rounded-full" aria-hidden />
      )}
      <span className="relative flex h-9 w-9 items-center justify-center">
        <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
        {showBadge && (
          <span className="absolute -top-0.5 -right-1 min-w-[15px] h-[15px] px-0.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-semibold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </span>
      <span
        className={cn(
          'text-[10px] font-medium leading-none truncate max-w-[4.75rem]',
          active ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {label}
      </span>
    </Link>
  );
}

function CenterDockAction({ item, onAction, active }) {
  const Icon = item.icon;
  const label = item.dockLabel || item.label;

  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-pressed={active}
      onClick={() => onAction?.()}
      className={dockItemClass}
    >
      {active && (
        <span className="absolute top-1 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-primary rounded-full" aria-hidden />
      )}
      <span
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
        )}
      >
        <Icon className="h-[18px] w-[18px]" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          'text-[10px] font-medium leading-none truncate max-w-[4.75rem]',
          active ? 'text-primary' : 'text-primary/80'
        )}
      >
        {label}
      </span>
    </button>
  );
}

export default function BottomNav({ user, onOpenBooking, bookingModalOpen }) {
  const { pathname } = useLocation();
  const isCompactNav = useCompactNav();
  const useCompactUserDock = isCompactNav && user?.role === 'user';
  const dockEntries = getDockEntries(user, { hasPermission }, { isCompactNav });
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user);

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          glassDockStyles,
          'pointer-events-auto flex items-stretch gap-0 overflow-x-auto scrollbar-on-hover',
          useCompactUserDock
            ? 'w-full max-w-md justify-between px-1 py-1'
            : 'w-fit max-w-full px-2 py-1.5'
        )}
      >
        {dockEntries.map(entry =>
          entry.kind === 'center' ? (
            <CenterDockAction
              key="book-action"
              item={entry.item}
              onAction={onOpenBooking}
              active={bookingModalOpen}
            />
          ) : (
            <DockNavItem
              key={entry.item.path}
              item={entry.item}
              pathname={pathname}
              unreadCount={unread.count}
            />
          )
        )}
      </div>
    </nav>
  );
}
