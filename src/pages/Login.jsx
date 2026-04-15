import React, { useState } from 'react';
import { setToken } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'

  const switchMode = (m) => { setMode(m); setError(''); setForgotSent(false); };

  const redirectAfterLogin = () => {
    const redirect = new URLSearchParams(window.location.search).get('redirect');
    window.location.href = redirect && redirect.startsWith('/') ? redirect : '/';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'forgot') {
        const res = await fetch(`${API_BASE}/auth/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
        setForgotSent(true);
        return;
      }
      const endpoint = mode === 'signup' ? 'register' : 'login';
      const res = await fetch(`${API_BASE}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Request failed');
      if (data.pending) { setPending(true); return; }
      setToken(data.token);
      redirectAfterLogin();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>BookHub</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {pending ? 'Account submitted' : mode === 'forgot' ? 'Reset your password' : mode === 'signup' ? 'Create your account' : 'Sign in to continue'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {pending ? (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                Your account has been created and is <strong>pending admin approval</strong>. You'll be able to sign in once an admin approves your account.
              </p>
              <Button variant="outline" className="w-full" onClick={() => { setPending(false); switchMode('signin'); setEmail(''); setPassword(''); }}>
                Back to Sign In
              </Button>
            </div>
          ) : forgotSent ? (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-muted-foreground">
                If <strong>{email}</strong> is registered, a password reset link has been sent. Check your inbox.
              </p>
              <Button variant="outline" className="w-full" onClick={() => switchMode('signin')}>
                Back to Sign In
              </Button>
            </div>
          ) : (
            <>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
                {mode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password{mode === 'signup' ? ' (min. 8 characters)' : ''}</Label>
                      {mode === 'signin' && (
                        <button type="button" className="text-xs text-primary hover:underline" onClick={() => switchMode('forgot')}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
                </Button>
                {mode === 'forgot' ? (
                  <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => switchMode('signin')}>
                    Back to Sign In
                  </Button>
                ) : (
                  <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}>
                    {mode === 'signup' ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                  </Button>
                )}
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

