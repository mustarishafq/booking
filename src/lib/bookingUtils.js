/** Shared booking/resource status styles using semantic design tokens */

import { differenceInHours, differenceInCalendarDays } from 'date-fns';

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
