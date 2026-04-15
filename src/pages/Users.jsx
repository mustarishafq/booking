import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getToken } from '@/api/base44Client';
import { Search, UserPlus, Shield, Users as UsersIcon, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

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
  const [editRole, setEditRole] = useState('user');
  const [actionLoading, setActionLoading] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    await fetch(`${API_BASE}/users/${userId}/approve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    setActionLoading(null);
  };

  const handleReject = async (userId) => {
    setActionLoading(userId + '_reject');
    await fetch(`${API_BASE}/users/${userId}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    });
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
    if (editRole !== editUser.role) updates.role = editRole;
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

  if (user?.role !== 'admin') {
    return <div className="text-center py-16"><p className="text-muted-foreground">Admin access required</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">Manage users and credits</p>
        </div>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Invite User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : (
        <>
          {/* Pending approvals */}
          {pendingUsers.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-amber-600 flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
                Pending Approval ({pendingUsers.length})
              </h2>
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-600 border-emerald-200 hover:bg-emerald-50"
                                disabled={!!actionLoading}
                                onClick={() => handleApprove(u.id)}
                              >
                                {actionLoading === u.id + '_approve' ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3 mr-1" />}
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive border-destructive/20 hover:bg-destructive/10"
                                disabled={!!actionLoading}
                                onClick={() => handleReject(u.id)}
                              >
                                {actionLoading === u.id + '_reject' ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3 mr-1" />}
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            </div>
          )}

          {/* Approved users */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {approvedUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'admin' ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role || 'user'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">RM{((u.credit_balance_cents || 0) / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => { setEditUser(u); setEditCredits(((u.credit_balance_cents || 0) / 100).toFixed(2)); setEditRole(u.role || 'user'); }}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </>
      )}

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

      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User — {editUser?.full_name || editUser?.email}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={setEditRole} disabled={editUser?.id === user?.id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              {editUser?.id === user?.id && <p className="text-xs text-muted-foreground">You cannot change your own role.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Credit Balance ($)</Label>
              <Input type="number" step="0.01" value={editCredits} onChange={e => setEditCredits(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleUpdateCredits}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}