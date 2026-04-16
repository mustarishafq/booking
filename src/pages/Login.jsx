import React, { useState } from 'react';
import { setToken } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'forgot'

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
      {/* Left brand panel – hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(243,75%,52%) 0%, hsl(262,83%,55%) 60%, hsl(291,70%,50%) 100%)' }}>
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute top-1/3 right-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-white px-12 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-6 shadow-lg">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">BookHub</h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Smart resource booking for modern teams. Manage rooms, equipment, and more — all in one place.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6 w-full">
            {[['Rooms', 'Book meeting spaces'], ['Resources', 'Reserve equipment'], ['Teams', 'Manage access']].map(([title, desc]) => (
              <div key={title} className="bg-white/10 backdrop-blur rounded-xl p-4 text-left">
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-white/60 text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">BookHub</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">{modeTitle}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{modeSubtitle}</p>
          </div>

          {/* Tab switcher for signin/signup */}
          {!pending && !forgotSent && mode !== 'forgot' && (
            <div className="flex gap-1 bg-muted rounded-lg p-1 mb-6">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${mode === 'signin' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-all ${mode === 'signup' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Create Account
              </button>
            </div>
          )}

          {pending ? (
            <div className="text-center space-y-5 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
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
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
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
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                {mode !== 'forgot' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">
                        Password{mode === 'signup' ? <span className="text-muted-foreground font-normal"> (min. 8 chars)</span> : ''}
                      </Label>
                      {mode === 'signin' && (
                        <button
                          type="button"
                          className="text-xs text-primary hover:underline font-medium"
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
                        className="pl-9 pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowPassword(v => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full h-10 text-sm font-semibold mt-2" disabled={loading}>
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
      </div>
    </div>
  );
}

