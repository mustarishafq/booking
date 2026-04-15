import { db } from '@/api/base44Client';

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

import Sidebar from './Sidebar';

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {});
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar user={user} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-4 lg:px-6 shrink-0">
          <Button variant="ghost" size="icon" className="lg:hidden mr-2" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {user && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary/5 rounded-lg border border-primary/10">
                <span className="text-xs text-muted-foreground">Credits:</span>
                <span className="text-sm font-semibold text-primary">
                  RM{((user.credit_balance_cents || 0) / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet context={{ user, setUser }} />
        </main>
      </div>
    </div>
  );
}