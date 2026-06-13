import { Link, useNavigate } from 'react-router-dom';
import { Search, CreditCard, Menu, User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { useCompactNav } from '@/hooks/use-mobile';
import { isMobileUserNav } from '@/lib/navigation';
import { db } from '@/api/base44Client';
import AppLogo from './AppLogo';

export default function TopBar({ user, onMenuOpen }) {
  const navigate = useNavigate();
  const isCompactNav = useCompactNav();
  const showMobileMenu = isCompactNav && isMobileUserNav(user);
  const initials = user?.full_name
    ? user.full_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (user?.email?.[0] || 'U').toUpperCase();

  const handleSearch = (e) => {
    e.preventDefault();
    const q = e.target.search?.value?.trim();
    if (q) navigate(`/resources?search=${encodeURIComponent(q)}`);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-16 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="h-full max-w-[1600px] mx-auto px-4 sm:px-6 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <AppLogo size="sm" showText textClassName="hidden sm:inline" />
        </Link>

        {showMobileMenu && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 shrink-0 lg:hidden"
            onClick={onMenuOpen}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}

        <form onSubmit={handleSearch} className="relative hidden sm:block sm:max-w-md sm:flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            name="search"
            className="pl-9 h-9 bg-muted/50 border-border/60 focus:bg-background transition-colors"
            placeholder="Search resources, bookings…"
          />
        </form>

        <div className="flex-1" />

        {user && user.user_type !== 'internal' && (
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10 shrink-0">
            <CreditCard className="w-3.5 h-3.5 text-primary" />
            <span className="text-sm font-semibold text-primary">
              RM{((user.credit_balance_cents || 0) / 100).toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0">
          <ThemeToggle />

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'hidden lg:inline-flex h-9 w-9 rounded-full p-0',
                    'hover:bg-muted transition-colors'
                  )}
                  aria-label="Account menu"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
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
          )}
        </div>
      </div>
    </header>
  );
}
