import { db } from '@/api/base44Client';

import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { addWeeks, format, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import {
  Loader2, CalendarPlus, Pencil, Check, Search, Tag, ChevronLeft, ChevronRight, Link2, Zap,
  Phone, Clock,
} from 'lucide-react';
import { UserIdentity } from '@/components/UserAvatar';

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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DateTimeInput } from '@/components/ui/date-input';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { cn } from '@/lib/utils';
import { toDateTimeLocalValue } from '@/lib/calendarUtils';
import {
  calcBookingCost,
  bookingDurationLabel,
  BOOKING_DURATION_PRESETS,
  getDurationMinutes,
  matchDurationPreset,
  formatDurationMinutes,
  addMinutesToDateTimeLocal,
  defaultBookingStartTime,
  getPairWithTypes,
  filterByResourceTypes,
  findPairedSibling,
  isBookingEditable,
  phoneTelHref,
  getBusyRange,
  formatBusyRangeLabel,
} from '@/lib/bookingUtils';
import { buildResourceBookingCounts, getResourceExp } from '@/lib/resourceVisuals';

const emptyForm = {
  resource_id: '',
  companion_resource_id: '',
  title: '',
  start_time: '',
  end_time: '',
  attendees: '',
  notes: '',
  is_recurring: false,
  recurrence_weeks: 4,
};

const STEP_LABELS = {
  datetime: 'Date & Time',
  resource: 'Resource',
  details: 'Details',
  summary: 'Summary',
};

function ResourcePickCard({ resource, selected, onSelect, isInternal, bookingCount = 0, availability = null }) {
  const pairWithTypes = getPairWithTypes(resource);
  const { exp, level, bookingCount: count } = getResourceExp(bookingCount);
  const isUnavailable = availability?.available === false;

  return (
    <button
      type="button"
      onClick={() => { if (!isUnavailable) onSelect(resource.id); }}
      disabled={isUnavailable}
      className={cn(
        'text-left rounded-xl border overflow-hidden transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'flex flex-row sm:flex-col',
        isUnavailable
          ? 'border-border opacity-60 cursor-not-allowed'
          : selected
            ? 'border-primary ring-2 ring-primary/30 shadow-md shadow-primary/10'
            : 'border-border hover:border-primary/40 hover:shadow-sm',
      )}
    >
      <div className="relative w-20 h-20 sm:w-full sm:h-auto sm:aspect-[4/3] shrink-0 bg-muted overflow-hidden">
        {resource.image_url ? (
          <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
            <Tag className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground/30" />
          </div>
        )}
        {selected && !isUnavailable && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow z-10">
            <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        )}
        {isUnavailable && (
          <div className="hidden sm:block absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10">
            <Badge
              variant="outline"
              className="gap-1 text-[10px] px-1.5 border-destructive/30 bg-destructive/90 text-destructive-foreground"
            >
              <Clock className="w-2.5 h-2.5" />
              Busy
            </Badge>
          </div>
        )}
        <div className="hidden sm:flex absolute top-1.5 left-1.5 sm:top-2 sm:left-2 flex-col items-start gap-1 max-w-[75%] pointer-events-none">
          <Badge className="bg-primary/90 text-primary-foreground text-[10px] max-w-full truncate">
            {resource.resource_type}
          </Badge>
          <Badge
            variant="outline"
            className={cn(
              'gap-0.5 text-[10px] px-1.5 shadow-sm',
              'border-white/25 bg-white/15 text-white backdrop-blur-md',
              'dark:border-white/20 dark:bg-black/30',
            )}
            title={`${count} booking${count !== 1 ? 's' : ''} · ${exp} EXP · Level ${level}`}
          >
            <Zap className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
            <span className="tabular-nums">{exp} XP</span>
            <span className="opacity-80">· Lv.{level}</span>
          </Badge>
        </div>
      </div>
      <div className="p-2.5 sm:p-2.5 space-y-1 min-w-0 flex-1 flex flex-col justify-center">
        <p className="font-medium text-sm leading-snug line-clamp-1 sm:line-clamp-2">{resource.name}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5 sm:hidden">
            {resource.resource_type}
          </Badge>
          {pairWithTypes.length > 0 && (
            <Badge variant="outline" className="text-[10px] h-5 gap-1 px-1.5" title={pairWithTypes.join(', ')}>
              <Link2 className="w-2.5 h-2.5" />
              {pairWithTypes.length === 1 ? pairWithTypes[0] : `${pairWithTypes.length} types`}
            </Badge>
          )}
          <Badge variant="outline" className="text-[10px] h-5 gap-0.5 px-1.5 text-amber-600 dark:text-amber-400 border-amber-500/30">
            <Zap className="w-2.5 h-2.5 fill-current" />
            {exp} XP
          </Badge>
          {!isInternal && resource.rate != null && (
            <span className="text-[11px] text-muted-foreground">
              RM{resource.rate}
              {resource.pricing_model === 'hourly' ? '/hr' : resource.pricing_model === 'daily' ? '/day' : ''}
            </span>
          )}
        </div>
        {isUnavailable && (
          <p className="text-[11px] text-destructive font-medium flex items-center gap-1">
            <Clock className="w-3 h-3 shrink-0" />
            {formatBusyRangeLabel(availability.busyRange)}
          </p>
        )}
      </div>
    </button>
  );
}

function StepIndicator({ steps, current }) {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2 mt-3">
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <React.Fragment key={label}>
            {i > 0 && <div className={cn('h-px flex-1 min-w-2', done || active ? 'bg-primary/40' : 'bg-border')} />}
            <div className="flex items-center gap-1.5 shrink-0">
              <span
                className={cn(
                  'w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center',
                  active && 'bg-primary text-primary-foreground',
                  done && 'bg-primary/15 text-primary',
                  !active && !done && 'bg-muted text-muted-foreground',
                )}
              >
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </span>
              <span className={cn('text-xs hidden sm:inline', active ? 'text-foreground font-medium' : 'text-muted-foreground')}>
                {label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

function ResourcePicContact({ resource }) {
  if (!resource) return null;
  const picLabel = resource.pic_user_id
    ? (resource.pic_name?.trim() || resource.pic_email || null)
    : null;
  const callHref = phoneTelHref(resource.phone);
  if (!picLabel && !callHref) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground pl-0.5">
      {picLabel ? (
        <span
          className="inline-flex items-center gap-1 min-w-0"
          title={resource.pic_email && resource.pic_name ? resource.pic_email : undefined}
        >
          <UserIdentity
            name={resource.pic_name}
            email={resource.pic_email}
            avatarUrl={resource.pic_avatar_url}
            labelClassName="text-[11px] text-muted-foreground"
          />
        </span>
      ) : null}
      {callHref ? (
        <a
          href={callHref}
          className="inline-flex items-center gap-1 text-primary hover:underline"
          title={`Call ${resource.phone}`}
        >
          <Phone className="w-3 h-3 shrink-0" />
          <span className="truncate">Contact</span>
        </a>
      ) : null}
    </div>
  );
}

export default function BookingModal({
  open,
  onOpenChange,
  booking = null,
  preselectedResourceId = '',
  preselectedStartTime = '',
  preselectedEndTime = '',
  user,
  setUser,
}) {
  const queryClient = useQueryClient();
  const isEdit = !!booking;
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [resourceSearch, setResourceSearch] = useState('');
  const [companionSearch, setCompanionSearch] = useState('');

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

  const { data: expBookings = [] } = useQuery({
    queryKey: ['bookings', 'resource-exp'],
    queryFn: () => db.entities.Booking.list('-start_time', 10000),
    enabled: open,
  });

  const bookingCounts = useMemo(
    () => buildResourceBookingCounts(expBookings),
    [expBookings],
  );

  const pairedSibling = useMemo(
    () => (isEdit ? findPairedSibling(booking, bookings) : null),
    [isEdit, booking, bookings],
  );

  useEffect(() => {
    if (!open) return;
    setSaving(false);
    setConfirmOpen(false);
    setResourceSearch('');
    setCompanionSearch('');

    if (booking) {
      const startTime = toDateTimeLocalValue(new Date(booking.start_time));
      const endTime = toDateTimeLocalValue(new Date(booking.end_time));
      setForm({
        ...emptyForm,
        resource_id: booking.resource_id || '',
        companion_resource_id: '',
        title: booking.title || '',
        start_time: startTime,
        end_time: endTime,
        attendees: booking.attendees != null ? String(booking.attendees) : '',
        notes: booking.notes || '',
        is_recurring: false,
        recurrence_weeks: 4,
      });
      setSelectedDuration(matchDurationPreset(getDurationMinutes(startTime, endTime)));
      return;
    }

    const startTime = preselectedStartTime || defaultBookingStartTime();
    const endTime = preselectedEndTime || addMinutesToDateTimeLocal(startTime, 60);
    setForm({
      ...emptyForm,
      resource_id: preselectedResourceId || '',
      start_time: startTime,
      end_time: endTime,
    });
    setSelectedDuration(matchDurationPreset(getDurationMinutes(startTime, endTime)));
    setStepIndex(0);
  }, [open, booking?.id, preselectedResourceId, preselectedStartTime, preselectedEndTime]);

  useEffect(() => {
    if (!open || !booking || !pairedSibling?.resource_id) return;
    setForm(f => (
      f.companion_resource_id === pairedSibling.resource_id
        ? f
        : { ...f, companion_resource_id: pairedSibling.resource_id }
    ));
  }, [open, booking?.id, pairedSibling?.resource_id]);

  const handleDurationSelect = (minutes) => {
    setSelectedDuration(minutes);
    setForm(f => {
      const start = f.start_time || defaultBookingStartTime();
      return {
        ...f,
        start_time: start,
        end_time: addMinutesToDateTimeLocal(start, minutes),
      };
    });
  };

  const handleStartChange = (startTime) => {
    setForm(f => {
      if (!startTime) return { ...f, start_time: startTime };

      let duration = selectedDuration;
      if (duration == null && f.start_time && f.end_time) {
        duration = getDurationMinutes(f.start_time, f.end_time) || null;
      }

      if (duration != null) {
        return {
          ...f,
          start_time: startTime,
          end_time: addMinutesToDateTimeLocal(startTime, duration),
        };
      }

      return { ...f, start_time: startTime };
    });
  };

  const handleEndChange = (endTime) => {
    setForm(f => ({ ...f, end_time: endTime }));
    if (form.start_time && endTime) {
      setSelectedDuration(matchDurationPreset(getDurationMinutes(form.start_time, endTime)));
    } else {
      setSelectedDuration(null);
    }
  };

  const customDurationMinutes = form.start_time && form.end_time && selectedDuration == null
    ? getDurationMinutes(form.start_time, form.end_time)
    : 0;

  const isInternal = user?.user_type === 'internal';
  const activeResources = useMemo(
    () => resources
      .filter(r => r.status === 'active')
      .sort((a, b) => (a.name || '').localeCompare(b.name || '')),
    [resources],
  );

  const selected = resources.find(r => r.id === form.resource_id);
  const companion = resources.find(r => r.id === form.companion_resource_id);
  const pairWithTypes = getPairWithTypes(selected);
  const needsCompanionStep = !isEdit && pairWithTypes.length > 0;
  const companionStepLabel = pairWithTypes.length === 1
    ? pairWithTypes[0]
    : pairWithTypes.length > 1
      ? 'Companion'
      : '';

  const steps = useMemo(
    () => (needsCompanionStep
      ? ['datetime', 'resource', 'companion', 'details', 'summary']
      : ['datetime', 'resource', 'details', 'summary']),
    [needsCompanionStep],
  );
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const stepLabels = steps.map(s => (s === 'companion' ? (companionStepLabel || 'Companion') : STEP_LABELS[s]));
  const currentStepNumber = Math.min(stepIndex, steps.length - 1) + 1;
  const totalSteps = steps.length;

  const displayResourceName = selected?.name || booking?.resource_name || '';
  const displayResourceType = selected?.resource_type || booking?.resource_type || '';
  const displayCompanionName = companion?.name || pairedSibling?.resource_name || '';
  const displayCompanionType = companion?.resource_type || pairedSibling?.resource_type || '';
  const resourceRequiresApproval = selected
    ? selected.requires_approval !== false
    : resources.find(r => r.id === booking?.resource_id)?.requires_approval !== false;
  const companionRequiresApproval = companion
    ? companion.requires_approval !== false
    : (pairedSibling
      ? resources.find(r => r.id === pairedSibling.resource_id)?.requires_approval !== false
      : false);

  const checkConflict = (start, end, resourceId, excludeIds = []) => {
    const excluded = new Set(excludeIds.filter(Boolean));
    return bookings.some(b =>
      !excluded.has(b.id) &&
      b.resource_id === resourceId &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      new Date(b.start_time) < new Date(end) &&
      new Date(b.end_time) > new Date(start)
    );
  };

  const hasTimeRange = !!(form.start_time && form.end_time && new Date(form.end_time) > new Date(form.start_time));
  const formattedRange = (() => {
    if (!hasTimeRange) return '';
    const start = new Date(form.start_time);
    const end = new Date(form.end_time);
    if (isSameDay(start, end)) {
      return `${format(start, 'MMM d, h:mm a')} – ${format(end, 'h:mm a')}`;
    }
    return `${format(start, 'MMM d, h:mm a')} – ${format(end, 'MMM d, h:mm a')}`;
  })();

  const availabilityExcludeIds = useMemo(
    () => (isEdit ? [booking?.id, pairedSibling?.id].filter(Boolean) : []),
    [isEdit, booking?.id, pairedSibling?.id],
  );

  const resourceAvailability = useMemo(() => {
    if (!hasTimeRange) return {};
    const map = {};
    for (const r of activeResources) {
      if (checkConflict(form.start_time, form.end_time, r.id, availabilityExcludeIds)) {
        map[r.id] = {
          available: false,
          busyRange: getBusyRange(r.id, form.start_time, form.end_time, bookings, availabilityExcludeIds),
        };
      } else {
        map[r.id] = { available: true };
      }
    }
    return map;
  }, [hasTimeRange, activeResources, form.start_time, form.end_time, bookings, availabilityExcludeIds]);

  const resourceTypeSummary = useMemo(() => {
    const map = new Map();
    for (const r of activeResources) {
      const type = r.resource_type || 'Other';
      if (!map.has(type)) map.set(type, { type, total: 0, available: 0 });
      const entry = map.get(type);
      entry.total += 1;
      if (!hasTimeRange || resourceAvailability[r.id]?.available !== false) entry.available += 1;
    }
    return [...map.values()].sort((a, b) => a.type.localeCompare(b.type));
  }, [activeResources, hasTimeRange, resourceAvailability]);

  const filteredResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase();
    const list = !q
      ? activeResources
      : activeResources.filter(r =>
        (r.name || '').toLowerCase().includes(q)
        || (r.resource_type || '').toLowerCase().includes(q)
        || (r.location || '').toLowerCase().includes(q),
      );

    if (!hasTimeRange) return list;
    return [...list].sort((a, b) => {
      const aAvailable = resourceAvailability[a.id]?.available !== false;
      const bAvailable = resourceAvailability[b.id]?.available !== false;
      return aAvailable === bAvailable ? 0 : (aAvailable ? -1 : 1);
    });
  }, [activeResources, resourceSearch, hasTimeRange, resourceAvailability]);

  const companionOptions = useMemo(() => {
    if (pairWithTypes.length === 0) return [];
    return filterByResourceTypes(activeResources, pairWithTypes)
      .filter(r => r.id !== form.resource_id);
  }, [activeResources, pairWithTypes, form.resource_id]);

  const filteredCompanions = useMemo(() => {
    const q = companionSearch.trim().toLowerCase();
    const list = !q
      ? companionOptions
      : companionOptions.filter(r =>
        (r.name || '').toLowerCase().includes(q)
        || (r.resource_type || '').toLowerCase().includes(q)
        || (r.location || '').toLowerCase().includes(q),
      );

    if (!hasTimeRange) return list;
    return [...list].sort((a, b) => {
      const aAvailable = resourceAvailability[a.id]?.available !== false;
      const bAvailable = resourceAvailability[b.id]?.available !== false;
      return aAvailable === bAvailable ? 0 : (aAvailable ? -1 : 1);
    });
  }, [companionOptions, companionSearch, hasTimeRange, resourceAvailability]);

  const primaryCost = calcBookingCost(selected, form.start_time, form.end_time);
  const companionCost = calcBookingCost(companion, form.start_time, form.end_time);
  const singleCost = primaryCost + companionCost;
  const totalCost = form.is_recurring ? singleCost * Number(form.recurrence_weeks) : singleCost;

  const selectPrimaryResource = (id) => {
    setForm(f => ({
      ...f,
      resource_id: id,
      companion_resource_id: f.resource_id === id ? f.companion_resource_id : '',
    }));
  };

  const continueDisabled = currentStep === 'datetime'
    ? !hasTimeRange
    : currentStep === 'resource'
      ? !form.resource_id || (hasTimeRange && resourceAvailability[form.resource_id]?.available === false)
      : currentStep === 'details'
        ? !form.title.trim()
        : false;

  const goNext = () => setStepIndex(i => Math.min(steps.length - 1, i + 1));
  const goBack = () => setStepIndex(i => Math.max(0, i - 1));
  const jumpToStep = (key) => {
    const idx = steps.indexOf(key);
    if (idx >= 0) setStepIndex(idx);
  };

  const handleBook = async () => {
    if (!form.resource_id || !form.title || !form.start_time || !form.end_time) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const s = new Date(form.start_time);
    const e = new Date(form.end_time);
    if (e <= s) { toast.error('End must be after start.'); return; }

    if (isEdit && !isBookingEditable(booking)) {
      toast.error('This booking can no longer be edited.');
      return;
    }

    const isAdmin = user?.role === 'admin';
    const balance = user?.credit_balance_cents || 0;
    const excludeIds = isEdit ? [booking.id, pairedSibling?.id] : [];

    if (isEdit) {
      if (checkConflict(s.toISOString(), e.toISOString(), form.resource_id, excludeIds)) {
        toast.error(`Conflict for ${displayResourceName || 'resource'}. That slot is already booked.`);
        return;
      }
      if (pairedSibling && checkConflict(s.toISOString(), e.toISOString(), pairedSibling.resource_id, excludeIds)) {
        toast.error(`Conflict for ${displayCompanionName || 'paired resource'}. That slot is already booked.`);
        return;
      }

      const needsApproval = (resourceRequiresApproval || (pairedSibling && companionRequiresApproval)) && !isAdmin;
      const bookingStatus = needsApproval ? 'pending' : 'confirmed';
      const costCents = selected
        ? calcBookingCost(selected, form.start_time, form.end_time)
        : (booking.cost_cents || 0);

      setSaving(true);
      setConfirmOpen(false);
      try {
        const payload = {
          title: form.title,
          start_time: s.toISOString(),
          end_time: e.toISOString(),
          attendees: Number(form.attendees) || 1,
          notes: form.notes,
          status: bookingStatus,
          cost_cents: costCents,
        };
        await db.entities.Booking.update(booking.id, payload);

        if (pairedSibling) {
          const siblingCost = companion
            ? calcBookingCost(companion, form.start_time, form.end_time)
            : (pairedSibling.cost_cents || 0);
          await db.entities.Booking.update(pairedSibling.id, {
            title: form.title,
            start_time: s.toISOString(),
            end_time: e.toISOString(),
            attendees: Number(form.attendees) || 1,
            notes: form.notes,
            status: bookingStatus,
            cost_cents: siblingCost,
          });
        }

        queryClient.invalidateQueries({ queryKey: ['bookings'] });
        toast.success(
          needsApproval
            ? 'Changes saved. Awaiting admin approval.'
            : 'Booking updated.',
        );
        setTimeout(() => onOpenChange(false), 900);
      } catch (err) {
        toast.error(err.message || 'Failed to update booking.');
        setSaving(false);
      }
      return;
    }

    if (isAdmin && !isInternal && totalCost > balance) {
      toast.error(`Insufficient credits. Need RM${(totalCost / 100).toFixed(2)}, you have RM${(balance / 100).toFixed(2)}.`);
      return;
    }

    const resourceIds = [form.resource_id, form.companion_resource_id].filter(Boolean);
    const weeks = form.is_recurring ? Number(form.recurrence_weeks) : 1;
    const instances = [];
    for (let i = 0; i < weeks; i++) {
      const is = addWeeks(s, i);
      const ie = addWeeks(e, i);
      for (const resourceId of resourceIds) {
        const res = resources.find(r => r.id === resourceId);
        if (checkConflict(is.toISOString(), ie.toISOString(), resourceId)) {
          toast.error(`Conflict on week ${i + 1} for ${res?.name || 'resource'}. That slot is already booked.`);
          return;
        }
      }
      instances.push({ start: is, end: ie, weekIndex: i });
    }

    setSaving(true);
    setConfirmOpen(false);
    try {
      const groupId = form.is_recurring ? `grp_${Date.now()}` : undefined;
      const primaryNeedsApproval = selected?.requires_approval !== false && !isAdmin;
      const companionNeedsApproval = companion?.requires_approval !== false && !isAdmin && !!companion;
      const needsApproval = primaryNeedsApproval || companionNeedsApproval;
      const bookingStatus = needsApproval ? 'pending' : 'confirmed';

      const rows = [];
      for (const inst of instances) {
        const pairId = companion ? crypto.randomUUID() : undefined;

        rows.push({
          resource_id: form.resource_id,
          resource_name: selected.name,
          resource_type: selected.resource_type,
          resource_phone: selected.phone || null,
          pricing_model: selected.pricing_model,
          title: form.title,
          start_time: inst.start.toISOString(),
          end_time: inst.end.toISOString(),
          attendees: Number(form.attendees) || 1,
          notes: form.notes,
          status: bookingStatus,
          cost_cents: primaryCost,
          is_recurring: form.is_recurring,
          recurrence_group_id: groupId,
          recurrence_weeks: form.is_recurring ? Number(form.recurrence_weeks) : undefined,
          booking_group_id: pairId,
          booked_by_email: user.email,
          booked_by_name: user.full_name,
        });

        if (companion) {
          rows.push({
            resource_id: companion.id,
            resource_name: companion.name,
            resource_type: companion.resource_type,
            resource_phone: companion.phone || null,
            pricing_model: companion.pricing_model,
            title: form.title,
            start_time: inst.start.toISOString(),
            end_time: inst.end.toISOString(),
            attendees: Number(form.attendees) || 1,
            notes: form.notes,
            status: bookingStatus,
            cost_cents: companionCost,
            is_recurring: form.is_recurring,
            recurrence_group_id: groupId,
            recurrence_weeks: form.is_recurring ? Number(form.recurrence_weeks) : undefined,
            booking_group_id: pairId,
            booked_by_email: user.email,
            booked_by_name: user.full_name,
          });
        }
      }

      await db.entities.Booking.bulkCreate(rows);

      if (isAdmin && !isInternal && totalCost > 0) {
        const newBalance = balance - totalCost;
        await db.auth.updateMe({ credit_balance_cents: newBalance });
        const resourceNames = [selected.name, companion?.name].filter(Boolean).join(' + ');
        await db.entities.Transaction.create({
          user_email: user.email,
          type: 'booking_charge',
          amount_cents: -totalCost,
          balance_after_cents: newBalance,
          description: `Booking: ${form.title} — ${resourceNames} (${instances.length} session${instances.length > 1 ? 's' : ''})`,
        });
        setUser({ ...user, credit_balance_cents: newBalance });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
      }

      queryClient.invalidateQueries({ queryKey: ['bookings'] });

      const sessionCount = instances.length * (companion ? 2 : 1);
      const message = needsApproval
        ? 'Request submitted! Awaiting admin approval.'
        : `Booked! ${sessionCount} booking(s) confirmed.`;
      toast.success(message);

      setTimeout(() => onOpenChange(false), 900);
    } catch (err) {
      toast.error(err.message || 'Failed to create booking.');
      setSaving(false);
    }
  };

  const requestSubmit = () => {
    if (!form.resource_id || !form.title || !form.start_time || !form.end_time) {
      toast.error('Please fill in all required fields.');
      return;
    }
    const s = new Date(form.start_time);
    const e = new Date(form.end_time);
    if (e <= s) { toast.error('End must be after start.'); return; }
    setConfirmOpen(true);
  };

  const willNeedApproval = isEdit
    ? (resourceRequiresApproval || (pairedSibling && companionRequiresApproval)) && user?.role !== 'admin'
    : (selected?.requires_approval !== false || (companion && companion.requires_approval !== false))
      && user?.role !== 'admin';

  const submitLabel = isEdit
    ? (willNeedApproval ? 'Save & Resubmit' : 'Save Changes')
    : (willNeedApproval ? 'Submit Request' : 'Confirm Booking');

  const confirmTitle = isEdit ? 'Save booking changes?' : 'Create this booking?';
  const confirmDescription = isEdit
    ? (willNeedApproval
      ? 'This resource requires approval. Your booking will return to pending until an admin approves it again.'
      : 'Update this booking with the new details?')
    : (willNeedApproval
      ? 'Submit this booking request for admin approval?'
      : 'Confirm and create this booking?');

  const resourceSummaryCards = (
    <div className="flex flex-col gap-2">
      <div className={cn('grid gap-2', (companion || pairedSibling) ? 'grid-cols-2' : 'grid-cols-1')}>
        {(selected || booking) && (
          <div className="rounded-lg border border-border px-2.5 py-1.5 text-sm min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                {selected?.image_url ? (
                  <img src={selected.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate leading-tight">{displayResourceName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{displayResourceType}</p>
              </div>
            </div>
            <ResourcePicContact resource={selected} />
          </div>
        )}
        {(companion || pairedSibling) && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 text-sm min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-md overflow-hidden bg-muted shrink-0">
                {companion?.image_url ? (
                  <img src={companion.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate leading-tight">{displayCompanionName}</p>
                <p className="text-[11px] text-muted-foreground truncate">Paired · {displayCompanionType}</p>
              </div>
            </div>
            <ResourcePicContact resource={companion} />
          </div>
        )}
      </div>
      {willNeedApproval && (
        <Badge variant="outline" className="border-warning/30 text-warning bg-warning/10 h-fit w-fit">
          {isEdit ? 'Changes require approval' : 'Requires approval'}
        </Badge>
      )}
    </div>
  );

  const costSummary = singleCost > 0 && user?.user_type !== 'internal' && (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm">
      <h3 className="font-semibold">Cost Summary</h3>
      {selected && primaryCost > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground truncate">
            {selected.name} · {bookingDurationLabel(selected, form.start_time, form.end_time)} × RM{selected.rate}
          </span>
          <span className="shrink-0">RM{(primaryCost / 100).toFixed(2)}</span>
        </div>
      )}
      {companion && companionCost > 0 && (
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground truncate">
            {companion.name} · {bookingDurationLabel(companion, form.start_time, form.end_time)} × RM{companion.rate}
          </span>
          <span className="shrink-0">RM{(companionCost / 100).toFixed(2)}</span>
        </div>
      )}
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
  );

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-2xl max-h-[min(90dvh,720px)] overflow-hidden rounded-2xl p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-5 sm:pt-6 pb-3 sm:pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2 pr-6">
            {isEdit
              ? <Pencil className="w-5 h-5 text-primary shrink-0" />
              : <CalendarPlus className="w-5 h-5 text-primary shrink-0" />}
            <DialogTitle>{isEdit ? 'Edit Booking' : 'New Booking'}</DialogTitle>
          </div>
          <DialogDescription className="line-clamp-2">
            {isEdit ? (
              'Update details for this upcoming booking'
            ) : (
              <>
                Step {currentStepNumber} of {totalSteps}
                {currentStep === 'datetime' && ' — choose date & time'}
                {currentStep === 'resource' && ' — choose a resource'}
                {currentStep === 'companion' && (pairWithTypes.length === 1
                  ? ` — optionally add a ${pairWithTypes[0]}`
                  : ' — optionally add a companion')}
                {currentStep === 'details' && ' — booking details'}
                {currentStep === 'summary' && ' — review & confirm'}
              </>
            )}
          </DialogDescription>
          {!isEdit && <StepIndicator steps={stepLabels} current={currentStepNumber} />}
        </DialogHeader>

        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          {isEdit ? (
            <>
              {resourceSummaryCards}

              <div className="space-y-1.5">
                <Label>Title / Purpose *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client pickup, Team meeting…" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label>Estimated duration</Label>
                  {customDurationMinutes > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Custom: {formatDurationMinutes(customDurationMinutes)}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {BOOKING_DURATION_PRESETS.map(({ label, minutes }) => (
                    <Button
                      key={minutes}
                      type="button"
                      size="sm"
                      variant={selectedDuration === minutes ? 'default' : 'outline'}
                      className="h-8 px-3"
                      onClick={() => handleDurationSelect(minutes)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <div className="space-y-1.5 min-w-0">
                  <Label>Start *</Label>
                  <DateTimeInput value={form.start_time} onChange={e => handleStartChange(e.target.value)} />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label>End *</Label>
                  <DateTimeInput value={form.end_time} onChange={e => handleEndChange(e.target.value)} />
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

              {costSummary}
            </>
          ) : (
            <>
              {currentStep === 'datetime' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 sm:gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <Label>Start *</Label>
                      <DateTimeInput value={form.start_time} onChange={e => handleStartChange(e.target.value)} />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <Label>End *</Label>
                      <DateTimeInput value={form.end_time} onChange={e => handleEndChange(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Label>Estimated duration</Label>
                      {customDurationMinutes > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Custom: {formatDurationMinutes(customDurationMinutes)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {BOOKING_DURATION_PRESETS.map(({ label, minutes }) => (
                        <Button
                          key={minutes}
                          type="button"
                          size="sm"
                          variant={selectedDuration === minutes ? 'default' : 'outline'}
                          className="h-8 px-3"
                          onClick={() => handleDurationSelect(minutes)}
                        >
                          {label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {hasTimeRange && (
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Resources available for this time</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {resourceTypeSummary.map(({ type, total, available }) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => { setResourceSearch(type); goNext(); }}
                            className={cn(
                              'rounded-lg border px-3 py-2 text-left transition-colors',
                              available > 0
                                ? 'border-border hover:border-primary/40 hover:bg-muted/40'
                                : 'border-destructive/30 bg-destructive/5',
                            )}
                          >
                            <p className="text-sm font-medium truncate">{type}</p>
                            <p className={cn('text-xs', available > 0 ? 'text-muted-foreground' : 'text-destructive')}>
                              {available} of {total} available
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'resource' && (
                <div className="space-y-3">
                  {hasTimeRange && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                      <span className="text-muted-foreground truncate">{formattedRange}</span>
                      <button
                        type="button"
                        className="text-primary hover:underline shrink-0 font-medium"
                        onClick={() => jumpToStep('datetime')}
                      >
                        Change
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={resourceSearch}
                      onChange={e => setResourceSearch(e.target.value)}
                      placeholder="Search resources…"
                      className="pl-9"
                    />
                  </div>
                  {filteredResources.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No active resources found.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      {filteredResources.map(r => (
                        <ResourcePickCard
                          key={r.id}
                          resource={r}
                          selected={form.resource_id === r.id}
                          onSelect={selectPrimaryResource}
                          isInternal={isInternal}
                          bookingCount={bookingCounts[r.id] || 0}
                          availability={hasTimeRange ? resourceAvailability[r.id] : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'companion' && (
                <div className="space-y-3">
                  <div className="rounded-xl border border-border bg-muted/30 px-3 sm:px-4 py-2.5 sm:py-3">
                    <p className="text-sm font-medium">
                      {pairWithTypes.length === 1
                        ? `Also book a ${pairWithTypes[0]}?`
                        : 'Also book a companion?'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Optional — same time as {selected?.name}. Skip if not needed.
                    </p>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={companionSearch}
                      onChange={e => setCompanionSearch(e.target.value)}
                      placeholder={pairWithTypes.length === 1 ? `Search ${pairWithTypes[0]}…` : 'Search companions…'}
                      className="pl-9"
                    />
                  </div>
                  {filteredCompanions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No matching companions found. You can skip.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                      {filteredCompanions.map(r => (
                        <ResourcePickCard
                          key={r.id}
                          resource={r}
                          selected={form.companion_resource_id === r.id}
                          onSelect={(id) => setForm(f => ({
                            ...f,
                            companion_resource_id: f.companion_resource_id === id ? '' : id,
                          }))}
                          isInternal={isInternal}
                          bookingCount={bookingCounts[r.id] || 0}
                          availability={hasTimeRange ? resourceAvailability[r.id] : null}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {currentStep === 'details' && (
                <>
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground truncate">
                      {[displayResourceName, displayCompanionName].filter(Boolean).join(' + ')} · {formattedRange}
                    </span>
                    <button
                      type="button"
                      className="text-primary hover:underline shrink-0 font-medium"
                      onClick={() => jumpToStep('datetime')}
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Title / Purpose *</Label>
                    <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Client pickup, Team meeting…" />
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
                </>
              )}

              {currentStep === 'summary' && (
                <>
                  {resourceSummaryCards}

                  <div className="rounded-xl border border-border p-4 space-y-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Title</span>
                      <span className="font-medium text-right truncate">{form.title}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">When</span>
                      <span className="font-medium text-right">{formattedRange}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Duration</span>
                      <span className="font-medium text-right">
                        {formatDurationMinutes(getDurationMinutes(form.start_time, form.end_time))}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Attendees</span>
                      <span className="font-medium text-right">{form.attendees || 1}</span>
                    </div>
                    {form.notes && (
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Notes</span>
                        <p className="font-medium whitespace-pre-wrap">{form.notes}</p>
                      </div>
                    )}
                    {form.is_recurring && (
                      <div className="flex justify-between gap-2">
                        <span className="text-muted-foreground shrink-0">Repeats</span>
                        <span className="font-medium text-right">Weekly × {form.recurrence_weeks} weeks</span>
                      </div>
                    )}
                  </div>

                  {costSummary}
                </>
              )}
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-border shrink-0 bg-background flex items-center gap-2">
          {!isEdit && stepIndex > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={goBack}
              disabled={saving}
              className="shrink-0 px-3 sm:px-4"
              aria-label="Back"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-1" />
              <span className="hidden sm:inline">Back</span>
            </Button>
          )}

          {!isEdit && currentStep !== 'summary' && (
            <Button
              className="flex-1 min-w-0 shadow-md shadow-primary/20"
              size="lg"
              onClick={goNext}
              disabled={continueDisabled}
            >
              {currentStep === 'companion' ? (form.companion_resource_id ? 'Continue' : 'Skip') : 'Continue'}
              <ChevronRight className="w-4 h-4 ml-1 shrink-0" />
            </Button>
          )}

          {!isEdit && currentStep === 'summary' && (
            <Button className="flex-1 min-w-0 shadow-md shadow-primary/20 hover:shadow-primary/30" size="lg" onClick={handleBook} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
              {submitLabel}
            </Button>
          )}

          {isEdit && (
            <Button className="flex-1 min-w-0 shadow-md shadow-primary/20 hover:shadow-primary/30" size="lg" onClick={requestSubmit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin shrink-0" />}
              {submitLabel}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>

    <ConfirmActionDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title={confirmTitle}
      description={confirmDescription}
      confirmLabel={submitLabel}
      loading={saving}
      onConfirm={handleBook}
    />
    </>
  );
}
