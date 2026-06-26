import {
  AlertTriangle,
  Bell,
  Calendar,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  DollarSign,
  Info,
  Megaphone,
  Package,
  Shield,
  Users,
  XCircle,
} from 'lucide-react';

const TYPE_VISUALS = {
  info: {
    color: 'text-info',
    bg: 'bg-info/10',
    border: 'border-info/45 dark:border-info/30',
    dot: 'bg-info',
    Icon: Info,
  },
  success: {
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/45 dark:border-success/30',
    dot: 'bg-success',
    Icon: CheckCircle2,
  },
  warning: {
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/50 dark:border-warning/35',
    dot: 'bg-warning',
    Icon: AlertTriangle,
  },
  error: {
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/45 dark:border-destructive/30',
    dot: 'bg-destructive',
    Icon: XCircle,
  },
  critical: {
    color: 'text-critical',
    bg: 'bg-critical/10',
    border: 'border-critical/45 dark:border-critical/30',
    dot: 'bg-critical',
    Icon: CircleAlert,
  },
};

const PRIORITY_VISUALS = {
  low: { color: 'text-foreground/70 dark:text-muted-foreground', bg: 'bg-muted' },
  medium: { color: 'text-info-foreground', bg: 'bg-info' },
  high: {
    color: 'text-warning-foreground',
    bg: 'bg-warning dark:bg-warning/25 dark:text-warning dark:border dark:border-warning/40',
  },
  critical: {
    color: 'text-critical-foreground',
    bg: 'bg-critical dark:bg-critical/25 dark:text-critical dark:border dark:border-critical/40',
  },
};

const CATEGORY_ICONS = {
  booking: Calendar,
  hr: Users,
  inventory: Package,
  finance: DollarSign,
  security: Shield,
  system: Bell,
  task: ClipboardList,
  approval: CheckCircle2,
  announcement: Megaphone,
  calendar: Calendar,
  other: Bell,
};

function inferVisualType(notificationType) {
  if (!notificationType) return 'info';
  if (TYPE_VISUALS[notificationType]) return notificationType;
  if (notificationType.includes('rejected') || notificationType.includes('cancelled')) return 'error';
  if (notificationType.includes('pending')) return 'warning';
  if (
    notificationType.includes('confirmed')
    || notificationType.includes('new_pic')
    || (notificationType.includes('submitted') && !notificationType.includes('pending'))
  ) {
    return 'success';
  }
  return 'info';
}

function inferPriority(notificationType) {
  if (!notificationType) return 'medium';
  if (notificationType.includes('rejected') || notificationType.includes('cancelled')) return 'critical';
  if (notificationType.includes('pending')) return 'high';
  if (notificationType.includes('confirmed')) return 'low';
  return 'medium';
}

function inferCategory(notificationType) {
  if (notificationType?.startsWith('booking')) return 'booking';
  if (notificationType?.includes('task') || notificationType?.includes('care')) return 'task';
  return 'other';
}

export function getNotificationTypeVisual(type) {
  const visualType = inferVisualType(type);
  return { visualType, ...TYPE_VISUALS[visualType] };
}

export function getNotificationPriorityVisual(priority) {
  return PRIORITY_VISUALS[priority] || PRIORITY_VISUALS.medium;
}

export function getNotificationCategoryIcon(category) {
  return CATEGORY_ICONS[category] || CATEGORY_ICONS.other;
}

export function normalizeNotification(notification) {
  const category = notification.category || inferCategory(notification.type);
  const priority = notification.priority || inferPriority(notification.type);
  const typeVisual = getNotificationTypeVisual(notification.visual_type || notification.type);

  return {
    ...notification,
    is_read: notification.is_read ?? !!notification.read_at,
    action_url: notification.action_url || notification.link || null,
    category,
    priority,
    system_id: notification.system_id || notification.id?.replace(/-/g, '').slice(0, 5) || '',
    typeVisual,
  };
}

export function isCriticalNotification(notification) {
  const visualType = notification.visual_type || inferVisualType(notification.type);
  return visualType === 'critical' || visualType === 'error';
}
