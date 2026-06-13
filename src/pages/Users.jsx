import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { getToken } from '@/api/base44Client';
import {
  Search, UserPlus, Shield, Loader2, CheckCircle2, XCircle,
  Building2, Users as UsersIcon, Clock, CreditCard, Pencil,
} from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from '@/pages/Roles';
import { hasPermission } from '@/lib/permissions';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { statColorMap } from '@/lib/bookingUtils';

function UserAvatar({ name, email, size = 'md' }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : (email?.[0] || '?').toUpperCase();
  const sz = size === 'xl' ? 'w-14 h-14 text-lg' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center flex-shrink-0 ring-2 ring-primary/5`}>
      {initials}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, sub, color = 'primary' }) {
  return (
    <Card className="rounded-2xl border border-border hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statColorMap[color] || statColorMap.primary}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none tracking-tight">{value}</p>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
          {sub && <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Users() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState(() => searchParams.get('tab') || 'all');
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
      const res = await fetch(`${API_BASE}/roles`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
  });

  const pendingCount  = users.filter(u => !u.approved).length;
  const adminCount    = users.filter(u => u.approved && u.role === 'admin').length;
  const internalCount = users.filter(u => u.approved && u.user_type === 'internal').length;

  const searchFiltered = users.filter(u =>
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const tabFiltered = searchFiltered.filter(u => {
    if (tabFilter === 'pending')  return !u.approved;
    if (tabFilter === 'admin')    return u.approved && u.role === 'admin';
    if (tabFilter === 'internal') return u.approved && u.user_type === 'internal';
    return true;
  });

  const pendingUsers  = tabFiltered.filter(u => !u.approved);
  const approvedUsers = tabFiltered.filter(u => u.approved);

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

  const handleSave = async () => {
    const cents = Math.round(parseFloat(editCredits) * 100);
    const updates = { credit_balance_cents: cents };
    if (editRoleId !== (editUser.role_id || '')) updates.role_id = editRoleId || null;
    if (editUserType !== (editUser.user_type || 'external')) updates.user_type = editUserType;
    await db.entities.User.update(editUser.id, updates);
    if (cents !== (editUser.credit_balance_cents || 0)) {
      await db.entities.Transaction.create({
        user_email: editUser.email,
        type: 'admin_adjustment',
        amount_cents: cents - (editUser.credit_balance_cents || 0),
        balance_after_cents: cents,
        description: `Admin adjustment by ${user.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setEditUser(null);
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditCredits(((u.credit_balance_cents || 0) / 100).toFixed(2));
    setEditRoleId(u.role_id || '');
    setEditUserType(u.user_type || 'external');
  };

  const TABS = [
    { key: 'all',      label: 'All',      count: users.length },
    { key: 'pending',  label: 'Pending',  count: pendingCount,  dot: 'bg-warning' },
    { key: 'admin',    label: 'Admins',   count: adminCount },
    { key: 'internal', label: 'Internal', count: internalCount },
  ];

  if (!hasPermission(user, 'view_users')) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={UsersIcon}
        title="Users"
        description="Manage users, roles and access"
        actions={
          hasPermission(user, 'manage_users') ? (
            <Button onClick={() => setShowInvite(true)} className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30">
              <UserPlus className="w-4 h-4" />
              Invite User
            </Button>
          ) : null
        }
      />

      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={UsersIcon}   label="Total Users"     value={users.length}    color="primary" />
          <StatCard icon={Clock}       label="Pending"         value={pendingCount}    color="warning" />
          <StatCard icon={Shield}      label="Admins"          value={adminCount}      color="accent" />
          <StatCard icon={Building2}   label="Internal"        value={internalCount}   color="success" />
        </div>
      )}

      {/* Search + Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-1 border-b">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setTabFilter(tab.key)}
              className={`flex items-center gap-1.5 px-3 pb-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tabFilter === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot} animate-pulse`} />}
              {tab.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${tabFilter === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : tabFiltered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" />
      ) : (
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border bg-card">
          {pendingUsers.map(u => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 bg-warning/5 border-b border-warning/10">
              <UserAvatar name={u.full_name} email={u.email} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm truncate">{u.full_name || <span className="italic text-muted-foreground font-normal">No name</span>}</p>
                  <Badge className="bg-warning/10 text-warning border-warning/30 text-xs h-4 px-1.5">Pending</Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
              </div>
              <p className="text-xs text-muted-foreground hidden sm:block flex-shrink-0">
                {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
              </p>
              <div className="flex gap-2 flex-shrink-0">
                <Button size="sm" className="h-7 text-xs" disabled={!!actionLoading} onClick={() => handleApprove(u.id)}>
                  {actionLoading === u.id + '_approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                  Approve
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/5" disabled={!!actionLoading} onClick={() => handleReject(u.id)}>
                  {actionLoading === u.id + '_reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                  Reject
                </Button>
              </div>
            </div>
          ))}

          {/* Approved users */}
          {approvedUsers.map(u => {
            const isInternal = u.user_type === 'internal';
            const hasCustomRole = !!u.role_id;
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                <UserAvatar name={u.full_name} email={u.email} />
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{u.full_name || <span className="italic text-muted-foreground font-normal">No name</span>}</p>
                    {hasCustomRole ? (
                      <RoleBadge role={{ name: u.role_name, color: u.role_color }} />
                    ) : (
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="h-4 text-xs gap-1 px-1.5">
                        {u.role === 'admin' && <Shield className="w-2.5 h-2.5" />}
                        {u.role || 'user'}
                      </Badge>
                    )}
                    {isInternal && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 border border-success/30 rounded-full px-1.5 py-0.5">
                        <Building2 className="w-2.5 h-2.5" /> Internal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                </div>
                <div className="hidden md:flex flex-col items-end text-right flex-shrink-0 gap-0.5">
                  {isInternal ? (
                    <span className="text-xs font-medium text-success">Free</span>
                  ) : (
                    <span className="text-sm font-semibold">RM{((u.credit_balance_cents || 0) / 100).toFixed(2)}</span>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <Button
                  variant="ghost" size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  onClick={() => openEdit(u)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invite User</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label>Email address</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="user@example.com" type="email" />
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex items-center gap-3 pb-1">
              <UserAvatar name={editUser?.full_name} email={editUser?.email} size="xl" />
              <div>
                <DialogTitle className="text-base leading-snug">{editUser?.full_name || 'Unnamed User'}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">{editUser?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant={editUser?.role === 'admin' ? 'default' : 'secondary'} className="h-4 text-xs px-1.5">
                    {editUser?.role || 'user'}
                  </Badge>
                  {editUser?.user_type === 'internal' && (
                    <span className="text-xs text-success bg-success/10 border border-success/30 rounded-full px-1.5 py-0.5">Internal</span>
                  )}
                </div>
              </div>
            </div>
            <Separator />
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>User Type</Label>
              <Select value={editUserType} onValueChange={setEditUserType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External — credit billing</SelectItem>
                  <SelectItem value="internal">Internal — bookings are free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Custom Role <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Select value={editRoleId || 'none'} onValueChange={v => setEditRoleId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="No custom role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No custom role —</SelectItem>
                  {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editUserType !== 'internal' && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" />Credit Balance (RM)</Label>
                <Input type="number" step="0.01" min="0" value={editCredits} onChange={e => setEditCredits(e.target.value)} />
              </div>
            )}
            <Button className="w-full" onClick={handleSave}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}