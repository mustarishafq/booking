import { db } from '@/api/base44Client';

import React, { useMemo, useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import {
  Plus, Search, XCircle, Calendar, Clock, CheckCircle2, Ban, BookOpen, User,
  X, AlertCircle, History,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { hasPermission } from '@/lib/permissions';
import { bookingStatusBadge } from '@/lib/bookingUtils';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import BookingListItem from '@/components/bookings/BookingListItem';
import { cn } from '@/lib/utils';

const HISTORY_STATUSES = new Set(['completed', 'cancelled', 'rejected']);

function StatPill({ icon: Icon, label, value, color = 'primary', className }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    accent: 'bg-info/10 text-info',
  };

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card min-w-0',
        'flex flex-col items-center justify-center gap-1.5 p-3 text-center',
        'sm:flex-row sm:items-center sm:justify-start sm:gap-3 sm:px-4 sm:py-3 sm:text-left',
        className,
      )}
    >
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xl sm:text-lg font-bold leading-none tracking-tight tabular-nums">{value}</p>
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
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

  useEffect(() => {
    const q = searchParams.get('search');
    if (q) setSearch(q);
  }, [searchParams]);

  const canViewAll = hasPermission(user, 'view_all_bookings');
  const canManage = hasPermission(user, 'manage_bookings');
  const seeAll = canViewAll || canManage;

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 200),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
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

  const tabCounts = useMemo(() => {
    const now = new Date();
    return {
      upcoming: visibleBookings.filter(b => !HISTORY_STATUSES.has(b.status) && new Date(b.end_time) >= now).length,
      history: visibleBookings.filter(b => HISTORY_STATUSES.has(b.status) || new Date(b.end_time) < now).length,
      all: visibleBookings.length,
      pending: visibleBookings.filter(b => b.status === 'pending').length,
    };
  }, [visibleBookings]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const now = new Date();

    return visibleBookings
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
        b.booked_by_email?.toLowerCase().includes(q) ||
        b.booked_by_name?.toLowerCase().includes(q)
      );
  }, [visibleBookings, userFilter, statusFilter, viewTab, search]);

  const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (userFilter !== 'all' ? 1 : 0);
  const hasActiveFilters = search.trim() !== '' || activeFilterCount > 0;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setUserFilter('all');
  };

  const TABS = [
    { key: 'upcoming', label: 'Upcoming', icon: Calendar, count: tabCounts.upcoming },
    { key: 'history', label: 'History', icon: History, count: tabCounts.history },
    { key: 'all', label: 'All', icon: BookOpen, count: tabCounts.all },
  ];

  const handleApprove = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'confirmed' });
    if (booking.cost_cents > 0) {
      const owner = allUsers.find(u => u.email === booking.booked_by_email);
      if (owner) {
        const newBalance = (owner.credit_balance_cents || 0) - booking.cost_cents;
        await db.entities.User.update(owner.id, { credit_balance_cents: newBalance });
        await db.entities.Transaction.create({
          user_email: owner.email,
          type: 'booking_charge',
          amount_cents: -booking.cost_cents,
          balance_after_cents: newBalance,
          description: `Booking approved: ${booking.title} — ${booking.resource_name}`,
          booking_id: booking.id,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleReject = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'rejected' });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const handleCancel = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'cancelled' });
    if (booking.cost_cents && booking.booked_by_email === user?.email) {
      const newBalance = (user.credit_balance_cents || 0) + booking.cost_cents;
      await db.auth.updateMe({ credit_balance_cents: newBalance });
      await db.entities.Transaction.create({
        user_email: user.email,
        type: 'refund',
        amount_cents: booking.cost_cents,
        balance_after_cents: newBalance,
        description: `Refund: ${booking.title} at ${booking.room_name}`,
        booking_id: booking.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const filterControls = (
    <>
      {(seeAll && bookers.length > 0) && (
        <Select value={userFilter} onValueChange={setUserFilter}>
          <SelectTrigger className="w-[9.5rem] sm:w-[11rem] shrink-0">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {bookers.map(b => (
              <SelectItem key={b.email} value={b.email}>
                {b.name} ({b.email})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[7.5rem] sm:w-[8.5rem] shrink-0"><SelectValue placeholder="All status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All status</SelectItem>
          {['confirmed', 'pending', 'cancelled', 'rejected', 'completed'].map(s => (
            <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        icon={BookOpen}
        title="Bookings"
        description={seeAll ? 'Search all bookings and view booking history by user' : 'Your bookings and history'}
        actions={
          <Button
            className="gap-2 w-full sm:w-auto shadow-md shadow-primary/20 hover:shadow-primary/30"
            onClick={() => openBookingModal?.()}
          >
            <Plus className="w-4 h-4" />
            New Booking
          </Button>
        }
      />

      {!isLoading && visibleBookings.length > 0 && (
        <div className={cn(
          'grid gap-2.5',
          canManage ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3',
        )}
        >
          <StatPill icon={Calendar} label="Upcoming" value={tabCounts.upcoming} color="primary" />
          {canManage && (
            <StatPill icon={AlertCircle} label="Pending" value={tabCounts.pending} color="warning" />
          )}
          <StatPill icon={History} label="History" value={tabCounts.history} color="accent" />
          <StatPill icon={BookOpen} label="Total" value={tabCounts.all} color="success" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border-b border-border">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setViewTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 px-3 pb-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap flex-shrink-0',
                  viewTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[1.25rem] text-center',
                  viewTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
                )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 sm:gap-3 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              className="pl-9"
              placeholder={seeAll ? 'Search title, resource, user name or email…' : 'Search bookings…'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 shrink-0">
            {filterControls}
          </div>
        </div>

        {!isLoading && (
          <div className="flex items-center gap-2 flex-wrap min-h-8">
            <p className="text-sm text-muted-foreground">
              {filtered.length} booking{filtered.length !== 1 ? 's' : ''}
              {userFilter !== 'all' ? ` for ${bookers.find(b => b.email === userFilter)?.name || userFilter}` : ''}
            </p>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={clearFilters}>
                <X className="w-3 h-3" />
                Clear filters
              </Button>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <>
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
          <div className="hidden lg:block">
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </>
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
            ) : null
          }
        />
      ) : (
        <>
          <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.24) }}
              >
                <BookingListItem
                  booking={b}
                  showBooker={seeAll}
                  canManage={canManage}
                  canAct={canManage || b.booked_by_email === user?.email}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  onCancel={handleCancel}
                />
              </motion.div>
            ))}
          </div>

          <Card className="hidden lg:block rounded-2xl border border-border overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[min(32rem,calc(100dvh-18rem))] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Title</TableHead>
                      {seeAll && (
                        <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Booked by</TableHead>
                      )}
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Resource</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Date & time</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap text-right">Cost</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap">Status</TableHead>
                      <TableHead className="sticky top-0 z-10 bg-card whitespace-nowrap text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map(b => (
                      <TableRow key={b.id} className="group">
                        <TableCell className="max-w-[200px]">
                          <div>
                            <p className="font-medium truncate">{b.title}</p>
                            {b.is_recurring && (
                              <Badge variant="outline" className="text-xs mt-1">Recurring</Badge>
                            )}
                          </div>
                        </TableCell>
                        {seeAll && (
                          <TableCell>
                            <div className="flex items-center gap-2 min-w-[140px] max-w-[180px]">
                              <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm truncate">{b.booked_by_name || '—'}</p>
                                <p className="text-xs text-muted-foreground truncate">{b.booked_by_email}</p>
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="max-w-[160px]">
                          <p className="text-sm truncate">{b.resource_name}</p>
                          {b.resource_type && (
                            <span className="text-xs text-muted-foreground">{b.resource_type}</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <p className="text-sm">{format(new Date(b.start_time), 'MMM d, yyyy')}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
                          </p>
                        </TableCell>
                        <TableCell className="font-medium text-right tabular-nums whitespace-nowrap">
                          RM{((b.cost_cents || 0) / 100).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('capitalize', bookingStatusBadge[b.status])}>
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end flex-wrap">
                            {canManage && b.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-success hover:text-success"
                                  onClick={() => handleApprove(b)}
                                  aria-label="Approve booking"
                                >
                                  <CheckCircle2 className="w-4 h-4 xl:mr-1" />
                                  <span className="hidden xl:inline">Approve</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-destructive hover:text-destructive"
                                  onClick={() => handleReject(b)}
                                  aria-label="Reject booking"
                                >
                                  <Ban className="w-4 h-4 xl:mr-1" />
                                  <span className="hidden xl:inline">Reject</span>
                                </Button>
                              </>
                            )}
                            {b.status === 'confirmed' && (canManage || b.booked_by_email === user?.email) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-destructive hover:text-destructive"
                                onClick={() => handleCancel(b)}
                                aria-label="Cancel booking"
                              >
                                <XCircle className="w-4 h-4 xl:mr-1" />
                                <span className="hidden xl:inline">Cancel</span>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
