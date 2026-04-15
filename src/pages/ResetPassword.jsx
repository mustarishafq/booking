import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export default function ResetPassword() {
  const navigate = useNavigate();
  const token = new URLSearchParams(window.location.search).get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center pb-2">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <CardTitle>BookHub</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {done ? 'Password reset' : 'Set a new password'}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <div className="text-center space-y-4 py-2">
              <p className="text-sm text-destructive">Invalid or missing reset token.</p>
              <Button variant="outline" className="w-full" onClick={() => navigate('/login')}>Back to Sign In</Button>
            </div>
          ) : done ? (
            <div className="text-center space-y-4 py-2">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <p className="text-sm text-muted-foreground">Your password has been reset successfully.</p>
              <Button className="w-full" onClick={() => navigate('/login')}>Sign In</Button>
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
                  <Label htmlFor="password">New Password (min. 8 characters)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm New Password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="••••••••"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Reset Password
                </Button>
                <Button type="button" variant="ghost" className="w-full text-sm" onClick={() => navigate('/login')}>
                  Back to Sign In
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
