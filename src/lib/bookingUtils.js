/** Shared booking/resource status styles using semantic design tokens */

import { differenceInHours, differenceInCalendarDays, differenceInMinutes, addMinutes } from 'date-fns';
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

export const statColorMap = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-info/10 text-info',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
};
