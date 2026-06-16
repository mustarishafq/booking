import {
  format, isSameMonth, startOfMonth, endOfMonth,
} from 'date-fns';
import { getWeekDays } from '@/lib/calendarUtils';

export const CARE_CATEGORIES = [
  { value: 'compliance', label: 'Compliance' },
  { value: 'preventive', label: 'Preventive' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

export const INTERVAL_TYPES = [
  { value: 'manual', label: 'Manual date', hint: 'Set next due date yourself' },
  { value: 'days', label: 'Every N days', hint: 'Recurs after completion' },
  { value: 'months', label: 'Every N months', hint: 'Recurs after completion' },
  { value: 'booking_hours', label: 'Booking hours', hint: 'Due after N booked hours since last done' },
  { value: 'booking_count', label: 'Booking count', hint: 'Due after N bookings since last done' },
  { value: 'odometer', label: 'Odometer (km)', hint: 'Due after N km since last done' },
];

export const CARE_STATUS_META = {
  ok: { label: 'OK', className: 'bg-success/10 text-success border-success/30' },
  upcoming: { label: 'Upcoming', className: 'bg-primary/10 text-primary border-primary/30' },
  due: { label: 'Due', className: 'bg-warning/10 text-warning border-warning/30' },
  overdue: { label: 'Overdue', className: 'bg-destructive/10 text-destructive border-destructive/30' },
  inactive: { label: 'Inactive', className: 'bg-muted text-muted-foreground border-border' },
};

export function formatCareDue(item) {
  if (item.interval_type === 'booking_hours' && item.usage_threshold) {
    const current = Math.round(item.usage_current || 0);
    return `${current} / ${item.usage_threshold} hrs`;
  }
  if (item.interval_type === 'booking_count' && item.usage_threshold) {
    const current = item.usage_current || 0;
    return `${current} / ${item.usage_threshold} bookings`;
  }
  if (item.interval_type === 'odometer' && item.usage_threshold) {
    const current = Math.round(item.usage_current || 0);
    return `${current} / ${item.usage_threshold} km`;
  }
  if (item.due_date) return item.due_date;
  if (item.last_done_at) return `Last: ${item.last_done_at.slice(0, 10)}`;
  return 'Not scheduled';
}

export function intervalTypeLabel(value) {
  return INTERVAL_TYPES.find(t => t.value === value)?.label || value;
}

export function careStatusCalendarClass(status) {
  const map = {
    overdue: 'bg-destructive/90 text-destructive-foreground',
    due: 'bg-warning/90 text-warning-foreground',
    upcoming: 'bg-primary/85 text-primary-foreground',
    ok: 'bg-muted text-muted-foreground',
  };
  return map[status] || map.ok;
}

export function careStatusDotClass(status) {
  const map = {
    overdue: 'bg-destructive',
    due: 'bg-warning',
    upcoming: 'bg-primary',
    ok: 'bg-muted-foreground/50',
  };
  return map[status] || map.ok;
}

export function hasCalendarDueDate(item) {
  return Boolean(item?.due_date);
}

export function getCareItemsForDay(items, date) {
  if (!date) return [];
  const dayStr = format(date, 'yyyy-MM-dd');
  return items.filter(item => item.due_date === dayStr);
}

export function getCareItemsInMonth(items, date) {
  return items.filter(item => {
    if (!item.due_date) return false;
    return isSameMonth(new Date(`${item.due_date}T00:00:00`), date);
  });
}

export function getCareItemsInWeek(items, date) {
  const weekDays = getWeekDays(date);
  const dayStrs = new Set(weekDays.map(d => format(d, 'yyyy-MM-dd')));
  return items.filter(item => item.due_date && dayStrs.has(item.due_date));
}

export function countCareDueToday(items) {
  const today = format(new Date(), 'yyyy-MM-dd');
  return items.filter(item => item.due_date === today).length;
}

export function countCareOverdueInMonth(items, date) {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return items.filter(item => {
    if (!item.due_date || item.status !== 'overdue') return false;
    const d = new Date(`${item.due_date}T00:00:00`);
    return d >= monthStart && d <= monthEnd;
  }).length;
}

export function buildCareResourceRows(resources, items, date) {
  const dayItems = getCareItemsForDay(items, date);
  const byResource = new Map();

  for (const item of dayItems) {
    if (!byResource.has(item.resource_id)) {
      byResource.set(item.resource_id, []);
    }
    byResource.get(item.resource_id).push(item);
  }

  const rows = [];
  const seen = new Set();

  for (const resource of resources) {
    const resourceItems = byResource.get(resource.id);
    if (resourceItems?.length) {
      rows.push({ resource, items: resourceItems });
      seen.add(resource.id);
    }
  }

  for (const [resourceId, resourceItems] of byResource) {
    if (seen.has(resourceId)) continue;
    rows.push({
      resource: {
        id: resourceId,
        name: resourceItems[0].resource_name,
        resource_type: resourceItems[0].resource_type,
        location: resourceItems[0].resource_location,
      },
      items: resourceItems,
    });
  }

  return rows.sort((a, b) => (a.resource.name || '').localeCompare(b.resource.name || ''));
}

export function buildCareResourceWeekRows(resources, items, date) {
  const weekDays = getWeekDays(date);
  const weekItems = getCareItemsInWeek(items, date);
  const byResource = new Map();

  for (const item of weekItems) {
    if (!byResource.has(item.resource_id)) {
      byResource.set(item.resource_id, []);
    }
    byResource.get(item.resource_id).push(item);
  }

  const rows = [];
  const seen = new Set();

  for (const resource of resources) {
    const resourceItems = byResource.get(resource.id);
    if (resourceItems?.length) {
      rows.push({ resource, items: resourceItems, weekDays });
      seen.add(resource.id);
    }
  }

  for (const [resourceId, resourceItems] of byResource) {
    if (seen.has(resourceId)) continue;
    rows.push({
      resource: {
        id: resourceId,
        name: resourceItems[0].resource_name,
        resource_type: resourceItems[0].resource_type,
        location: resourceItems[0].resource_location,
      },
      items: resourceItems,
      weekDays,
    });
  }

  return rows.sort((a, b) => (a.resource.name || '').localeCompare(b.resource.name || ''));
}

export function careCalendarPillLabel(item) {
  return item.resource_name || item.label;
}

export function careCategoryLabel(value) {
  if (!value) return '';
  return CARE_CATEGORIES.find(c => c.value === value)?.label || value;
}

export function formatCareCompletedAt(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return format(d, 'MMM d, yyyy · h:mm a');
}

export const defaultCareItemForm = {
  label: '',
  category: 'preventive',
  interval_type: 'manual',
  interval_value: '',
  next_due_at: '',
  remind_days_before: 7,
  block_when_overdue: false,
  notes: '',
};
