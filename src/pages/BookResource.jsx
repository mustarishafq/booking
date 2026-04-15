import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { differenceInHours, differenceInCalendarDays, addWeeks } from 'date-fns';

function calcCost(resource, start, end) {
  if (!resource || !start || !end) return 0;
  const s = new Date(start);
  const e = new Date(end);
  if (e <= s) return 0;
  if (resource.pricing_model === 'hourly') {
    const hours = differenceInHours(e, s);
    return Math.round(hours * resource.rate * 100);
  }
  if (resource.pricing_model === 'daily') {
    const days = Math.ceil(differenceInCalendarDays(e, s)) || 1;
    return Math.round(days * resource.rate * 100);
  }
  // flat
  return Math.round(resource.rate * 100);
}

function durationLabel(resource, start, end) {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (resource?.pricing_model === 'hourly') return `${differenceInHours(e, s)} hour(s)`;
  if (resource?.pricing_model === 'daily') return `${Math.ceil(differenceInCalendarDays(e, s)) || 1} day(s)`;
  return 'Flat fee';
}

export default function BookResource() {
  const { user, setUser } = useOutletContext();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const preselected = urlParams.get('resource');

  const [form, setForm] = useState({
    resource_id: preselected || '',
    title: '',
    start_time: '',
    end_time: '',
    attendees: '',
    notes: '',
    is_recurring: false,
    recurrence_weeks: 4,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-created_date', 200),
  });

  const activeResources = resources.filter(r => r.status === 'active');
  const selected = resources.find(r => r.id === form.resource_id);

  const singleCost = calcCost(selected, form.start_time, form.end_time);
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
    const balance = user?.credit_balance_cents || 0;

    // Only check and deduct credits for admins (non-admins are pending until approved)
    if (isAdmin && totalCost > balance) {
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
      const bookingStatus = isAdmin ? 'confirmed' : 'pending';

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

      if (isAdmin && totalCost > 0) {
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
      setSuccess(
        isAdmin
          ? `Booked! ${instances.length} session(s) confirmed.`
          : `Request submitted! Awaiting admin approval.`
      );
      setTimeout(() => navigate('/bookings'), 1500);
      // keep saving=true so button stays disabled/loading until navigation
    } catch (err) {
      setError(err.message || 'Failed to create booking.');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">New Booking</h1>
        <p className="text-muted-foreground mt-1">Reserve any resource in a few steps</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-700">{success}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle className="text-lg">Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
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
              <div className="flex gap-2 mt-1">
                <Badge variant="outline">{selected.resource_type}</Badge>
                <Badge variant="outline" className="capitalize">{selected.pricing_model}</Badge>
                {selected.capacity > 0 && <Badge variant="outline">Cap: {selected.capacity}</Badge>}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Title / Purpose *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client pickup, Team meeting…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special requirements…" />
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
        </CardContent>
      </Card>

      {selected && singleCost > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-5 space-y-2 text-sm">
            <h3 className="font-semibold mb-1">Cost Summary</h3>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{durationLabel(selected, form.start_time, form.end_time)} × RM{selected.rate}</span>
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
          </CardContent>
        </Card>
      )}

      <Button className="w-full" size="lg" onClick={handleBook} disabled={saving}>
        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        Confirm Booking
      </Button>
    </div>
  );
}