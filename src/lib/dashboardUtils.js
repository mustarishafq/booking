import { startOfDay, addDays } from 'date-fns';
import {
  hasPermission,
  isInternalUser,
  showDashboardRevenue,
  showUserCredits,
} from '@/lib/permissions';
import { bookingOverlapsRange } from '@/lib/calendarUtils';
import { buildUserBookingCounts, getUserExp } from '@/lib/resourceVisuals';

const HISTORY_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

/** Admin-style dashboard: org-wide metrics and queues. */
export function isAdminDashboard(user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return (
    hasPermission(user, 'manage_bookings') ||
    hasPermission(user, 'view_all_bookings') ||
    hasPermission(user, 'view_users') ||
    hasPermission(user, 'view_dashboard_stats')
  );
}

export function canSeeAllBookings(user) {
  return (
    user?.role === 'admin' ||
    hasPermission(user, 'view_all_bookings') ||
    hasPermission(user, 'manage_bookings')
  );
}

export function scopeBookings(bookings, user) {
  if (canSeeAllBookings(user)) return bookings;
  return bookings.filter(b => b.booked_by_email === user?.email);
}

export function isUpcomingBooking(booking, now = new Date()) {
  if (HISTORY_STATUSES.has(booking.status)) return false;
  return new Date(booking.end_time) >= now;
}

export function sortBookingsForDashboard(bookings, { prioritizePending = false } = {}) {
  const now = new Date();
  return [...bookings].sort((a, b) => {
    if (prioritizePending) {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
    }
    const aUpcoming = isUpcomingBooking(a, now);
    const bUpcoming = isUpcomingBooking(b, now);
    if (aUpcoming && !bUpcoming) return -1;
    if (!aUpcoming && bUpcoming) return 1;
    return new Date(b.start_time) - new Date(a.start_time);
  });
}

export function getDashboardMeta(user) {
  const adminView = isAdminDashboard(user);
  const internal = isInternalUser(user);

  if (adminView) {
    return {
      mode: internal ? 'internal-admin' : 'admin',
      chartTitle: 'Booking Activity',
      chartDescription: 'New bookings over the last 7 days',
    };
  }

  return {
    mode: internal ? 'internal-user' : 'user',
    chartTitle: 'Your Activity',
    chartDescription: 'Your bookings over the last 7 days',
  };
}

export function getDashboardDescription(user) {
  const meta = getDashboardMeta(user);
  if (meta.mode === 'internal-admin') {
    return 'Org overview — resources, bookings, and items that need action.';
  }
  if (meta.mode === 'admin') {
    return 'System overview — bookings, users, and billing at a glance.';
  }
  if (meta.mode === 'internal-user') {
    return 'Your workspace — upcoming bookings and available resources.';
  }
  return 'Your bookings, credits, and quick access to resources.';
}

export function buildDashboardStats({
  user,
  resources,
  bookings,
  transactions,
  users,
}) {
  const adminView = isAdminDashboard(user);
  const activeResources = resources.filter(r => r.status === 'active').length;
  const now = new Date();
  const scoped = scopeBookings(bookings, user);
  const upcoming = scoped.filter(b => isUpcomingBooking(b, now));
  const confirmed = scoped.filter(b => b.status === 'confirmed');
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  const todayBookings = bookings.filter(b => bookingOverlapsRange(b, todayStart, todayEnd)).length;
  const pendingUsers = users.filter(u => !u.approved).length;
  const canManageBookings = hasPermission(user, 'manage_bookings');
  const canViewUsers = hasPermission(user, 'view_users');

  if (adminView) {
    const items = [
      {
        key: 'resources',
        title: 'Active Resources',
        value: activeResources,
        icon: 'LayoutGrid',
        color: 'primary',
        subtitle: `${resources.length} total`,
      },
      {
        key: 'bookings',
        title: 'Confirmed Bookings',
        value: bookings.filter(b => b.status === 'confirmed').length,
        icon: 'BookOpen',
        color: 'accent',
        subtitle: `${bookings.length} total`,
      },
    ];

    if (canManageBookings) {
      items.push({
        key: 'pending-bookings',
        title: 'Pending Approval',
        value: pendingBookings,
        icon: 'Clock',
        color: pendingBookings > 0 ? 'warning' : 'primary',
        subtitle: pendingBookings > 0 ? 'Needs review' : 'Queue clear',
      });
    } else {
      items.push({
        key: 'today',
        title: "Today's Bookings",
        value: todayBookings,
        icon: 'CalendarCheck',
        color: 'success',
        subtitle: 'Starting today',
      });
    }

    if (canViewUsers) {
      items.push({
        key: 'pending-users',
        title: 'Pending Users',
        value: pendingUsers,
        icon: 'Users',
        color: pendingUsers > 0 ? 'warning' : 'primary',
        subtitle: pendingUsers > 0 ? 'Awaiting approval' : 'No pending sign-ups',
      });
    } else if (isInternalUser(user)) {
      items.push({
        key: 'today',
        title: "Today's Bookings",
        value: todayBookings,
        icon: 'CalendarCheck',
        color: 'success',
        subtitle: 'Starting today',
      });
    }

    if (showDashboardRevenue(user)) {
      const totalRevenue = transactions
        .filter(t => t.type === 'booking_charge')
        .reduce((sum, t) => sum + Math.abs(t.amount_cents || 0), 0);
      items.push({
        key: 'revenue',
        title: 'Revenue',
        value: `RM${(totalRevenue / 100).toFixed(2)}`,
        icon: 'CreditCard',
        color: 'success',
        subtitle: 'From booking charges',
      });
    }

    return items.slice(0, 4);
  }

  // Personal user dashboard
  const userEmail = String(user?.email || '').toLowerCase();
  const userBookingCount = buildUserBookingCounts(bookings)[userEmail]?.bookingCount || 0;
  const userXp = getUserExp(userBookingCount);

  const items = [
    {
      key: 'upcoming',
      title: 'Upcoming',
      value: upcoming.length,
      icon: 'CalendarCheck',
      color: 'primary',
      subtitle: upcoming.length === 1 ? 'Booking scheduled' : 'Bookings scheduled',
    },
    {
      key: 'active',
      title: 'Confirmed',
      value: confirmed.length,
      icon: 'BookOpen',
      color: 'accent',
      subtitle: `${scoped.length} total`,
    },
    {
      key: 'xp',
      title: 'Your XP',
      value: userXp.exp,
      icon: 'Zap',
      color: 'warning',
      subtitle: `Level ${userXp.level} · ${userXp.bookingCount} booking${userXp.bookingCount === 1 ? '' : 's'}`,
    },
  ];

  if (showUserCredits(user)) {
    items.push({
      key: 'credits',
      title: 'Credit Balance',
      value: `RM${((user?.credit_balance_cents || 0) / 100).toFixed(2)}`,
      icon: 'CreditCard',
      color: 'success',
      subtitle: 'Available to spend',
    });
  } else {
    items.push({
      key: 'resources',
      title: 'Resources',
      value: activeResources,
      icon: 'LayoutGrid',
      color: 'success',
      subtitle: 'Available to book',
    });
  }

  return items.slice(0, 4);
}

export function buildDashboardAlerts({ user, bookings, users, careSummary }) {
  const alerts = [];
  const canManageBookings = hasPermission(user, 'manage_bookings');
  const canViewUsers = hasPermission(user, 'view_users');
  const canManageResources = hasPermission(user, 'manage_resources');

  if (canManageResources && careSummary?.overdue > 0) {
    alerts.push({
      key: 'care-overdue',
      type: 'destructive',
      message: `${careSummary.overdue} resource care item${careSummary.overdue === 1 ? '' : 's'} overdue${careSummary.blocking_overdue_resources ? ` (${careSummary.blocking_overdue_resources} blocking bookings)` : ''}`,
      href: '/care?status=overdue',
    });
  }

  if (canManageResources && careSummary?.due > 0) {
    alerts.push({
      key: 'care-due',
      type: 'warning',
      message: `${careSummary.due} resource care item${careSummary.due === 1 ? '' : 's'} due today`,
      href: '/care?status=due',
    });
  }

  if (canManageResources && careSummary?.upcoming > 0 && !careSummary?.overdue && !careSummary?.due) {
    alerts.push({
      key: 'care-upcoming',
      type: 'info',
      message: `${careSummary.upcoming} resource care item${careSummary.upcoming === 1 ? '' : 's'} due soon`,
      href: '/care?status=upcoming',
    });
  }

  if (canManageBookings) {
    const pending = bookings.filter(b => b.status === 'pending');
    if (pending.length > 0) {
      alerts.push({
        key: 'pending-bookings',
        type: 'warning',
        message: `${pending.length} booking${pending.length === 1 ? '' : 's'} awaiting approval`,
        href: '/bookings?status=pending',
      });
    }
  }

  if (canViewUsers) {
    const pending = users.filter(u => !u.approved);
    if (pending.length > 0) {
      alerts.push({
        key: 'pending-users',
        type: 'warning',
        message: `${pending.length} user${pending.length === 1 ? '' : 's'} awaiting approval`,
        href: '/users?tab=pending',
      });
    }
  }

  return alerts;
}

export function buildQuickActions(user, { openBookingModal } = {}) {
  const adminView = isAdminDashboard(user);
  const actions = [];

  if (hasPermission(user, 'book_resources') && openBookingModal) {
    actions.push({
      key: 'book',
      label: 'New Booking',
      icon: 'Plus',
      primary: true,
      onClick: () => openBookingModal(),
    });
  }

  if (hasPermission(user, 'view_resources')) {
    actions.push({
      key: 'care',
      label: 'Care schedules',
      icon: 'Wrench',
      href: '/care',
    });
    actions.push({
      key: 'resources',
      label: 'Browse Resources',
      icon: 'LayoutGrid',
      href: '/resources',
    });
  }

  if (hasPermission(user, 'view_calendar')) {
    actions.push({
      key: 'calendar',
      label: 'Calendar',
      icon: 'CalendarDays',
      href: '/calendar',
    });
  }

  if (adminView && hasPermission(user, 'manage_bookings')) {
    actions.push({
      key: 'pending',
      label: 'Review Pending',
      icon: 'Clock',
      href: '/bookings?status=pending',
    });
  }

  if (adminView && hasPermission(user, 'view_users')) {
    actions.push({
      key: 'users',
      label: 'Users',
      icon: 'Users',
      href: '/users',
    });
  }

  if (adminView && hasPermission(user, 'manage_resources')) {
    actions.push({
      key: 'manage-resources',
      label: 'Manage Resources',
      icon: 'Settings',
      href: '/resources',
    });
  }

  return actions;
}

export function getListBookings(bookings, user) {
  const scoped = scopeBookings(bookings, user);
  const adminView = isAdminDashboard(user);
  const prioritizePending = adminView && hasPermission(user, 'manage_bookings');

  if (adminView) {
    const todayStart = startOfDay(new Date());
    const todayEnd = addDays(todayStart, 1);
    const attention = scoped.filter(
      b => b.status === 'pending' || (isUpcomingBooking(b) && bookingOverlapsRange(b, todayStart, todayEnd)),
    );
    const pool = attention.length > 0 ? attention : scoped;
    return sortBookingsForDashboard(pool, { prioritizePending }).slice(0, 5);
  }

  return sortBookingsForDashboard(
    scoped.filter(b => isUpcomingBooking(b)),
  ).slice(0, 5);
}
