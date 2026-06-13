import React, { useState } from 'react';
import { setToken } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ThemeToggle from '@/components/layout/ThemeToggle';
import { Sparkles, Loader2, CheckCircle2, Eye, EyeOff, Mail, Lock, AlertCircle, CalendarCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [mode, setMode] = useState('signin');

  const switchMode = (m) => { setMode(m); setError(''); setForgotSent(false); setShowPassword(false); };

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

  const modeTitle = pending
    ? 'Account Submitted'
    : mode === 'forgot'
    ? 'Forgot Password'
    : mode === 'signup'
    ? 'Create Account'
    : 'Welcome back';

  const modeSubtitle = pending
    ? 'Waiting for admin approval'
    : mode === 'forgot'
     ? "Enter your email and we'll send a reset link"
    : mode === 'signup'
    ? 'Sign up to start booking'
    : 'Sign in to your account to continue';

  return (
    <div className="min-h-screen flex">
      {/* Brand panel — desktop only */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center overflow-hidden bg-[hsl(206,92%,15%)] bg-gradient-to-br from-[hsl(206,92%,25%)] via-[hsl(206,92%,20%)] to-[hsl(206,92%,10%)]">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/3 right-10 w-48 h-48 rounded-full bg-primary/20 blur-2xl" />

        <div className="relative z-10 flex flex-col items-center text-white px-12 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-white/10 backdrop-blur flex items-center justify-center mb-6 shadow-lg">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">BookHub</h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Smart resource booking for modern teams. Manage rooms, equipment, and more — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-4 w-full">
            {[['Rooms', 'Book meeting spaces'], ['Resources', 'Reserve equipment'], ['Teams', 'Manage access']].map(([title, desc]) => (
              <div key={title} className="bg-white/10 ring-1 ring-white/10 rounded-xl p-4 text-left">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-white/50 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col bg-background">
        <div className="flex justify-end p-4 lg:absolute lg:top-4 lg:right-4">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center justify-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">BookHub</span>
          </div>

          <div className="lg:bg-transparent bg-card lg:rounded-none rounded-3xl lg:p-0 p-8 lg:shadow-none shadow-2xl">
            <div className="mb-8">
              <h2 className="text-3xl lg:text-2xl font-bold text-foreground lg:text-left text-center">{modeTitle}</h2>
              <p className="text-sm text-muted-foreground mt-1 lg:text-left text-center">{modeSubtitle}</p>
            </div>

            {!pending && !forgotSent && mode !== 'forgot' && (
              <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all duration-300 ${mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all duration-300 ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Create Account
                </button>
              </div>
            )}

            {pending ? (
              <div className="text-center space-y-5 py-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Account under review</h3>
                  <p className="text-sm text-muted-foreground">
                    Your account is <strong>pending admin approval</strong>. You'll receive an email once an admin approves it.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => { setPending(false); switchMode('signin'); setEmail(''); setPassword(''); }}>
                  Back to Sign In
                </Button>
              </div>
            ) : forgotSent ? (
              <div className="text-center space-y-5 py-6">
                <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Check your inbox</h3>
                  <p className="text-sm text-muted-foreground">
                    If <strong>{email}</strong> is registered, a password reset link has been sent.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => switchMode('signin')}>
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <>
                {error && (
                  <Alert variant="destructive" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="pl-9 h-12 lg:h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                        required
                      />
                    </div>
                  </div>

                  {mode !== 'forgot' && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-medium">
                          Password{mode === 'signup' ? <span className="text-muted-foreground font-normal"> (min. 8 chars)</span> : ''}
                        </Label>
                        {mode === 'signin' && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                            onClick={() => switchMode('forgot')}
                          >
                            Forgot password?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="pl-9 pr-10 h-12 lg:h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors placeholder:text-muted-foreground/50"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(v => !v)}
                          tabIndex={-1}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button type="submit" className="w-full h-12 lg:h-11 font-semibold text-base lg:text-sm shadow-md shadow-primary/20 hover:shadow-primary/30 mt-2" disabled={loading}>
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Please wait…</>
                    ) : mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
                  </Button>

                  {mode === 'forgot' && (
                    <button
                      type="button"
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center mt-1"
                      onClick={() => switchMode('signin')}
                    >
                      ← Back to Sign In
                    </button>
                  )}
                </form>
              </>
            )}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-6 lg:hidden">
            Smart resource booking for modern teams
          </p>
        </div>
        </div>
      </div>
    </div>
  );
}
