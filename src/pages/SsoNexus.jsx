import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { setToken } from '@/api/base44Client';
import { resolveSsoRedirect } from '@/lib/ssoRedirect';
import { markAuthViaNexus } from '@/lib/nexusBrain';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import AppLogo from '@/components/layout/AppLogo';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function SsoNexus() {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const token = searchParams.get('token');
    if (!token) {
      setError('Missing SSO token. Please launch this app from EMZI Nexus Brain.');
      return;
    }

    const redirectTo = resolveSsoRedirect(searchParams);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/sso/nexus/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, redirect_to: redirectTo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'SSO verification failed');

        setToken(data.token);
        markAuthViaNexus();

        const dest = data.redirect_to || redirectTo || '/';
        // Full reload so AuthContext picks up the new token (client navigate leaves stale auth state).
        window.location.replace(dest.startsWith('/') ? dest : '/');
      } catch (err) {
        setError(err.message);
        started.current = false;
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm text-center space-y-6">
        <div className="flex justify-center">
          <AppLogo size="lg" />
        </div>

        {error ? (
          <Alert variant="destructive" className="rounded-xl border border-destructive/30 bg-destructive/5 text-left">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Signing you in via EMZI Nexus Brain…</p>
          </div>
        )}
      </div>
    </div>
  );
}
