import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CalendarCheck, Loader2, CheckCircle2, Eye, EyeOff, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Reset failed');
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center overflow-hidden"
        style={{ background: 'linear-gradient(135deg, hsl(243,75%,52%) 0%, hsl(262,83%,55%) 60%, hsl(291,70%,50%) 100%)' }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />

        <div className="relative z-10 flex flex-col items-center text-white px-12 max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-6 shadow-lg">
            <CalendarCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">BookHub</h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Smart resource booking for modern teams.
          </p>
          <div className="mt-10 bg-white/10 backdrop-blur rounded-2xl p-6 w-full text-left">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-white/80" />
              <span className="font-semibold text-sm">Secure password reset</span>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">
              This link is single-use and expires shortly. Choose a strong password you haven't used before.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <CalendarCheck className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">BookHub</span>
          </div>

          {!token ? (
            <div className="text-center space-y-5 py-6">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-destructive" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Invalid Link</h2>
                <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
              </div>
              <Button className="w-full" onClick={() => navigate('/login')}>Back to Sign In</Button>
            </div>
          ) : done ? (
            <div className="text-center space-y-5 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Password Updated</h2>
                <p className="text-sm text-muted-foreground">Your password has been reset successfully. You can now sign in.</p>
              </div>
              <Button className="w-full" onClick={() => navigate('/login')}>Sign In</Button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-foreground">Set new password</h2>
                <p className="text-muted-foreground mt-1 text-sm">Choose a strong password of at least 8 characters.</p>
              </div>

              {error && (
                <Alert variant="destructive" className="mb-5">
                  <AlertCircle className="w-4 h-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
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
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      className="pl-9 pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowConfirm(v => !v)}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full h-10 text-sm font-semibold mt-2" disabled={loading}>
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Updating…</>
                  ) : 'Reset Password'}
                </Button>
                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors text-center mt-1"
                  onClick={() => navigate('/login')}
                >
                  ← Back to Sign In
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
