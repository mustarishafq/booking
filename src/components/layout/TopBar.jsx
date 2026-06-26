import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Menu, User, LogOut, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GlobalSearch from './GlobalSearch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ThemeToggle from './ThemeToggle';
import { cn } from '@/lib/utils';
import { glassPanelStyles } from './glassStyles';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { hasPermission } from '@/lib/permissions';
import { getSidebarItems, isAdminNav, isMobileUserNav } from '@/lib/navigation';
import { db } from '@/api/base44Client';
import NotificationPanel from '@/components/notifications/NotificationPanel';

function formatBadgeCount(count) {
  return count > 99 ? '99+' : count;
}

export default function TopBar({ user, onMenuOpen, embedded = false }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const isMobile = useIsMobile();
  const sidebarItems = user ? getSidebarItems(user, { hasPermission }, { isMobile }) : [];
  const showUserMobileMenu = isMobile && isMobileUserNav(user);
  const showAdminMenu = isMobile && isAdminNav(user) && sidebarItems.length > 0;
  const showMenuButton = showUserMobileMenu || showAdminMenu;
  const { data: unread = { count: 0 } } = useUnreadNotificationCount(!!user && !isMobile);
  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <header
      className={cn(
        'h-16 border-b transition-all duration-200',
        glassPanelStyles,
        embedded ? 'w-full' : 'fixed top-0 left-0 right-0 z-30'
      )}
    >
      <div className="h-full max-w-[1600px] mx-auto px-6 flex items-center gap-3">
        {showMenuButton && (
          <button
            type="button"
            className="p-2 rounded-lg hover:bg-muted transition-colors lg:hidden shrink-0"
            onClick={onMenuOpen}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </button>
        )}

        <div className="flex-1 min-w-0">
          <GlobalSearch user={user} />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {user && user.user_type !== 'internal' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 shrink-0 mr-1">
              <CreditCard className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-semibold text-primary">
                RM{((user.credit_balance_cents || 0) / 100).toFixed(2)}
              </span>
            </div>
          )}

          <ThemeToggle />

          {!isMobile && user && (
            <>
              <button
                type="button"
                className="relative p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(prev => !prev)}
              >
                <Bell className="h-5 w-5" />
                {unread.count > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center px-0.5">
                    {formatBadgeCount(unread.count)}
                  </span>
                )}
              </button>

              <NotificationPanel open={notificationsOpen} onOpenChange={setNotificationsOpen} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="hidden lg:flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted h-auto transition-colors"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarFallback className="rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:flex flex-col items-start text-left">
                      <span className="text-sm font-medium leading-none">{user.full_name || user.email}</span>
                      <span className="text-xs text-muted-foreground capitalize">{user.role}</span>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/profile">
                      <User />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => db.auth.logout()}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
