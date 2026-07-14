import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { db } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, KeyRound, LogOut, Mail, Phone, Shield, Eye, EyeOff } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import UserAvatar from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

function FieldGroup({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground leading-relaxed">{hint}</p>}
      {children}
    </div>
  );
}

function SignOutSection() {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5 space-y-3">
      <div className="flex items-center gap-2">
        <LogOut className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Sign Out</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        End your current session on this device. You will need to sign in again to continue.
      </p>
      <Button
        variant="outline"
        className={cn(
          'w-full sm:w-auto text-destructive hover:text-destructive',
          'hover:bg-destructive/5 border-destructive/30',
        )}
        onClick={() => db.auth.logout()}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>
    </div>
  );
}

export default function Profile() {
  const { user, setUser } = useOutletContext();

  const [activeTab, setActiveTab] = useState('details');
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const profileDirty = fullName !== (user?.full_name || '') || phone !== (user?.phone || '');
  const displayName = user?.full_name || user?.email?.split('@')[0] || 'User';

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const updated = await db.auth.updateMe({ full_name: fullName, phone });
      setUser(u => ({ ...u, full_name: updated.full_name, phone: updated.phone }));
      toast.success('Profile updated.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const savePassword = async () => {
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match.'); return; }
    setSavingPassword(true);
    try {
      await db.auth.updateMe({ new_password: newPassword });
      setNewPassword('');
      setConfirmPassword('');
      toast.success('Password changed. Sign in again if needed.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        icon={User}
        title="Profile"
        description="Manage your account details and security"
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Card className="rounded-2xl border border-border overflow-hidden">
          <div className="relative px-4 py-6 sm:px-6 sm:py-8 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent border-b border-border">
            <div className="flex items-center gap-4 sm:gap-5">
              <UserAvatar
                user={user}
                size="profile"
                className="ring-2 ring-primary/10"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold tracking-tight truncate">{displayName}</h2>
                  {user?.role && (
                    <Badge variant="secondary" className="capitalize shrink-0">
                      {user.role}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 truncate flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {user?.email}
                </p>
                {user?.phone && (
                  <p className="text-sm text-muted-foreground mt-0.5 truncate flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    {user.phone}
                  </p>
                )}
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-6 pt-4 sm:pt-5">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <TabsList className="h-auto w-full grid grid-cols-2 gap-1 p-1">
                <TabsTrigger
                  value="details"
                  className="gap-1.5 py-2.5 text-sm flex items-center justify-center min-h-[44px]"
                >
                  <User className="w-4 h-4 shrink-0" />
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="security"
                  className="gap-1.5 py-2.5 text-sm flex items-center justify-center min-h-[44px]"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  Security
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="mt-0 space-y-5">
                <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5 space-y-4">
                  <FieldGroup
                    label="Display Name"
                    hint="Shown across the app when you book resources or appear in user lists."
                  >
                    <Input
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      placeholder="Your name"
                    />
                  </FieldGroup>

                  <FieldGroup
                    label="WhatsApp Phone Number"
                    hint="Used for booking notifications. Enter digits only, e.g. 60123456789 (no +)."
                  >
                    <Input
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 60123456789"
                      inputMode="tel"
                    />
                  </FieldGroup>

                  <FieldGroup label="Email Address" hint="Your sign-in email. Contact an admin to change it.">
                    <Input value={user?.email || ''} readOnly disabled className="bg-muted/40" />
                  </FieldGroup>
                </div>

                <Button
                  onClick={saveProfile}
                  disabled={savingProfile || !profileDirty}
                  className="w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30"
                >
                  {savingProfile ? 'Saving…' : 'Save Changes'}
                </Button>

                <SignOutSection />
              </TabsContent>

              <TabsContent value="security" className="mt-0 space-y-5">
                <div className="rounded-xl border border-border bg-muted/20 p-4 sm:p-5 space-y-4">
                  <div className="flex items-center gap-2 pb-1">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Change Password</span>
                  </div>

                  <FieldGroup label="New Password" hint="At least 8 characters.">
                    <div className="relative">
                      <Input
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowNewPassword(v => !v)}
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldGroup>

                  <FieldGroup label="Confirm Password">
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="pr-10"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </FieldGroup>

                  <Button
                    onClick={savePassword}
                    disabled={savingPassword || !newPassword}
                    className="w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30"
                  >
                    {savingPassword ? 'Updating…' : 'Update Password'}
                  </Button>
                </div>

                <SignOutSection />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
