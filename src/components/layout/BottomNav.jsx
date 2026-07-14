import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { getDockEntries, isNavActive } from '@/lib/navigation';
import { glassDockStyles } from './glassStyles';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useIsMobile } from '@/hooks/use-mobile';
import BookOrbNavItem from './BookOrbNavItem';
import MobileMoreMenu from './MobileMoreMenu';
import UserAvatar from '@/components/UserAvatar';

function formatBadgeCount(count) {
  return count > 99 ? '99+' : count;
}

function DockNavItem({ item, pathname, unreadCount, className, onClick, user }) {
  const Icon = item.icon;
  const active = isNavActive(item, pathname);
  const label = item.dockLabel || item.label;
  const showBadge = item.badgeKey === 'notifications' && unreadCount > 0;
  const isProfile = item.path === '/profile';

  return (
    <Link
      to={item.path}
      title={item.label}
      aria-label={item.label}
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
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
        {isProfile && user ? (
          <UserAvatar user={user} size="xs" className="h-5 w-5" rounded={false} />
        ) : (
          <Icon className="h-5 w-5" />
        )}
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

function MoreDockItem({ item, pathname, unreadCount = 0, active: forcedActive, className, onClick }) {
  const Icon = item.icon;
  const active = forcedActive || isNavActive(item, pathname);
  const label = item.dockLabel || item.label;
  const showBadge = item.badgeKey === 'notifications' && unreadCount > 0;

  return (
    <button
      type="button"
      title={item.label}
      aria-label={item.label}
      aria-expanded={forcedActive}
      onClick={onClick}
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
    </button>
  );
}

/** Desktop/tablet Book action — standard tab styling, not the raised orb */
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
      className={cn(className, active ? 'text-primary' : 'text-muted-foreground hover:text-foreground')}
    >
      {active && (
        <span
          className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary"
          aria-hidden
        />
      )}
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium leading-none">{label}</span>
    </button>
  );
}

export default function BottomNav({ user, onOpenBooking, bookingModalOpen }) {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const [moreOpen, setMoreOpen] = useState(false);
  const dockEntries = getDockEntries(user, { hasPermission }, { isMobile });
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user);

  if (!user || dockEntries.length === 0) return null;

  const dockItemClass = cn(
    'relative flex flex-col items-center justify-center gap-0.5 transition-colors',
    isMobile ? 'flex-1 px-1' : 'min-w-[4.5rem] shrink-0 px-2'
  );

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 overflow-visible pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none"
        aria-label="Main navigation"
      >
        <div className="flex justify-center overflow-visible px-3 sm:px-4">
          <div
            className={cn(
              glassDockStyles,
              'pointer-events-auto flex items-stretch px-1',
              isMobile
                ? 'h-[4.25rem] w-full max-w-lg overflow-visible'
                : 'h-16 w-fit max-w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden'
            )}
          >
            {dockEntries.map(entry => {
              if (entry.kind === 'book-orb') {
                return (
                  <BookOrbNavItem
                    key="book-orb"
                    active={bookingModalOpen}
                    onAction={onOpenBooking}
                    label={entry.item.dockLabel || entry.item.label}
                  />
                );
              }

              if (entry.kind === 'center') {
                return (
                  <CenterDockAction
                    key="book-action"
                    item={entry.item}
                    onAction={onOpenBooking}
                    active={bookingModalOpen}
                    className={dockItemClass}
                  />
                );
              }

              if (entry.kind === 'more') {
                return (
                  <MoreDockItem
                    key="more"
                    item={entry.item}
                    pathname={pathname}
                    unreadCount={unread.count}
                    active={moreOpen || isNavActive(entry.item, pathname)}
                    className={dockItemClass}
                    onClick={() => setMoreOpen(true)}
                  />
                );
              }

              return (
                <DockNavItem
                  key={entry.item.path}
                  item={entry.item}
                  pathname={pathname}
                  unreadCount={unread.count}
                  className={dockItemClass}
                  user={user}
                />
              );
            })}
          </div>
        </div>
      </nav>

      {isMobile && (
        <MobileMoreMenu user={user} open={moreOpen} onOpenChange={setMoreOpen} />
      )}
    </>
  );
}
