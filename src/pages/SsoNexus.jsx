import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { setToken } from '@/api/base44Client';
import { readRedirectTo, applySsoRedirect } from '@/lib/ssoRedirect';
import { setReturnTo, markSsoLogin } from '@/lib/nexusBrain';
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
      const message = 'Missing SSO token. Please launch this app from EMZI Nexus Brain.';
      setError(message);
      toast.error(message);
      return;
    }

    const redirectTo = readRedirectTo(searchParams);
    const returnTo = searchParams.get('return_to');

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/sso/nexus/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, redirect_to: redirectTo, return_to: returnTo }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'SSO verification failed');

        if (data.return_to) setReturnTo(data.return_to);
        markSsoLogin();

        setToken(data.token);

        window.location.replace(applySsoRedirect(data.redirect_to, '/'));
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
        started.current = false;
      }
    })();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
      <motion.div
        className="w-full max-w-sm text-center space-y-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="flex justify-center">
          <AppLogo size="lg" />
        </div>

        {error ? (
          <div className="space-y-3 text-left">
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">Sign-in failed</p>
            </div>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Signing you in via EMZI Nexus Brain…</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
