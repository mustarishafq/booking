import { db } from '@/api/base44Client';

import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addWeeks } from 'date-fns';
import { toast } from 'sonner';
import {
  Loader2, AlertCircle, CheckCircle2, Building2, CalendarPlus,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { calcBookingCost, bookingDurationLabel } from '@/lib/bookingUtils';

const emptyForm = {
  resource_id: '',
  title: '',
  start_time: '',
  end_time: '',
  attendees: '',
  notes: '',
  is_recurring: false,
  recurrence_weeks: 4,
};

export default function BookingModal({
  open,
  onOpenChange,
  preselectedResourceId = '',
  preselectedStartTime = '',
  preselectedEndTime = '',
  user,
  setUser,
}) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
    enabled: open,
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-created_date', 200),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setForm({
      ...emptyForm,
      resource_id: preselectedResourceId || '',
      start_time: preselectedStartTime || '',
      end_time: preselectedEndTime || '',
    });
    setError('');
    setSuccess('');
    setSaving(false);
  }, [open, preselectedResourceId, preselectedStartTime, preselectedEndTime]);

  const activeResources = resources.filter(r => r.status === 'active');
  const selected = resources.find(r => r.id === form.resource_id);
  const singleCost = calcBookingCost(selected, form.start_time, form.end_time);
  const totalCost = form.is_recurring ? singleCost * Number(form.recurrence_weeks) : singleCost;

  const checkConflict = (start, end, resourceId) =>
    bookings.some(b =>
      b.resource_id === resourceId &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      new Date(b.start_time) < new Date(end) &&
      new Date(b.end_time) > new Date(start)
    );

  const handleBook = async () => {
    setError('');
    setSuccess('');
    if (!form.resource_id || !form.title || !form.start_time || !form.end_time) {
      setError('Please fill in all required fields.');
      return;
    }
    const s = new Date(form.start_time);
    const e = new Date(form.end_time);
    if (e <= s) { setError('End must be after start.'); return; }

    const isAdmin = user?.role === 'admin';
    const isInternal = user?.user_type === 'internal';
    const balance = user?.credit_balance_cents || 0;

    if (isAdmin && !isInternal && totalCost > balance) {
      setError(`Insufficient credits. Need RM${(totalCost / 100).toFixed(2)}, you have RM${(balance / 100).toFixed(2)}.`);
      return;
    }

    const weeks = form.is_recurring ? Number(form.recurrence_weeks) : 1;
    const instances = [];
    for (let i = 0; i < weeks; i++) {
      const is = addWeeks(s, i);
      const ie = addWeeks(e, i);
      if (checkConflict(is.toISOString(), ie.toISOString(), form.resource_id)) {
        setError(`Conflict detected on week ${i + 1}. That slot is already booked.`);
        return;
      }
      instances.push({ start: is, end: ie });
    }

    setSaving(true);
    try {
      const groupId = form.is_recurring ? `grp_${Date.now()}` : undefined;
      const needsApproval = selected?.requires_approval !== false && !isAdmin;
      const bookingStatus = needsApproval ? 'pending' : 'confirmed';

      await db.entities.Booking.bulkCreate(instances.map(inst => ({
        resource_id: form.resource_id,
        resource_name: selected.name,
        resource_type: selected.resource_type,
        pricing_model: selected.pricing_model,
        title: form.title,
        start_time: inst.start.toISOString(),
        end_time: inst.end.toISOString(),
        attendees: Number(form.attendees) || 1,
        notes: form.notes,
        status: bookingStatus,
        cost_cents: singleCost,
        is_recurring: form.is_recurring,
        recurrence_group_id: groupId,
        recurrence_weeks: form.is_recurring ? Number(form.recurrence_weeks) : undefined,
        booked_by_email: user.email,
        booked_by_name: user.full_name,
      })));

      if (isAdmin && !isInternal && totalCost > 0) {
        const newBalance = balance - totalCost;
        await db.auth.updateMe({ credit_balance_cents: newBalance });
        await db.entities.Transaction.create({
          user_email: user.email,
          type: 'booking_charge',
          amount_cents: -totalCost,
          balance_after_cents: newBalance,
          description: `Booking: ${form.title} — ${selected.name} (${instances.length} session${instances.length > 1 ? 's' : ''})`,
        });
        setUser({ ...user, credit_balance_cents: newBalance });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }

      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      const message = needsApproval
        ? 'Request submitted! Awaiting admin approval.'
        : `Booked! ${instances.length} session(s) confirmed.`;
      setSuccess(message);
      toast.success(message);

      setTimeout(() => onOpenChange(false), 900);
    } catch (err) {
      setError(err.message || 'Failed to create booking.');
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg sm:max-w-xl max-h-[90dvh] overflow-y-auto rounded-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border sticky top-0 bg-background z-10">
          <div className="flex items-center gap-2">
            <CalendarPlus className="w-5 h-5 text-primary" />
            <DialogTitle>New Booking</DialogTitle>
          </div>
          <DialogDescription>Reserve any resource in a few steps</DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {user?.user_type === 'internal' && (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-3">
              <Building2 className="w-5 h-5 text-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-success">Internal Booking</p>
                <p className="text-xs text-muted-foreground">As an internal user, your bookings are free — no credits will be charged.</p>
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="rounded-xl border border-success/30 bg-success/5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">{success}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label>Resource *</Label>
            <Select value={form.resource_id} onValueChange={v => setForm(f => ({ ...f, resource_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select a resource" /></SelectTrigger>
              <SelectContent>
                {activeResources.map(r => (
                  <SelectItem key={r.id} value={r.id}>
                    <span className="font-medium">{r.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">
                      [{r.resource_type}] — RM{r.rate}/{r.pricing_model === 'hourly' ? 'hr' : r.pricing_model === 'daily' ? 'day' : 'flat'}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && (
              <div className="flex gap-2 mt-1 flex-wrap">
                <Badge variant="outline">{selected.resource_type}</Badge>
                <Badge variant="outline" className="capitalize">{selected.pricing_model}</Badge>
                {selected.capacity > 0 && <Badge variant="outline">Cap: {selected.capacity}</Badge>}
                {selected.requires_approval !== false && user?.role !== 'admin' && (
                  <Badge variant="outline" className="border-warning/30 text-warning bg-warning/10">
                    Requires approval
                  </Badge>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Title / Purpose *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client pickup, Team meeting…" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start *</Label>
              <Input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>End *</Label>
              <Input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Attendees / Passengers</Label>
            <Input type="number" min="1" value={form.attendees} onChange={e => setForm(f => ({ ...f, attendees: e.target.value }))} placeholder="1" />
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requirements…" rows={3} />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Switch checked={form.is_recurring} onCheckedChange={v => setForm(f => ({ ...f, is_recurring: v }))} />
            <div>
              <p className="text-sm font-medium">Recurring (weekly)</p>
              <p className="text-xs text-muted-foreground">Repeat this booking every week</p>
            </div>
          </div>

          {form.is_recurring && (
            <div className="space-y-1.5">
              <Label>Number of Weeks</Label>
              <Input type="number" min="2" max="52" value={form.recurrence_weeks}
                onChange={e => setForm(f => ({ ...f, recurrence_weeks: e.target.value }))} />
            </div>
          )}

          {selected && singleCost > 0 && user?.user_type !== 'internal' && (
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
              <h3 className="font-semibold">Cost Summary</h3>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{bookingDurationLabel(selected, form.start_time, form.end_time)} × RM{selected.rate}</span>
                <span>RM{(singleCost / 100).toFixed(2)}</span>
              </div>
              {form.is_recurring && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">× {form.recurrence_weeks} weeks</span>
                  <span>RM{(totalCost / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-semibold">
                <span>Total</span>
                <span className="text-primary">RM{(totalCost / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Your balance</span>
                <span>RM{((user?.credit_balance_cents || 0) / 100).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-border sticky bottom-0 bg-background">
          <Button className="w-full shadow-md shadow-primary/20 hover:shadow-primary/30" size="lg" onClick={handleBook} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selected?.requires_approval !== false && user?.role !== 'admin' ? 'Submit Request' : 'Confirm Booking'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
