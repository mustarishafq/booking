import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getToken } from '@/api/base44Client';
import { Search, UserPlus, Shield, Loader2, CheckCircle2, XCircle, Building2, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from '@/pages/Roles';
import { hasPermission } from '@/lib/permissions';

function UserAvatar({ name, email, size = 'md' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (email?.[0] || '?').toUpperCase();
  const sz = size === 'lg' ? 'w-11 h-11 text-sm' : 'w-9 h-9 text-xs';
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function Users() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');
  const [inviting, setInviting] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [editCredits, setEditCredits] = useState('');
  const [editRoleId, setEditRoleId] = useState('');
  const [editUserType, setEditUserType] = useState('external');
  const [actionLoading, setActionLoading] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
  });

  const filtered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const pendingUsers  = filtered.filter(u => !u.approved);
  const approvedUsers = filtered.filter(u => u.approved);

  const handleApprove = async (userId) => {
    setActionLoading(userId + '_approve');
    await fetch(`${API_BASE}/users/${userId}/approve`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setActionLoading(null);
  };

  const handleReject = async (userId) => {
    setActionLoading(userId + '_reject');
    await fetch(`${API_BASE}/users/${userId}/reject`, { method: 'POST', headers: { Authorization: `Bearer ${getToken()}` } });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setActionLoading(null);
  };

  const handleInvite = async () => {
    setInviting(true);
    await db.users.inviteUser(inviteEmail, inviteRole);
    setInviting(false);
    setShowInvite(false);
    setInviteEmail('');
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const handleUpdateCredits = async () => {
    const cents = Math.round(parseFloat(editCredits) * 100);
    const updates = { credit_balance_cents: cents };
    if (editRoleId !== (editUser.role_id || '')) updates.role_id = editRoleId || null;
    if (editUserType !== (editUser.user_type || 'external')) updates.user_type = editUserType;
    await db.entities.User.update(editUser.id, updates);
    if (cents !== (editUser.credit_balance_cents || 0)) {
      const diff = cents - (editUser.credit_balance_cents || 0);
      await db.entities.Transaction.create({
        user_email: editUser.email,
        type: 'admin_adjustment',
        amount_cents: diff,
        balance_after_cents: cents,
        description: `Admin adjustment by ${user.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setEditUser(null);
  };

  if (!hasPermission(user, 'view_users')) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage users and access</p>
        </div>
        {hasPermission(user, 'manage_users') && (
          <Button onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4 mr-2" /> Invite User
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : (
        <>
          {/* Pending approvals */}
          {pendingUsers.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <h2 className="text-sm font-semibold text-amber-600">Pending Approval ({pendingUsers.length})</h2>
              </div>
              <div className="space-y-2">
                {pendingUsers.map(u => (
                  <Card key={u.id} className="border-amber-200 bg-amber-50/50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={u.full_name} email={u.email} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{u.full_name || 'Unnamed User'}</p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />{u.email}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground hidden sm:flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                        </p>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 h-8" disabled={!!actionLoading} onClick={() => handleApprove(u.id)}>
                            {actionLoading === u.id + '_approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                            Approve
                          </Button>
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10 h-8" disabled={!!actionLoading} onClick={() => handleReject(u.id)}>
                            {actionLoading === u.id + '_reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Approved users */}
          <div className="space-y-2">
            {approvedUsers.map(u => {
              const isInternal = u.user_type === 'internal';
              const hasCustomRole = !!u.role_id;
              return (
                <Card key={u.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar name={u.full_name} email={u.email} size="lg" />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{u.full_name || <span className="text-muted-foreground font-normal italic">No name</span>}</p>
                          {/* Single role indicator: custom role wins over base role */}
                          {hasCustomRole ? (
                            <RoleBadge role={{ name: u.role_name, color: u.role_color }} />
                          ) : (
                            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="h-5 text-xs gap-1">
                              {u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                              {u.role || 'user'}
                            </Badge>
                          )}
                          {isInternal && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                              <Building2 className="w-3 h-3" /> Internal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />{u.email}
                        </p>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1 text-right flex-shrink-0">
                        {isInternal ? (
                          <span className="text-sm font-medium text-emerald-600">Free</span>
                        ) : (
                          <span className="text-sm font-semibold">RM{((u.credit_balance_cents || 0) / 100).toFixed(2)}</span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" className="flex-shrink-0 h-8" onClick={() => { setEditUser(u); setEditCredits(((u.credit_balance_cents || 0) / 100).toFixed(2)); setEditRoleId(u.role_id || ''); setEditUserType(u.user_type || 'external'); }}>
                        Edit
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleInvite} disabled={inviting || !inviteEmail}>
              {inviting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserAvatar name={editUser?.full_name} email={editUser?.email} size="lg" />
              <div>
                <DialogTitle className="text-base">{editUser?.full_name || 'Unnamed User'}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{editUser?.email}</p>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>User Type</Label>
              <Select value={editUserType} onValueChange={setEditUserType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External — normal credit billing</SelectItem>
                  <SelectItem value="internal">Internal — bookings are free</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Internal users bypass credits and transactions entirely.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Custom Role <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Select value={editRoleId || 'none'} onValueChange={v => setEditRoleId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No custom role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No custom role —</SelectItem>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {editUserType !== 'internal' && (
              <div className="space-y-1.5">
                <Label>Credit Balance (RM)</Label>
                <Input type="number" step="0.01" value={editCredits} onChange={e => setEditCredits(e.target.value)} />
              </div>
            )}
            <Button className="w-full" onClick={handleUpdateCredits}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}