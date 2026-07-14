import { db } from '@/api/base44Client';

import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { isTomorrow, isThisWeek, compareAsc, startOfDay, addDays } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, Search, Calendar, BookOpen, X, AlertCircle, History, LayoutList,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { hasPermission, isInternalUser } from '@/lib/permissions';
import { collapsePairedBookings, isBookingEditable } from '@/lib/bookingUtils';
import { bookingOverlapsRange } from '@/lib/calendarUtils';
import EmptyState from '@/components/ui/EmptyState';
import BookingListItem from '@/components/bookings/BookingListItem';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { cn } from '@/lib/utils';

const HISTORY_STATUSES = new Set(['completed', 'cancelled', 'rejected']);
const STATUS_OPTIONS = ['all', 'confirmed', 'pending', 'cancelled', 'rejected', 'completed'];

const CONFIRM_COPY = {
  approve: {
    title: 'Approve this booking?',
    description: 'The booking will be confirmed and the booker may be charged.',
    confirmLabel: 'Approve',
    variant: 'default',
  },
  reject: {
    title: 'Reject this booking?',
    description: 'The booking request will be rejected. This cannot be undone.',
    confirmLabel: 'Reject',
    variant: 'destructive',
  },
  cancel: {
    title: 'Cancel this booking?',
    description: 'The booking will be cancelled. Credits may be refunded if applicable.',
    confirmLabel: 'Cancel booking',
    variant: 'destructive',
  },
};

function ViewTab({ active, label, count, icon: Icon, onClick, tone = 'default' }) {
  const activeTone = {
    default: 'bg-background text-foreground shadow-sm',
    warning: 'bg-warning/15 text-warning shadow-sm ring-1 ring-warning/25',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
        active
          ? activeTone[tone]
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {Icon && <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" />}
      {label}
      <span
        className={cn(
          'text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
          active ? 'bg-foreground/10' : 'bg-muted',
        )}
      >
        {count}
      </span>
    </button>
  );
}

function StatusChip({ active, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 capitalize whitespace-nowrap',
        active
          ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
          : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/40',
      )}
    >
      {label}
    </button>
  );
}

function groupBookingsByDate(bookings, viewTab) {
  if (viewTab === 'history') {
    return [{ key: 'history', label: 'Past bookings', items: bookings }];
  }

  const groups = {
    today: [],
    tomorrow: [],
    thisWeek: [],
    later: [],
    past: [],
  };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = addDays(todayStart, 1);
  bookings.forEach((b) => {
    const start = new Date(b.start_time);
    const end = new Date(b.end_time);
    if (HISTORY_STATUSES.has(b.status) || end < now) {
      groups.past.push(b);
      return;
    }
    if (bookingOverlapsRange(b, todayStart, todayEnd)) groups.today.push(b);
    else if (isTomorrow(start)) groups.tomorrow.push(b);
    else if (isThisWeek(start, { weekStartsOn: 1 })) groups.thisWeek.push(b);
    else groups.later.push(b);
  });

  const order = [
    { key: 'today', label: 'Today', items: groups.today },
    { key: 'tomorrow', label: 'Tomorrow', items: groups.tomorrow },
    { key: 'thisWeek', label: 'This week', items: groups.thisWeek },
    { key: 'later', label: 'Later', items: groups.later },
  ];

  if (viewTab === 'all') {
    order.push({ key: 'past', label: 'Past', items: groups.past });
  }

  return order.filter((g) => g.items.length > 0);
}

export default function Bookings() {
  const { user, openBookingModal } = useOutletContext();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(() => searchParams.get('status') || 'all');
  const [userFilter, setUserFilter] = useState('all');
  const [viewTab, setViewTab] = useState(() => (
    searchParams.get('status') === 'pending' ? 'all' : 'upcoming'
  ));
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  const canViewAll = hasPermission(user, 'view_all_bookings');
  const canManage = hasPermission(user, 'manage_bookings');
  const seeAll = canViewAll || canManage;
  const hideCost = isInternalUser(user);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 200),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
    enabled: canManage,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list('-created_date', 500),
    enabled: canManage,
  });

  const bookers = useMemo(() => {
    const map = new Map();
    bookings.forEach(b => {
      if (b.booked_by_email) {
        map.set(b.booked_by_email, b.booked_by_name || b.booked_by_email);
      }
    });
    return [...map.entries()]
      .map(([email, name]) => ({ email, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [bookings]);

  const visibleBookings = useMemo(
    () => bookings.filter(b => seeAll || b.booked_by_email === user?.email),
    [bookings, seeAll, user?.email],
  );

  const collapsedVisibleBookings = useMemo(
    () => collapsePairedBookings(visibleBookings),
    [visibleBookings],
  );

  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      upcoming: collapsedVisibleBookings.filter(b => !HISTORY_STATUSES.has(b.status) && new Date(b.end_time) >= now).length,
      history: collapsedVisibleBookings.filter(b => HISTORY_STATUSES.has(b.status) || new Date(b.end_time) < now).length,
      all: collapsedVisibleBookings.length,
      pending: collapsedVisibleBookings.filter(b => b.status === 'pending').length,
    };
  }, [collapsedVisibleBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const now = new Date();

    return collapsedVisibleBookings
      .filter(b => userFilter === 'all' || b.booked_by_email === userFilter)
      .filter(b => statusFilter === 'all' || b.status === statusFilter)
      .filter(b => {
        if (viewTab === 'upcoming') {
          return !HISTORY_STATUSES.has(b.status) && new Date(b.end_time) >= now;
        }
        if (viewTab === 'history') {
          return HISTORY_STATUSES.has(b.status) || new Date(b.end_time) < now;
        }
        return true;
      })
      .filter(b =>
        b.title?.toLowerCase().includes(q) ||
        b.resource_name?.toLowerCase().includes(q) ||
        b.room_name?.toLowerCase().includes(q) ||
        b.pairedSibling?.resource_name?.toLowerCase().includes(q) ||
        b.booked_by_email?.toLowerCase().includes(q) ||
        b.booked_by_name?.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        if (viewTab === 'history') {
          return compareAsc(new Date(b.start_time), new Date(a.start_time));
        }
        return compareAsc(new Date(a.start_time), new Date(b.start_time));
      });
  }, [collapsedVisibleBookings, userFilter, statusFilter, viewTab, search]);

  const grouped = useMemo(
    () => groupBookingsByDate(filtered, viewTab),
    [filtered, viewTab],
  );

  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'all' || userFilter !== 'all';

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setUserFilter('all');
  };

  const selectUpcoming = () => { setViewTab('upcoming'); setStatusFilter('all'); };
  const selectPending = () => { setViewTab('all'); setStatusFilter('pending'); };
  const selectHistoryView = () => { setViewTab('history'); setStatusFilter('all'); };
  const selectTotal = () => { setViewTab('all'); setStatusFilter('all'); };

  const isUpcomingActive = viewTab === 'upcoming' && statusFilter === 'all';
  const isPendingActive = statusFilter === 'pending';
  const isHistoryActive = viewTab === 'history' && statusFilter === 'all';
  const isTotalActive = viewTab === 'all' && statusFilter === 'all';

  const requestAction = (type, booking) => setConfirmAction({ type, booking });

  const handleEdit = (booking) => {
    if (!isBookingEditable(booking)) {
      toast.error('This booking can no longer be edited.');
      return;
    }
    openBookingModal?.({ booking });
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, booking } = confirmAction;
    const bookingsToUpdate = [booking, booking.pairedSibling].filter(Boolean);
    setActionLoading(true);
    try {
      if (type === 'approve') {
        const ownerBalances = new Map();
        for (const bk of bookingsToUpdate) {
          await db.entities.Booking.update(bk.id, { status: 'confirmed' });
          const alreadyCharged = transactions.some(
            t => t.booking_id === bk.id && t.type === 'booking_charge',
          );
          if (bk.cost_cents > 0 && !alreadyCharged) {
            const owner = allUsers.find(u => u.email === bk.booked_by_email);
            if (owner) {
              const currentBalance = ownerBalances.has(owner.id)
                ? ownerBalances.get(owner.id)
                : (owner.credit_balance_cents || 0);
              const newBalance = currentBalance - bk.cost_cents;
              ownerBalances.set(owner.id, newBalance);
              await db.entities.User.update(owner.id, { credit_balance_cents: newBalance });
              await db.entities.Transaction.create({
                user_email: owner.email,
                type: 'booking_charge',
                amount_cents: -bk.cost_cents,
                balance_after_cents: newBalance,
                description: `Booking approved: ${bk.title} — ${bk.resource_name}`,
                booking_id: bk.id,
              });
            }
          }
        }
        toast.success('Booking approved');
      } else if (type === 'reject') {
        for (const bk of bookingsToUpdate) {
          await db.entities.Booking.update(bk.id, { status: 'rejected' });
        }
        toast.success('Booking rejected');
      } else if (type === 'cancel') {
        let selfBalance = user?.credit_balance_cents || 0;
        for (const bk of bookingsToUpdate) {
          await db.entities.Booking.update(bk.id, { status: 'cancelled' });
          if (bk.cost_cents && bk.booked_by_email === user?.email) {
            selfBalance += bk.cost_cents;
            await db.auth.updateMe({ credit_balance_cents: selfBalance });
            await db.entities.Transaction.create({
              user_email: user.email,
              type: 'refund',
              amount_cents: bk.cost_cents,
              balance_after_cents: selfBalance,
              description: `Refund: ${bk.title} at ${bk.resource_name || bk.room_name}`,
              booking_id: bk.id,
            });
          }
        }
        toast.success('Booking cancelled');
      }
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmCopy = confirmAction ? CONFIRM_COPY[confirmAction.type] : null;

  const subtitle = isLoading
    ? 'Loading bookings…'
    : `${filtered.length} booking${filtered.length !== 1 ? 's' : ''}${
      userFilter !== 'all' ? ` · ${bookers.find(b => b.email === userFilter)?.name || userFilter}` : ''
    }`;

  return (
    <div className="space-y-5">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </span>
            Bookings
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 ml-[3.25rem]">
            {subtitle}
          </p>
        </div>
        <Button
          className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30 shrink-0"
          onClick={() => openBookingModal?.()}
        >
          <Plus className="w-4 h-4" />
          New Booking
        </Button>
      </motion.div>

      <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9 pr-9 h-10"
              placeholder={seeAll ? 'Search title, resource, or user…' : 'Search bookings…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {(seeAll && bookers.length > 0) && (
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full sm:w-[11rem] h-10 shrink-0">
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                {bookers.map(b => (
                  <SelectItem key={b.email} value={b.email}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-10 gap-1 shrink-0" onClick={clearFilters}>
              <X className="w-3.5 h-3.5" />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-muted p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <ViewTab
            active={isUpcomingActive}
            label="Upcoming"
            count={tabCounts.upcoming}
            icon={Calendar}
            onClick={selectUpcoming}
          />
          {canManage && (
            <ViewTab
              active={isPendingActive}
              label="Pending"
              count={tabCounts.pending}
              icon={AlertCircle}
              onClick={selectPending}
              tone="warning"
            />
          )}
          <ViewTab
            active={isHistoryActive}
            label="History"
            count={tabCounts.history}
            icon={History}
            onClick={selectHistoryView}
          />
          <ViewTab
            active={isTotalActive}
            label="All"
            count={tabCounts.all}
            icon={LayoutList}
            onClick={selectTotal}
          />
        </div>

        {(viewTab === 'all' || viewTab === 'history') && (
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {STATUS_OPTIONS.map(s => (
              <StatusChip
                key={s}
                active={statusFilter === s}
                label={s === 'all' ? 'All status' : s}
                onClick={() => setStatusFilter(s === 'all' ? 'all' : (statusFilter === s ? 'all' : s))}
              />
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-[5.5rem] rounded-2xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={viewTab === 'history' ? 'No booking history' : 'No bookings found'}
          description={hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create a new booking to get started.'}
          action={
            !hasActiveFilters && viewTab !== 'history' ? (
              <Button className="gap-2 mt-2" onClick={() => openBookingModal?.()}>
                <Plus className="w-4 h-4" />
                New Booking
              </Button>
            ) : hasActiveFilters ? (
              <Button variant="outline" size="sm" className="mt-2" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center gap-3 px-0.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </h2>
                <div className="h-px flex-1 bg-border/80" />
                <span className="text-[10px] font-semibold tabular-nums text-muted-foreground/80">
                  {group.items.length}
                </span>
              </div>
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: { opacity: 1, transition: { staggerChildren: 0.04 } },
                }}
              >
                {group.items.map((b) => (
                  <motion.div
                    key={b.id}
                    variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
                  >
                    <BookingListItem
                      booking={b}
                      pairedSibling={b.pairedSibling}
                      resources={resources}
                      showBooker={seeAll}
                      hideCost={hideCost}
                      canManage={canManage}
                      canAct={canManage || b.booked_by_email === user?.email}
                      onApprove={(booking) => requestAction('approve', booking)}
                      onReject={(booking) => requestAction('reject', booking)}
                      onCancel={(booking) => requestAction('cancel', booking)}
                      onEdit={handleEdit}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </section>
          ))}
        </div>
      )}

      <ConfirmActionDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open && !actionLoading) setConfirmAction(null); }}
        title={confirmCopy?.title}
        description={
          confirmAction
            ? `${confirmCopy.description}${confirmAction.booking?.title ? ` “${confirmAction.booking.title}”` : ''}${confirmAction.booking?.resource_name ? ` — ${[confirmAction.booking.resource_name, confirmAction.booking.pairedSibling?.resource_name].filter(Boolean).join(' + ')}` : ''}`
            : undefined
        }
        confirmLabel={confirmCopy?.confirmLabel}
        variant={confirmCopy?.variant}
        loading={actionLoading}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
