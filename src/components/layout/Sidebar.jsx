import { db } from '@/api/base44Client';

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CalendarDays, LayoutGrid, BookOpen, 
  Users, CreditCard, Receipt, Settings, LogOut, X, Sparkles, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hasPermission, hasAnyPermission } from '@/lib/permissions';
import { Menu } from 'lucide-react';

const navItems = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/' },
  { label: 'Resources',     icon: LayoutGrid,       path: '/resources',    permission: 'view_resources' },
  { label: 'Bookings',      icon: BookOpen,         path: '/bookings',     permission: 'book_resources' },
  { label: 'Calendar',      icon: CalendarDays,     path: '/calendar',     permission: 'view_calendar' },
  { label: 'Credits',       icon: CreditCard,       path: '/credits',      permission: 'top_up_credits',        paymentOnly: true },
  { label: 'Transactions',  icon: Receipt,          path: '/transactions', permission: 'view_own_transactions',  paymentOnly: true },
];

const adminItems = [
  { label: 'Users',                 icon: Users,    path: '/users',    permission: 'view_users' },
  { label: 'Roles & Permissions',  icon: Shield,   path: '/roles',    permission: 'manage_roles' },
  { label: 'Settings',             icon: Settings, path: '/settings', permission: 'manage_settings' },
];

export default function Sidebar({ user, open, onClose, collapsed = false, onToggleCollapse }) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  // A nav item is visible if the user is admin OR has the required permission
  // (no permission key on the item means always visible)
  const isInternal = user?.user_type === 'internal';
  const visibleNavItems = navItems.filter(item =>
    (!item.permission || hasPermission(user, item.permission)) &&
    !(item.paymentOnly && isInternal)
  );

  const visibleAdminItems = adminItems.filter(item =>
    hasPermission(user, item.permission)
  );

  const showAdminSection = isAdmin || visibleAdminItems.length > 0;

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-full bg-card border-r border-border
        flex flex-col transition-all duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
        ${collapsed ? 'lg:w-16' : 'lg:w-64'} w-64
      `}>
        <div className={`h-16 flex items-center border-b border-border shrink-0 ${collapsed ? 'justify-center px-3' : 'px-4 gap-3'}`}>
          <Link to="/" className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </Link>
          {!collapsed && <span className="text-lg font-bold tracking-tight flex-1">BookHub</span>}
          {/* Mobile close button only */}
          <Button variant="ghost" size="icon" className="lg:hidden ml-auto" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-2 space-y-1 overflow-y-auto py-3">
          {!collapsed && <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main</p>}
          {visibleNavItems.map(item => (
            <NavLink key={item.path} item={item} active={location.pathname === item.path} onClick={onClose} collapsed={collapsed} />
          ))}

          {showAdminSection && (
            <>
              <div className="pt-4 pb-2">
                {!collapsed && <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>}
                {collapsed && <div className="border-t border-border mx-1" />}
              </div>
              {(isAdmin ? adminItems : visibleAdminItems).map(item => (
                <NavLink key={item.path} item={item} active={location.pathname === item.path} onClick={onClose} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <Link to="/profile" onClick={onClose} className={`flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-muted transition-colors ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
            )}
          </Link>
          <Button 
            variant="ghost" 
            className={`w-full text-muted-foreground hover:text-destructive ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={() => db.auth.logout()}
          >
            <LogOut className={`w-4 h-4 ${collapsed ? '' : 'mr-2'}`} />
            {!collapsed && 'Sign Out'}
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, active, onClick, collapsed }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
        ${collapsed ? 'justify-center' : ''}
        ${active 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
      `}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && item.label}
    </Link>
  );
}