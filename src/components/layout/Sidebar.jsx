import { db } from '@/api/base44Client';

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, CalendarDays, LayoutGrid, BookOpen, 
  Users, CreditCard, Receipt, Settings, LogOut, X, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Resources', icon: LayoutGrid, path: '/resources' },
  { label: 'Bookings', icon: BookOpen, path: '/bookings' },
  { label: 'Calendar', icon: CalendarDays, path: '/calendar' },
  { label: 'Credits', icon: CreditCard, path: '/credits' },
  { label: 'Transactions', icon: Receipt, path: '/transactions' },
];

const adminItems = [
  { label: 'Users', icon: Users, path: '/users' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar({ user, open, onClose }) {
  const location = useLocation();
  const isAdmin = user?.role === 'admin';

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={onClose} />
      )}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border
        flex flex-col transition-transform duration-300
        lg:translate-x-0 lg:static lg:z-auto
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">BookHub</span>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Main</p>
          {navItems.map(item => (
            <NavLink key={item.path} item={item} active={location.pathname === item.path} onClick={onClose} />
          ))}
          
          {isAdmin && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Admin</p>
              </div>
              {adminItems.map(item => (
                <NavLink key={item.path} item={item} active={location.pathname === item.path} onClick={onClose} />
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border">
          <Link to="/profile" onClick={onClose} className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg hover:bg-muted transition-colors">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </Link>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-muted-foreground hover:text-destructive"
            onClick={() => db.auth.logout()}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavLink({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
        ${active 
          ? 'bg-primary text-primary-foreground shadow-sm' 
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
      `}
    >
      <Icon className="w-4 h-4" />
      {item.label}
    </Link>
  );
}