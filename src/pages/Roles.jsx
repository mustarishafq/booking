import React, { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getToken } from '@/api/base44Client';
import { hasPermission } from '@/lib/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Shield, Plus, Pencil, Trash2, Loader2, Users, Settings,
  BookOpen, LayoutGrid, Receipt, ShieldCheck,
  CalendarDays, CreditCard, LayoutDashboard,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const PERMISSION_GROUPS = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    permissions: [
      { key: 'view_dashboard_stats', label: 'View Admin Stats', desc: 'See revenue totals, all-user booking counts and system-wide metrics on the dashboard' },
    ],
  },
  {
    label: 'Resources',
    icon: LayoutGrid,
    permissions: [
      { key: 'view_resources', label: 'View Resources', desc: 'Browse and view all bookable resources' },
      { key: 'manage_resources', label: 'Manage Resources', desc: 'Create, edit, and delete resources & rooms' },
    ],
  },
  {
    label: 'Bookings',
    icon: BookOpen,
    permissions: [
      { key: 'book_resources', label: 'Book Resources', desc: 'Make new reservations for resources and rooms' },
      { key: 'cancel_own_booking', label: 'Cancel Own Bookings', desc: 'Cancel bookings the user created themselves' },
      { key: 'view_all_bookings', label: 'View All Bookings', desc: 'See bookings made by any user, not just their own' },
      { key: 'manage_bookings', label: 'Manage Bookings', desc: 'Approve, reject or cancel any booking from any user' },
    ],
  },
  {
    label: 'Calendar',
    icon: CalendarDays,
    permissions: [
      { key: 'view_calendar', label: 'View Calendar', desc: 'Access the booking calendar page' },
      { key: 'view_all_calendar_entries', label: 'View All on Calendar', desc: "See all users' bookings on the calendar, not just own" },
    ],
  },
  {
    label: 'Credits',
    icon: CreditCard,
    permissions: [
      { key: 'top_up_credits', label: 'Top Up Own Credits', desc: 'Add credit balance to own account' },
      { key: 'manage_user_credits', label: 'Manage User Credits', desc: "Adjust credit balances for any user (via Users page)" },
    ],
  },
  {
    label: 'Transactions',
    icon: Receipt,
    permissions: [
      { key: 'view_own_transactions', label: 'View Own Transactions', desc: 'Access own credit and booking transaction history' },
      { key: 'view_all_transactions', label: 'View All Transactions', desc: 'Access transaction history for all users' },
    ],
  },
  {
    label: 'Users',
    icon: Users,
    permissions: [
      { key: 'view_users', label: 'View User List', desc: 'Access the user management page to see all users' },
      { key: 'manage_users', label: 'Manage Users', desc: 'Approve, reject, add and edit users (requires View User List)' },
    ],
  },
  {
    label: 'Roles',
    icon: Shield,
    permissions: [
      { key: 'manage_roles', label: 'Manage Roles & Permissions', desc: 'Create, edit and delete custom roles and assign permissions' },
    ],
  },
  {
    label: 'Settings',
    icon: Settings,
    permissions: [
      { key: 'manage_settings', label: 'Manage Settings', desc: 'Change email, notifications and system configuration' },
    ],
  },
];

const COLOR_OPTIONS = [
  { value: 'slate',  label: 'Slate',  tw: 'bg-slate-500' },
  { value: 'blue',   label: 'Blue',   tw: 'bg-blue-500' },
  { value: 'violet', label: 'Violet', tw: 'bg-violet-500' },
  { value: 'emerald',label: 'Emerald',tw: 'bg-emerald-500' },
  { value: 'amber',  label: 'Amber',  tw: 'bg-amber-500' },
  { value: 'rose',   label: 'Rose',   tw: 'bg-rose-500' },
  { value: 'cyan',   label: 'Cyan',   tw: 'bg-cyan-500' },
  { value: 'orange', label: 'Orange', tw: 'bg-orange-500' },
];

const colorTw = (color) =>
  COLOR_OPTIONS.find(c => c.value === color)?.tw || 'bg-slate-500';

function roleBadgeStyle(color) {
  const map = {
    slate:   'bg-slate-100 text-slate-700 border-slate-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    violet:  'bg-violet-50 text-violet-700 border-violet-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    cyan:    'bg-cyan-50 text-cyan-700 border-cyan-200',
    orange:  'bg-orange-50 text-orange-700 border-orange-200',
  };
  return map[color] || map.slate;
}

const EMPTY_FORM = { name: '', description: '', color: 'slate', permissions: {} };

export function RoleBadge({ role }) {
  if (!role) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${roleBadgeStyle(role.color || role.role_color)}`}>
      <Shield className="w-3 h-3" />
      {role.name || role.role_name}
    </span>
  );
}

export default function Roles() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/roles`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Failed to load roles');
      return res.json();
    },
  });

  const openCreate = () => {
    setEditingRole(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (role) => {
    setEditingRole(role);
    setForm({ name: role.name, description: role.description || '', color: role.color || 'slate', permissions: role.permissions || {} });
    setDialogOpen(true);
  };

  const togglePermission = (key) => {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Role name is required'); return; }
    setSaving(true);
    try {
      const url = editingRole ? `${API_BASE}/roles/${editingRole.id}` : `${API_BASE}/roles`;
      const method = editingRole ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Save failed');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(editingRole ? 'Role updated.' : 'Role created.');
      setDialogOpen(false);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch(`${API_BASE}/roles/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('Role deleted.');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (!hasPermission(user, 'manage_roles')) {
    return <div className="text-center py-16"><p className="text-muted-foreground">Access denied</p></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Shield}
        title="Roles & Permissions"
        description="Define custom roles and control what each role can do"
        actions={
          <Button onClick={openCreate} className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30">
            <Plus className="w-4 h-4" />
            New Role
          </Button>
        }
      />

      <Card className="rounded-2xl border border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Built-in Roles</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          {[
            { name: 'Admin', color: 'violet', desc: 'Full access to everything — users, settings, all bookings, billing.' },
            { name: 'User', color: 'slate', desc: 'Can browse resources and make their own bookings. No admin access.' },
          ].map(r => (
            <div key={r.name} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${colorTw(r.color)}`}>
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{r.name}</span>
                  <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Built-in</span>
                </div>
                <p className="text-xs text-muted-foreground">{r.desc}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Custom roles */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Custom Roles</h2>
        {isLoading ? (
          <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : roles.length === 0 ? (
          <EmptyState icon={Shield} title="No custom roles yet" action={
            <Button variant="outline" size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-1" /> Create your first role
            </Button>
          } className="py-12" />
        ) : (
          <div className="grid gap-4">
            {roles.map(role => {
              const enabledPerms = PERMISSION_GROUPS.flatMap(g => g.permissions).filter(p => role.permissions?.[p.key]);
              return (
                <Card key={role.id} className="rounded-2xl border border-border">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorTw(role.color)}`}>
                          <Shield className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold">{role.name}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${roleBadgeStyle(role.color)}`}>{role.color}</span>
                          </div>
                          {role.description && <p className="text-sm text-muted-foreground mb-2">{role.description}</p>}
                          <div className="flex flex-wrap gap-1.5">
                            {enabledPerms.length === 0 ? (
                              <span className="text-xs text-muted-foreground italic">No permissions assigned</span>
                            ) : enabledPerms.map(p => (
                              <span key={p.key} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                {p.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(role)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTarget(role)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Edit Role' : 'Create Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-1">
            <div className="space-y-1.5">
              <Label>Role Name</Label>
              <Input placeholder="e.g. Manager, Staff, Guest" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea placeholder="What is this role for?" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="space-y-1.5">
              <Label>Badge Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    title={c.label}
                    onClick={() => setForm(f => ({ ...f, color: c.value }))}
                    className={`w-7 h-7 rounded-full transition-all ${c.tw} ${form.color === c.value ? 'ring-2 ring-offset-2 ring-foreground scale-110' : 'opacity-70 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <div className="space-y-4">
                {PERMISSION_GROUPS.map(group => {
                  const Icon = group.icon;
                  return (
                    <div key={group.label} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                        <Icon className="w-4 h-4" />
                        {group.label}
                      </div>
                      {group.permissions.map(p => (
                        <div key={p.key} className="flex items-start gap-3">
                          <Checkbox
                            id={p.key}
                            checked={!!form.permissions[p.key]}
                            onCheckedChange={() => togglePermission(p.key)}
                            className="mt-0.5"
                          />
                          <div>
                            <label htmlFor={p.key} className="text-sm font-medium cursor-pointer">{p.label}</label>
                            <p className="text-xs text-muted-foreground">{p.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            <Button className="w-full" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRole ? 'Save Changes' : 'Create Role'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete role "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this role. Users assigned to this role will have their custom role cleared but will keep their base access level (user/admin).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
