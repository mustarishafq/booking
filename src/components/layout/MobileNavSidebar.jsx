import { Link, useLocation } from 'react-router-dom';
import { Sun } from 'lucide-react';
import AppLogo from './AppLogo';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { getSidebarSections, isNavActive } from '@/lib/navigation';
import { glassPanelStyles } from './glassStyles';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

function SidebarNavItem({ item, pathname, unreadCount, onNavigate }) {
  const Icon = item.icon;
  const active = isNavActive(item, pathname);
  const showBadge = item.badgeKey === 'notifications' && unreadCount > 0;

  return (
    <li>
      <Link
        to={item.path}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          active
            ? 'bg-primary/15 text-primary'
            : 'text-foreground hover:bg-foreground/5'
        )}
      >
        <span className="relative shrink-0">
          <Icon className="h-5 w-5 shrink-0" />
          {showBadge && (
            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </span>
        <span className="truncate">{item.label}</span>
      </Link>
    </li>
  );
}

function SidebarNavSection({ title, items, pathname, unreadCount, onNavigate }) {
  if (items.length === 0) return null;

  return (
    <div>
      {title && (
        <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
      )}
      <ul className="space-y-1">
        {items.map(item => (
          <SidebarNavItem
            key={item.path}
            item={item}
            pathname={pathname}
            unreadCount={unreadCount}
            onNavigate={onNavigate}
          />
        ))}
      </ul>
    </div>
  );
}

export default function MobileNavSidebar({ user, open, onOpenChange }) {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const { main, admin } = getSidebarSections(user, { hasPermission }, { isMobile });
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user && open);
  const hasNavItems = main.length > 0 || admin.length > 0;

  if (!hasNavItems) return null;

  const close = () => onOpenChange(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        hideCloseButton
        overlayClassName="bg-black/25 backdrop-blur-sm"
        className={cn(
          'w-[280px] p-0 flex flex-col gap-0 border-r shadow-2xl [&>button]:hidden',
          glassPanelStyles
        )}
      >
        <SheetHeader className="border-b border-border/50 px-4 py-4 text-left space-y-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppLogo size="xs" showText textClassName="text-base font-bold tracking-tight" />
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Menu">
          <SidebarNavSection
            items={main}
            pathname={pathname}
            unreadCount={unread.count}
            onNavigate={close}
          />
          <SidebarNavSection
            title="Admin"
            items={admin}
            pathname={pathname}
            unreadCount={unread.count}
            onNavigate={close}
          />
        </nav>

        <div className="mt-auto border-t border-border/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Sun className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-none">Dark Mode</p>
              <p className="text-xs text-muted-foreground mt-1">Switch between light and dark themes</p>
            </div>
            <ThemeToggle variant="switch" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
