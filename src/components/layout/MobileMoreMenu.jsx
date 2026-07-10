import { Link, useLocation } from 'react-router-dom';
import { Sun } from 'lucide-react';
import AppLogo from './AppLogo';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { buildMobileMoreItems, isNavActive } from '@/lib/navigation';
import { glassDialogMutedText, glassDialogPanelStyles } from './glassStyles';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function formatBadgeCount(count) {
  return count > 99 ? '99+' : count;
}

function MoreGridItem({ item, pathname, unreadCount, onNavigate }) {
  const Icon = item.icon;
  const active = isNavActive(item, pathname);
  const showBadge = item.badgeKey === 'notifications' && unreadCount > 0;

  return (
    <Link
      to={item.path}
      onClick={onNavigate}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1.5 rounded-xl py-3 px-1 text-center transition-colors',
        active
          ? 'bg-primary/15 text-primary'
          : 'text-foreground hover:bg-foreground/5'
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {showBadge && (
          <span className="absolute -right-2 -top-1.5 min-w-[16px] h-4 rounded-full bg-destructive px-1 text-[9px] font-bold leading-4 text-destructive-foreground text-center">
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium leading-tight line-clamp-2">{item.label}</span>
    </Link>
  );
}

function MoreGrid({ title, items, pathname, unreadCount, onNavigate }) {
  if (items.length === 0) return null;

  return (
    <div>
      {title && (
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <div className="grid grid-cols-4 gap-1 sm:grid-cols-5">
        {items.map(item => (
          <MoreGridItem
            key={item.path}
            item={item}
            pathname={pathname}
            unreadCount={unreadCount}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Mobile More bottom sheet — overflow routes + theme toggle.
 * Only used below the 768px breakpoint (opened from the dock More tab).
 */
export default function MobileMoreMenu({ user, open, onOpenChange }) {
  const { pathname } = useLocation();
  const { main, admin } = buildMobileMoreItems(user, { hasPermission });
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user);

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideCloseButton
        overlayClassName="bg-black/25 backdrop-blur-sm"
        className={cn(
          'max-h-[85dvh] rounded-t-2xl border-t p-0 flex flex-col gap-0',
          glassDialogPanelStyles
        )}
      >
        <SheetHeader className="border-b border-border/50 px-4 py-4 text-left space-y-0">
          <SheetTitle className="sr-only">More</SheetTitle>
          <AppLogo size="xs" showText textClassName="text-base font-bold tracking-tight" />
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="More">
          <MoreGrid
            items={main}
            pathname={pathname}
            unreadCount={unread.count}
            onNavigate={close}
          />
          <MoreGrid
            title="Admin"
            items={admin}
            pathname={pathname}
            unreadCount={unread.count}
            onNavigate={close}
          />
        </nav>

        <div className="mt-auto border-t border-border/50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sun className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">Dark Mode</p>
              <p className={cn('text-xs mt-1', glassDialogMutedText)}>
                Switch between light and dark themes
              </p>
            </div>
            <ThemeToggle variant="switch" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
