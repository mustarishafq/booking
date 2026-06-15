import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getToken } from '@/api/base44Client';
import {
  Search, UserPlus, Shield, Loader2, CheckCircle2, XCircle,
  Building2, Users as UsersIcon, Clock, CreditCard, Pencil, Calendar,
  Copy, Check, Eye, EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { RoleBadge } from '@/pages/Roles';
import { hasPermission } from '@/lib/permissions';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { statColorMap } from '@/lib/bookingUtils';
import { cn } from '@/lib/utils';

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

function StatPill({ icon: Icon, label, value, color = 'primary', className }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card min-w-0',
        'flex flex-col items-center justify-center gap-1.5 p-3 text-center',
        'sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:py-3 sm:text-left',
        className,
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', statColorMap[color] || statColorMap.primary)}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-lg font-bold leading-none tracking-tight tabular-nums">{value}</p>
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

function UserRoleBadges({ u }) {
  const isInternal = u.user_type === 'internal';
  const hasCustomRole = !!u.role_id;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {hasCustomRole ? (
        <RoleBadge role={{ name: u.role_name, color: u.role_color }} />
      ) : (
        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="h-5 text-xs gap-1 px-1.5">
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
  );
}

function PendingUserCard({ u, actionLoading, onApprove, onReject }) {
  return (
    <div className="rounded-2xl border border-warning/30 bg-warning/5 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3 min-w-0">
        <UserAvatar name={u.full_name} email={u.email} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-snug line-clamp-2">
              {u.full_name || <span className="italic text-muted-foreground font-normal">No name</span>}
            </p>
            <Badge className="bg-warning/10 text-warning border-warning/30 text-xs h-5 px-1.5 shrink-0">Pending</Badge>
          </div>
          <p className="text-xs text-muted-foreground truncate mt-1">{u.email}</p>
        </div>
      </div>
      {u.created_at && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span>Requested {format(new Date(u.created_at), 'MMM d, yyyy')}</span>
        </div>
      )}
      <div className="flex gap-2 pt-1 border-t border-warning/20">
        <Button
          size="sm"
          className="flex-1 h-9 text-xs"
          disabled={!!actionLoading}
          onClick={() => onApprove(u.id)}
        >
          {actionLoading === u.id + '_approve' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />}
          Approve
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-9 text-xs text-destructive border-destructive/20 hover:bg-destructive/5"
          disabled={!!actionLoading}
          onClick={() => onReject(u.id)}
        >
          {actionLoading === u.id + '_reject' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5 mr-1.5" />}
          Reject
        </Button>
      </div>
    </div>
  );
}

function ApprovedUserCard({ u, onEdit }) {
  const isInternal = u.user_type === 'internal';

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300">
      <div className="flex items-start gap-3 min-w-0">
        <UserAvatar name={u.full_name} email={u.email} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm leading-snug line-clamp-2">
            {u.full_name || <span className="italic text-muted-foreground font-normal">No name</span>}
          </p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
          <div className="mt-2">
            <UserRoleBadges u={u} />
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 shrink-0"
          onClick={() => onEdit(u)}
          aria-label="Edit user"
        >
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm pt-1 border-t border-border/60">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs">
            {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
          </span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Balance</span>
          {isInternal ? (
            <span className="text-xs font-medium text-success">Free</span>
          ) : (
            <span className="font-semibold tabular-nums text-sm">RM{((u.credit_balance_cents || 0) / 100).toFixed(2)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

const INITIAL_ADD_FORM = {
  full_name: '',
  email: '',
  password: '',
  role: 'user',
  user_type: 'external',
  role_id: '',
  credit_balance: '0.00',
  generate_password: true,
  require_approval: false,
};

export default function Users() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [tabFilter, setTabFilter] = useState(() => searchParams.get('tab') || 'all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [adding, setAdding] = useState(false);
  const [addResult, setAddResult] = useState(null);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addForm, setAddForm] = useState(INITIAL_ADD_FORM);
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

  const handleAddUser = async () => {
    if (!addForm.email.trim()) {
      toast.error('Email is required');
      return;
    }
    if (!addForm.generate_password && addForm.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setAdding(true);
    try {
      const creditCents = addForm.user_type === 'internal'
        ? 0
        : Math.round(parseFloat(addForm.credit_balance || '0') * 100);

      const result = await db.users.createUser({
        email: addForm.email.trim(),
        full_name: addForm.full_name.trim(),
        password: addForm.generate_password ? undefined : addForm.password,
        generate_password: addForm.generate_password,
        role: addForm.role,
        user_type: addForm.user_type,
        role_id: addForm.role_id || null,
        credit_balance_cents: creditCents,
        approved: !addForm.require_approval,
      });

      setAddResult(result);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      if (creditCents > 0) {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }
      toast.success(result.message || 'User created');
    } catch (err) {
      toast.error(err.message || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  };

  const resetAddUserDialog = () => {
    setShowAddUser(false);
    setAddResult(null);
    setCopiedPassword(false);
    setShowAddPassword(false);
    setAddForm(INITIAL_ADD_FORM);
  };

  const copyTempPassword = async () => {
    if (!addResult?.tempPassword) return;
    try {
      await navigator.clipboard.writeText(addResult.tempPassword);
      setCopiedPassword(true);
      toast.success('Password copied');
      setTimeout(() => setCopiedPassword(false), 2000);
    } catch {
      toast.error('Could not copy password');
    }
  };

  const updateAddForm = (updates) => setAddForm(prev => ({ ...prev, ...updates }));

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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={UsersIcon}
        title="Users"
        description="Manage users, roles and access"
        actions={
          hasPermission(user, 'manage_users') ? (
            <Button onClick={() => setShowAddUser(true)} className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30">
              <UserPlus className="w-4 h-4" />
              Add User
            </Button>
          ) : null
        }
      />

      {!isLoading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <StatPill icon={UsersIcon}   label="Total Users" value={users.length}    color="primary" />
          <StatPill icon={Clock}       label="Pending"     value={pendingCount}    color="warning" />
          <StatPill icon={Shield}      label="Admins"      value={adminCount}      color="accent" />
          <StatPill icon={Building2}   label="Internal"    value={internalCount}   color="success" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border">
          {TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setTabFilter(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0',
                tabFilter === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot} animate-pulse`} />}
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
                tabFilter === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
              )}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input className="pl-9" placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {!isLoading && (
          <p className="text-sm text-muted-foreground">
            {tabFiltered.length} user{tabFiltered.length !== 1 ? 's' : ''}
            {search ? ' matching search' : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <>
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-36 rounded-2xl" />)}
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </>
      ) : tabFiltered.length === 0 ? (
        <EmptyState icon={UsersIcon} title="No users found" />
      ) : (
        <>
          {/* Mobile & tablet cards */}
          <div className="lg:hidden space-y-4">
            {pendingUsers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingUsers.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.24) }}
                  >
                    <PendingUserCard
                      u={u}
                      actionLoading={actionLoading}
                      onApprove={handleApprove}
                      onReject={handleReject}
                    />
                  </motion.div>
                ))}
              </div>
            )}
            {approvedUsers.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {approvedUsers.map((u, i) => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min((pendingUsers.length + i) * 0.04, 0.24) }}
                  >
                    <ApprovedUserCard u={u} onEdit={openEdit} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Desktop table */}
          <Card className="hidden lg:block rounded-2xl border border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[min(32rem,calc(100dvh-18rem))] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">User</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Role</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap text-right">Balance</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Joined</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap text-right w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingUsers.map(u => (
                      <TableRow key={u.id} className="bg-warning/5 hover:bg-warning/10">
                        <TableCell>
                          <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
                            <UserAvatar name={u.full_name} email={u.email} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm truncate">
                                  {u.full_name || <span className="italic text-muted-foreground font-normal">No name</span>}
                                </p>
                                <Badge className="bg-warning/10 text-warning border-warning/30 text-xs h-4 px-1.5 shrink-0">Pending</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">—</TableCell>
                        <TableCell className="text-right text-muted-foreground text-sm">—</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1.5">
                            <Button size="sm" className="h-7 text-xs" disabled={!!actionLoading} onClick={() => handleApprove(u.id)}>
                              {actionLoading === u.id + '_approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                              Approve
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/5" disabled={!!actionLoading} onClick={() => handleReject(u.id)}>
                              {actionLoading === u.id + '_reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {approvedUsers.map(u => {
                      const isInternal = u.user_type === 'internal';
                      return (
                        <TableRow key={u.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-3 min-w-[200px] max-w-[280px]">
                              <UserAvatar name={u.full_name} email={u.email} />
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {u.full_name || <span className="italic text-muted-foreground font-normal">No name</span>}
                                </p>
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <UserRoleBadges u={u} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums whitespace-nowrap">
                            {isInternal ? (
                              <span className="text-xs font-medium text-success">Free</span>
                            ) : (
                              <span className="font-semibold text-sm">RM{((u.credit_balance_cents || 0) / 100).toFixed(2)}</span>
                            )}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                            {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => openEdit(u)}
                              aria-label="Edit user"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Add user dialog */}
      <Dialog open={showAddUser} onOpenChange={(open) => { if (!open) resetAddUserDialog(); else setShowAddUser(true); }}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md max-h-[min(90dvh,720px)] overflow-y-auto">
          {addResult ? (
            <>
              <DialogHeader>
                <DialogTitle>User Created</DialogTitle>
              </DialogHeader>
              <div className="space-y-5 py-2">
                <div className="text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {addResult.user?.full_name || addResult.user?.email}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">{addResult.user?.email}</p>
                  </div>
                </div>

                {addResult.tempPassword && (
                  <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Temporary password
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-sm font-mono bg-background border border-border rounded-lg px-3 py-2 truncate">
                        {addResult.tempPassword}
                      </code>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={copyTempPassword}>
                        {copiedPassword ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Share this password securely. The user should change it after signing in.
                    </p>
                  </div>
                )}

                {!addResult.user?.approved && (
                  <p className="text-sm text-muted-foreground text-center">
                    This account is pending approval before the user can sign in.
                  </p>
                )}

                <Button className="w-full" onClick={resetAddUserDialog}>Done</Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Add User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="add-full-name">Full name</Label>
                  <Input
                    id="add-full-name"
                    value={addForm.full_name}
                    onChange={e => updateAddForm({ full_name: e.target.value })}
                    placeholder="Jane Doe"
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="add-email">Email address</Label>
                  <Input
                    id="add-email"
                    type="email"
                    value={addForm.email}
                    onChange={e => updateAddForm({ email: e.target.value })}
                    placeholder="user@example.com"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="add-generate-password"
                    checked={addForm.generate_password}
                    onCheckedChange={(checked) => updateAddForm({ generate_password: !!checked, password: '' })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="add-generate-password" className="text-sm font-normal leading-snug cursor-pointer">
                      Auto-generate temporary password
                    </Label>
                    <p className="text-xs text-muted-foreground">Recommended — a secure password will be shown after creation.</p>
                  </div>
                </div>

                {!addForm.generate_password && (
                  <div className="space-y-1.5">
                    <Label htmlFor="add-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="add-password"
                        type={showAddPassword ? 'text' : 'password'}
                        value={addForm.password}
                        onChange={e => updateAddForm({ password: e.target.value })}
                        placeholder="Min. 8 characters"
                        autoComplete="new-password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        onClick={() => setShowAddPassword(v => !v)}
                        tabIndex={-1}
                        aria-label={showAddPassword ? 'Hide password' : 'Show password'}
                      >
                        {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>System role</Label>
                    <Select value={addForm.role} onValueChange={v => updateAddForm({ role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>User type</Label>
                    <Select value={addForm.user_type} onValueChange={v => updateAddForm({ user_type: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="external">External</SelectItem>
                        <SelectItem value="internal">Internal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Custom role <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
                  <Select value={addForm.role_id || 'none'} onValueChange={v => updateAddForm({ role_id: v === 'none' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="No custom role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— No custom role —</SelectItem>
                      {roles.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {addForm.user_type !== 'internal' && (
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Starting credit balance (RM)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={addForm.credit_balance}
                      onChange={e => updateAddForm({ credit_balance: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="add-require-approval"
                    checked={addForm.require_approval}
                    onCheckedChange={(checked) => updateAddForm({ require_approval: !!checked })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="add-require-approval" className="text-sm font-normal leading-snug cursor-pointer">
                      Require admin approval before sign-in
                    </Label>
                    <p className="text-xs text-muted-foreground">User appears in Pending until approved.</p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleAddUser}
                  disabled={adding || !addForm.email.trim() || (!addForm.generate_password && addForm.password.length < 8)}
                >
                  {adding && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create User
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-sm sm:max-w-md max-h-[min(90dvh,640px)] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3 pb-1">
              <UserAvatar name={editUser?.full_name} email={editUser?.email} size="xl" />
              <div className="min-w-0">
                <DialogTitle className="text-base leading-snug truncate">{editUser?.full_name || 'Unnamed User'}</DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{editUser?.email}</p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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
