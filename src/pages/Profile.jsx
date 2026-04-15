import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { db } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { User, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';

export default function Profile() {
  const { user, setUser } = useOutletContext();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nameStatus, setNameStatus] = useState(null);
  const [pwStatus, setPwStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    setNameStatus(null);
    try {
      const updated = await db.auth.updateMe({ full_name: fullName, phone });
      setUser(u => ({ ...u, full_name: updated.full_name, phone: updated.phone }));
      setNameStatus({ ok: true, msg: 'Profile updated.' });
    } catch (e) {
      setNameStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) { setPwStatus({ ok: false, msg: 'Password must be at least 8 characters.' }); return; }
    if (newPassword !== confirmPassword) { setPwStatus({ ok: false, msg: 'Passwords do not match.' }); return; }
    setSaving(true);
    setPwStatus(null);
    try {
      await db.auth.updateMe({ new_password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      setPwStatus({ ok: true, msg: 'Password changed. Sign in again if needed.' });
    } catch (e) {
      setPwStatus({ ok: false, msg: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account details</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Your Account</CardTitle>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Display Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 60123456789 (no +)" />
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving || (fullName === user?.full_name && phone === (user?.phone || ''))}
            >
              Save Profile
            </Button>
            {nameStatus && (
              <Alert variant={nameStatus.ok ? 'default' : 'destructive'} className="py-2">
                {nameStatus.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{nameStatus.msg}</AlertDescription>
              </Alert>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <Label>Change Password</Label>
            </div>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" />
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            <Button onClick={savePassword} disabled={saving || !newPassword}>Update Password</Button>
            {pwStatus && (
              <Alert variant={pwStatus.ok ? 'default' : 'destructive'} className="py-2">
                {pwStatus.ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{pwStatus.msg}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
