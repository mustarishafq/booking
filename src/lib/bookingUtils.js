/** Shared booking/resource status styles using semantic design tokens */

import { differenceInHours, differenceInCalendarDays, differenceInMinutes, addMinutes, isToday, isTomorrow, isSameDay, format } from 'date-fns';
import { toDateTimeLocalValue } from '@/lib/calendarUtils';

export const BOOKING_DURATION_PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h', minutes: 60 },
  { label: '1.5h', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
  { label: '4h', minutes: 240 },
];

export function getDurationMinutes(start, end) {
  if (!start || !end) return 0;
  const minutes = differenceInMinutes(new Date(end), new Date(start));
  return minutes > 0 ? minutes : 0;
}

export function matchDurationPreset(minutes) {
  if (minutes <= 0) return null;
  return BOOKING_DURATION_PRESETS.find(p => p.minutes === minutes)?.minutes ?? null;
}

export function formatDurationMinutes(minutes) {
  if (minutes <= 0) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
}

export function roundDateToMinutes(date, stepMinutes = 15) {
  const stepMs = stepMinutes * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / stepMs) * stepMs);
}

export function addMinutesToDateTimeLocal(value, minutes) {
  if (!value) return '';
  return toDateTimeLocalValue(addMinutes(new Date(value), minutes));
}

export function defaultBookingStartTime() {
  return toDateTimeLocalValue(roundDateToMinutes(new Date()));
}

export function calcBookingCost(resource, start, end) {
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
  return Math.round(resource.rate * 100);
}

export function bookingDurationLabel(resource, start, end) {
  if (!start || !end) return '';
  const s = new Date(start);
  const e = new Date(end);
  if (resource?.pricing_model === 'hourly') return `${differenceInHours(e, s)} hour(s)`;
  if (resource?.pricing_model === 'daily') return `${Math.ceil(differenceInCalendarDays(e, s)) || 1} day(s)`;
  return 'Flat fee';
}

export const bookingStatusBadge = {
  confirmed: 'text-success bg-success/10 border-success/30',
  pending: 'text-warning bg-warning/10 border-warning/30',
  cancelled: 'text-destructive bg-destructive/10 border-destructive/30',
  rejected: 'text-destructive bg-destructive/10 border-destructive/30',
  completed: 'text-primary bg-primary/10 border-primary/30',
};

const BOOKING_TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

/** Editable when not terminal and the booking end time has not passed. */
export function isBookingEditable(booking, now = new Date()) {
  if (!booking) return false;
  if (BOOKING_TERMINAL_STATUSES.has(booking.status)) return false;
  return new Date(booking.end_time) >= now;
}

export const bookingStatusSolid = {
  confirmed: 'bg-success text-success-foreground',
  pending: 'bg-warning text-warning-foreground',
  cancelled: 'bg-destructive/80 text-destructive-foreground',
  rejected: 'bg-destructive text-destructive-foreground',
  completed: 'bg-success text-success-foreground',
};

export const resourceStatusBadge = {
  active: '',
  maintenance: 'text-warning bg-warning/10 border-warning/30',
  inactive: 'text-destructive bg-destructive/10 border-destructive/30',
};

export function getPairWithTypes(resource) {
  const raw = resource?.pair_with_types;
  if (Array.isArray(raw)) {
    return raw.map(t => String(t).trim()).filter(Boolean);
  }
  // Legacy single value
  const legacy = resource?.pair_with_type;
  if (typeof legacy === 'string' && legacy.trim()) return [legacy.trim()];
  return [];
}

/** @deprecated use getPairWithTypes */
export function getPairWithType(resource) {
  return getPairWithTypes(resource)[0] || '';
}

export function filterByResourceTypes(resources, types) {
  const targets = new Set(
    (Array.isArray(types) ? types : [types])
      .map(t => String(t || '').trim().toLowerCase())
      .filter(Boolean),
  );
  if (targets.size === 0) return [];
  return resources.filter(r => targets.has((r.resource_type || '').trim().toLowerCase()));
}

/** @deprecated use filterByResourceTypes */
export function filterByResourceType(resources, type) {
  return filterByResourceTypes(resources, type);
}

export function findPairedSibling(booking, bookings = []) {
  if (!booking?.booking_group_id) return null;
  return bookings.find(
    b => b.booking_group_id === booking.booking_group_id && b.id !== booking.id,
  ) || null;
}

/** Prefer vehicle/room as primary; driver as companion when ordering a pair. */
function orderPairedBookings(a, b) {
  const aDriver = /\bdriver\b/i.test(a?.resource_type || '');
  const bDriver = /\bdriver\b/i.test(b?.resource_type || '');
  if (aDriver && !bDriver) return [b, a];
  if (!aDriver && bDriver) return [a, b];
  return String(a?.id || '').localeCompare(String(b?.id || '')) <= 0 ? [a, b] : [b, a];
}

/**
 * Collapse bookings that share booking_group_id into one visual event.
 * Returns booking-like objects with `pairedSibling` + `isPairedEvent` when paired.
 */
export function collapsePairedBookings(bookings = []) {
  const seen = new Set();
  const result = [];

  for (const booking of bookings) {
    if (!booking?.id || seen.has(booking.id)) continue;

    const sibling = findPairedSibling(booking, bookings);
    if (sibling) {
      seen.add(booking.id);
      seen.add(sibling.id);
      const [primary, secondary] = orderPairedBookings(booking, sibling);
      result.push({
        ...primary,
        pairedSibling: secondary,
        isPairedEvent: true,
      });
      continue;
    }

    seen.add(booking.id);
    result.push(booking);
  }

  return result;
}

/** Display label for a (possibly paired) calendar event's resources. */
export function getPairedResourceLabel(booking) {
  const primary = booking?.resource_name || booking?.room_name || '';
  const secondary = booking?.pairedSibling?.resource_name || booking?.pairedSibling?.room_name || '';
  if (primary && secondary) return `${primary} + ${secondary}`;
  return primary || secondary || '';
}

export function phoneTelHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

/** Prefer snapshotted booking phone; fall back to current resource phone. */
export function getBookingPhone(booking, resources = []) {
  if (booking?.resource_phone) return booking.resource_phone;
  if (!booking?.resource_id || !resources?.length) return null;
  const resource = resources.find(r => r.id === booking.resource_id);
  return resource?.phone || null;
}

/**
 * Given a desired [start, end) window that conflicts with a resource's existing bookings,
 * find the next time it's free for the same duration. Returns null if nothing opens up
 * within the search horizon (resource is effectively fully booked).
 */
export function findNextAvailableTime(resourceId, start, end, bookings = [], excludeIds = [], horizonDays = 60) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const duration = endDate - startDate;
  if (!(duration > 0)) return null;

  const excluded = new Set(excludeIds.filter(Boolean));
  const relevant = bookings
    .filter(b =>
      b.resource_id === resourceId &&
      !excluded.has(b.id) &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      new Date(b.end_time) > startDate,
    )
    .map(b => ({ start: new Date(b.start_time), end: new Date(b.end_time) }))
    .sort((a, b) => a.start - b.start);

  const horizon = new Date(startDate.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  let candidate = startDate;

  for (const b of relevant) {
    if (candidate >= horizon) return null;
    const candidateEnd = new Date(candidate.getTime() + duration);
    if (b.end <= candidate || b.start >= candidateEnd) continue;
    candidate = b.end;
  }

  return candidate >= horizon ? null : candidate;
}

/**
 * Given a desired [start, end) window that conflicts with a resource's existing bookings,
 * find the contiguous busy window covering that conflict — from the earliest overlapping
 * booking's start through to when the resource frees up for the requested duration.
 * Returns null if there's no conflict.
 */
export function getBusyRange(resourceId, start, end, bookings = [], excludeIds = []) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const excluded = new Set(excludeIds.filter(Boolean));

  const overlapping = bookings
    .filter(b =>
      b.resource_id === resourceId &&
      !excluded.has(b.id) &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected' &&
      new Date(b.start_time) < endDate &&
      new Date(b.end_time) > startDate,
    )
    .map(b => ({ start: new Date(b.start_time), end: new Date(b.end_time) }))
    .sort((a, b) => a.start - b.start);

  if (overlapping.length === 0) return null;

  const freeFrom = findNextAvailableTime(resourceId, start, end, bookings, excludeIds);
  return {
    start: overlapping[0].start,
    end: freeFrom || overlapping[overlapping.length - 1].end,
  };
}

/** Human label for a busy resource's conflict window, e.g. "Busy 11:00 AM – 12:00 PM". */
export function formatBusyRangeLabel(range) {
  if (!range) return 'Fully booked — try another time';
  const { start, end } = range;
  const startLabel = format(start, 'h:mm a');
  const endLabel = isSameDay(start, end) ? format(end, 'h:mm a') : format(end, 'MMM d, h:mm a');
  if (isToday(start)) return `Busy ${startLabel} – ${endLabel}`;
  if (isTomorrow(start)) return `Busy tomorrow, ${startLabel} – ${endLabel}`;
  return `Busy ${format(start, 'MMM d')}, ${startLabel} – ${endLabel}`;
}

export const statColorMap = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};
