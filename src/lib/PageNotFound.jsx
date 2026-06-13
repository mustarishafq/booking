import { db } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1);

  const { data: authData, isFetched } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await db.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-bold tracking-tight text-muted-foreground/30">404</h1>
          <div className="h-0.5 w-16 bg-border mx-auto" />
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Page Not Found</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The page <span className="font-medium text-foreground">"{pageName}"</span> could not be found.
          </p>
        </div>

        {isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-left">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">Admin Note</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This route may not be implemented yet.
                </p>
              </div>
            </div>
          </div>
        )}

        <Button asChild className="gap-2 shadow-md shadow-primary/20">
          <Link to="/">
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </Button>
      </div>
    </div>
  );
}
