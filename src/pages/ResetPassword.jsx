import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import ThemeToggle from '@/components/layout/ThemeToggle';
import AppLogo from '@/components/layout/AppLogo';
import { APP_NAME } from '@/lib/appConfig';
import { Loader2, CheckCircle2, Eye, EyeOff, Lock, AlertCircle, ShieldCheck } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { toast.error('Passwords do not match.'); return; }
    setLoading(true);
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
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col items-center justify-center overflow-hidden bg-[hsl(206,92%,15%)] bg-gradient-to-br from-[hsl(206,92%,25%)] via-[hsl(206,92%,20%)] to-[hsl(206,92%,10%)]">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-[28rem] h-[28rem] rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex flex-col items-center text-white px-12 max-w-md text-center">
          <div className="mb-6 shadow-lg">
            <AppLogo size="lg" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight mb-3">{APP_NAME}</h1>
          <p className="text-white/60 text-lg leading-relaxed">
            Smart resource booking for modern teams.
          </p>
          <div className="mt-10 bg-white/10 ring-1 ring-white/10 rounded-2xl p-6 w-full text-left">
            <div className="flex items-center gap-3 mb-3">
              <ShieldCheck className="w-5 h-5 text-white/80" />
              <span className="font-semibold text-sm">Secure password reset</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              This link is single-use and expires shortly. Choose a strong password you haven't used before.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
        <div className="flex justify-end p-4 lg:absolute lg:top-4 lg:right-4">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <motion.div
            className="w-full max-w-md"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex lg:hidden items-center justify-center mb-8">
              <AppLogo size="sm" showText textClassName="text-lg" />
            </div>

            <div className="lg:bg-transparent bg-card lg:rounded-none rounded-3xl lg:p-0 p-8 lg:shadow-none shadow-2xl">
              {!token ? (
                <div className="text-center space-y-5 py-6">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Invalid Link</h2>
                    <p className="text-sm text-muted-foreground">This password reset link is invalid or has expired.</p>
                  </div>
                  <Button className="w-full shadow-md shadow-primary/20" onClick={() => navigate('/login')}>Back to Sign In</Button>
                </div>
              ) : done ? (
                <div className="text-center space-y-5 py-6">
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-1">Password Updated</h2>
                    <p className="text-sm text-muted-foreground">Your password has been reset successfully. You can now sign in.</p>
                  </div>
                  <Button className="w-full shadow-md shadow-primary/20" onClick={() => navigate('/login')}>Sign In</Button>
                </div>
              ) : (
                <>
                  <div className="mb-8">
                    <h2 className="text-3xl lg:text-2xl font-bold text-foreground lg:text-left text-center">Set new password</h2>
                    <p className="text-sm text-muted-foreground mt-1 lg:text-left text-center">Choose a strong password of at least 8 characters.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Min. 8 characters"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="pl-9 pr-10 h-12 lg:h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
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
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm" className="text-sm font-medium">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="confirm"
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Repeat your password"
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                          className="pl-9 pr-10 h-12 lg:h-11 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowConfirm(v => !v)}
                          tabIndex={-1}
                          aria-label={showConfirm ? 'Hide password' : 'Show password'}
                        >
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full h-12 lg:h-11 font-semibold shadow-md shadow-primary/20 hover:shadow-primary/30 mt-2" disabled={loading}>
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
          </motion.div>
        </div>
      </div>
    </div>
  );
}
