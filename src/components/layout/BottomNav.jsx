import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { getDockEntries, isNavActive } from '@/lib/navigation';
import { glassDockStyles } from './glassStyles';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useCompactNav, useIsMobile } from '@/hooks/use-mobile';

function formatBadgeCount(count) {
  return count > 99 ? '99+' : count;
}

function DockNavItem({ item, pathname, unreadCount, className }) {
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
      className={cn(
        className,
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      {active && (
        <span
          className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
          aria-hidden
        />
      )}
      <span className="relative flex items-center justify-center">
        <Icon className="h-5 w-5" />
        {showBadge && (
          <span className="absolute -right-2 -top-1.5 min-w-[16px] h-4 rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground text-center">
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </Link>
  );
}

function CenterDockAction({ item, onAction, active, className }) {
  const Icon = item.icon;
  const label = item.dockLabel || item.label;

  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-pressed={active}
      onClick={() => onAction?.()}
      className={cn(className, active ? 'text-primary' : 'text-primary/80 hover:text-primary')}
    >
      {active && (
        <span
          className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
          aria-hidden
        />
      )}
      <span
        className={cn(
          'relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors',
          active
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
        )}
      >
        <Icon className="h-5 w-5" strokeWidth={2.25} />
      </span>
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

export default function BottomNav({ user, onOpenBooking, bookingModalOpen }) {
  const { pathname } = useLocation();
  const isCompactNav = useCompactNav();
  const isMobile = useIsMobile();
  const dockEntries = getDockEntries(user, { hasPermission }, { isCompactNav, isMobile });
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user);

  if (!user || dockEntries.length === 0) return null;

  const dockItemClass = cn(
    'relative flex flex-col items-center justify-center gap-0.5 transition-colors',
    isMobile ? 'flex-1 px-1' : 'min-w-[4.5rem] shrink-0 px-2'
  );

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-3 sm:px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none"
      aria-label="Main navigation"
    >
      <div
        className={cn(
          glassDockStyles,
          'pointer-events-auto flex h-16 items-stretch px-1',
          isMobile
            ? 'w-full max-w-lg justify-between'
            : 'w-fit max-w-full overflow-x-auto scrollbar-on-hover justify-center'
        )}
      >
        {dockEntries.map(entry =>
          entry.kind === 'center' ? (
            <CenterDockAction
              key="book-action"
              item={entry.item}
              onAction={onOpenBooking}
              active={bookingModalOpen}
              className={dockItemClass}
            />
          ) : (
            <DockNavItem
              key={entry.item.path}
              item={entry.item}
              pathname={pathname}
              unreadCount={unread.count}
              className={dockItemClass}
            />
          )
        )}
      </div>
    </nav>
  );
}
