import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { toast } from 'sonner';
import { db } from '@/api/base44Client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { User, KeyRound, LogOut } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

export default function Profile() {
  const { user, setUser } = useOutletContext();

  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await db.auth.updateMe({ full_name: fullName, phone });
      setUser(u => ({ ...u, full_name: updated.full_name, phone: updated.phone }));
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    setSaving(true);
    try {
      await db.auth.updateMe({ new_password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed. Sign in again if needed.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader
        icon={User}
        title="Profile"
        description="Manage your account details"
      />

      <Card className="rounded-2xl border border-border">
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
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Display Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">WhatsApp Phone Number</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 60123456789 (no +)" />
            </div>
            <Button
              onClick={saveProfile}
              disabled={saving || (fullName === user?.full_name && phone === (user?.phone || ''))}
              className="shadow-md shadow-primary/20 hover:shadow-primary/30"
            >
              Save Profile
            </Button>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Change Password</Label>
            </div>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password (min 8 chars)" />
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" />
            <Button onClick={savePassword} disabled={saving || !newPassword}>Update Password</Button>
          </div>
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
        onClick={() => db.auth.logout()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}
