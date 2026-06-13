import { Link, useLocation } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import AppLogo from './AppLogo';
import { cn } from '@/lib/utils';
import { hasPermission } from '@/lib/permissions';
import { getMobileUserSidebarItems, isNavActive } from '@/lib/navigation';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function MobileNavSidebar({ user, open, onOpenChange }) {
  const { pathname } = useLocation();
  const items = getMobileUserSidebarItems(user, { hasPermission });
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user && open);

  if (items.length === 0) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[min(100vw-2rem,280px)] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-6 pb-4 border-b border-border text-left space-y-3">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <AppLogo size="sm" showText textClassName="text-base" />
          {user && (
            <div className="space-y-1">
              <p className="text-sm font-medium truncate">{user.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              {user.user_type !== 'internal' && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-1 bg-primary/5 rounded-lg border border-primary/10">
                  <CreditCard className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">
                    RM{((user.credit_balance_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}
        </SheetHeader>

        <nav className="flex-1 overflow-y-auto py-3 px-3" aria-label="Menu">
          <ul className="space-y-0.5">
            {items.map(item => {
              const Icon = item.icon;
              const active = isNavActive(item, pathname);
              const showBadge = item.badgeKey === 'notifications' && unread.count > 0;

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={() => onOpenChange(false)}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                      active
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span className="relative shrink-0">
                      <Icon className={cn('h-5 w-5', active ? 'text-primary' : 'text-muted-foreground')} />
                      {showBadge && (
                        <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[9px] font-semibold flex items-center justify-center">
                          {unread.count > 9 ? '9+' : unread.count}
                        </span>
                      )}
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
