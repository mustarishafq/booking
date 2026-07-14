import { db } from '@/api/base44Client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';
import { motion } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ChevronLeft, ChevronRight, ChevronDown, CalendarDays, LayoutGrid,
  GanttChartSquare, SlidersHorizontal, Clock, List,
} from 'lucide-react';
import { hasPermission } from '@/lib/permissions';
import {
  isBookingEditable, collapsePairedBookings, findPairedSibling,
} from '@/lib/bookingUtils';
import PageHeader from '@/components/layout/PageHeader';
import CalendarTimeline, { CalendarDayDetail, CalendarDayDetailContent } from '@/components/calendar/CalendarTimeline';
import CalendarWeekTimeline from '@/components/calendar/CalendarWeekTimeline';
import MonthCalendarWeek from '@/components/calendar/MonthCalendarWeek';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import ConfirmActionDialog from '@/components/ui/ConfirmActionDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import {
  filterCalendarBookings,
  getBookingsForDay,
  getBookingsInWeek,
  getBookingsInMonth,
  toDateTimeLocalValue,
} from '@/lib/calendarUtils';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth,
} from 'date-fns';
import { cn } from '@/lib/utils';

const VIEW_MODES = [
  { key: 'month', icon: LayoutGrid, label: 'Month' },
  { key: 'timeline', icon: GanttChartSquare, label: 'Timeline' },
];

const TIMELINE_MODES = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
];

const WEEKDAYS = [
  { full: 'Sun', short: 'S' },
  { full: 'Mon', short: 'M' },
  { full: 'Tue', short: 'T' },
  { full: 'Wed', short: 'W' },
  { full: 'Thu', short: 'T' },
  { full: 'Fri', short: 'F' },
  { full: 'Sat', short: 'S' },
];

function CalendarStatPill({ icon: Icon, label, value, color = 'primary' }) {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className="rounded-2xl border border-border bg-card flex items-center gap-3 px-4 py-3 min-w-0 w-full">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}

export default function CalendarView() {
  const { user, openBookingModal } = useOutletContext();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const canViewAll = hasPermission(user, 'view_all_calendar_entries');
  const canManage = hasPermission(user, 'manage_bookings');
  const canBook = hasPermission(user, 'book_resources');

  const [viewMode, setViewMode] = useState('month');
  const [timelineMode, setTimelineMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [roomFilter, setRoomFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 10000),
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const visibleBookings = useMemo(
    () => filterCalendarBookings(bookings, { roomFilter }),
    [bookings, roomFilter],
  );

  const resourceTypes = useMemo(() => {
    return [...new Set(bookings.map(b => b.resource_type).filter(Boolean))].sort();
  }, [bookings]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const calendarDays = useMemo(() => {
    const days = [];
    let day = calendarStart;
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const calendarWeeks = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      weeks.push(calendarDays.slice(i, i + 7));
    }
    return weeks;
  }, [calendarDays]);

  const monthVisibleBookings = useMemo(
    () => collapsePairedBookings(visibleBookings),
    [visibleBookings],
  );

  const timelineDate = selectedDay || new Date();
  const rawSelectedDayBookings = useMemo(
    () => getBookingsForDay(visibleBookings, timelineDate),
    [visibleBookings, timelineDate],
  );
  const selectedDayBookings = useMemo(
    () => collapsePairedBookings(rawSelectedDayBookings),
    [rawSelectedDayBookings],
  );

  const weekBookings = useMemo(
    () => getBookingsInWeek(visibleBookings, timelineDate),
    [visibleBookings, timelineDate],
  );

  const monthBookingCount = useMemo(
    () => collapsePairedBookings(getBookingsInMonth(visibleBookings, currentDate)).length,
    [visibleBookings, currentDate],
  );

  const todayBookingCount = useMemo(
    () => collapsePairedBookings(getBookingsForDay(visibleBookings, new Date())).length,
    [visibleBookings],
  );

  const pendingCount = useMemo(
    () => visibleBookings.filter(b => b.status === 'pending').length,
    [visibleBookings],
  );

  useEffect(() => {
    setSelectedBooking(null);
  }, [selectedDay, viewMode, timelineMode, roomFilter]);

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    setSelectedBooking(null);
    if (isMobile) {
      setDetailSheetOpen(true);
    }
  };

  const handleTimelineDateChange = (day) => {
    setSelectedDay(day);
    setCurrentDate(day);
    setSelectedBooking(null);
  };

  const handleSelectBooking = (booking) => {
    const paired = selectedDayBookings.find(
      b => b.id === booking?.id || b.pairedSibling?.id === booking?.id,
    );
    setSelectedBooking(paired || booking);
    setSelectedDay(new Date(booking.start_time));
    if (isMobile) {
      setDetailSheetOpen(true);
    }
  };

  const handleSlotCreate = useCallback((slot) => {
    if (!canBook) return;
    openBookingModal({
      resourceId: slot.resourceId || '',
      startTime: toDateTimeLocalValue(slot.start),
      endTime: toDateTimeLocalValue(slot.end),
    });
    if (slot.date) {
      setSelectedDay(slot.date);
    }
  }, [canBook, openBookingModal]);

  const handleApprove = (booking) => setConfirmAction({ type: 'approve', booking });
  const handleReject = (booking) => setConfirmAction({ type: 'reject', booking });

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
    setActionLoading(true);
    try {
      const nextStatus = type === 'approve' ? 'confirmed' : 'rejected';
      await db.entities.Booking.update(booking.id, { status: nextStatus });
      const sibling = booking.pairedSibling || findPairedSibling(booking, bookings);
      if (sibling?.id) {
        await db.entities.Booking.update(sibling.id, { status: nextStatus });
      }
      toast.success(type === 'approve' ? 'Booking approved' : 'Booking rejected');
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setConfirmAction(null);
    } catch (err) {
      toast.error(err.message || 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredResources = roomFilter === 'all'
    ? resources
    : resources.filter(r => r.resource_type === roomFilter);

  const pageDescription = viewMode === 'month'
    ? 'Visual overview of all bookings'
    : timelineMode === 'week'
      ? 'Week view — drag on empty slots to create bookings'
      : 'Day view by resource — drag to set duration';

  const roomFilterControl = (
    <Select value={roomFilter} onValueChange={setRoomFilter}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Types</SelectItem>
        {resourceTypes.map(t => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const detailProps = {
    date: selectedDay,
    bookings: selectedDayBookings,
    selectedBooking,
    onSelectBooking: handleSelectBooking,
    canManage,
    onApprove: handleApprove,
    onReject: handleReject,
    onEdit: handleEdit,
    user,
    canViewAll,
    resources,
  };

  const pendingStatVisible = canManage && pendingCount > 0;
  const visibleStatCount = 2 + (pendingStatVisible ? 1 : 0);
  const statGridClass =
    visibleStatCount >= 3
      ? 'grid-cols-2 md:grid-cols-3'
      : visibleStatCount === 2
        ? 'grid-cols-2'
        : 'grid-cols-1 max-w-xs';

  const showMobileBar = isMobile && selectedDay && selectedDayBookings.length > 0 && !detailSheetOpen;

  return (
    <div
      className={cn(
        'space-y-4 sm:space-y-6',
        showMobileBar && 'pb-[calc(4.25rem+env(safe-area-inset-bottom))]',
      )}
    >
      <PageHeader
        icon={CalendarDays}
        title="Calendar"
        description={pageDescription}
        actions={
          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <div className="flex gap-2 overflow-x-auto pb-0.5 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 shrink-0">
                {VIEW_MODES.map(({ key, icon: Icon, label }) => (
                  <Button
                    key={key}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'h-7 px-2.5 sm:px-3 rounded-md gap-1.5',
                      viewMode === key && 'bg-background shadow text-foreground',
                    )}
                    onClick={() => setViewMode(key)}
                    aria-pressed={viewMode === key}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs sm:text-sm">{label}</span>
                  </Button>
                ))}
              </div>

              {viewMode === 'timeline' && (
                <div className="inline-flex h-9 items-center rounded-lg bg-muted p-1 shrink-0">
                  {TIMELINE_MODES.map(({ key, label }) => (
                    <Button
                      key={key}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'h-7 px-3 rounded-md text-xs sm:text-sm',
                        timelineMode === key && 'bg-background shadow text-foreground',
                      )}
                      onClick={() => setTimelineMode(key)}
                      aria-pressed={timelineMode === key}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {resourceTypes.length > 0 && (
              <>
                <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="md:hidden">
                  <CollapsibleTrigger asChild>
                    <Button variant="outline" className="w-full justify-between h-10">
                      <span className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        Resource type
                        {roomFilter !== 'all' && (
                          <Badge variant="secondary" className="h-5 px-1.5 text-xs">1</Badge>
                        )}
                      </span>
                      <ChevronDown className={cn('w-4 h-4 transition-transform', filtersOpen && 'rotate-180')} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3">
                    {roomFilterControl}
                  </CollapsibleContent>
                </Collapsible>

                <div className="hidden md:block md:w-48">
                  {roomFilterControl}
                </div>
              </>
            )}
          </div>
        }
      />

      {visibleBookings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('grid w-full gap-2.5 sm:gap-3', statGridClass)}
        >
          <CalendarStatPill icon={Clock} label="Today" value={todayBookingCount} color="primary" />
          <CalendarStatPill icon={CalendarDays} label="This month" value={monthBookingCount} color="success" />
          {pendingStatVisible && (
            <CalendarStatPill icon={List} label="Pending" value={pendingCount} color="warning" />
          )}
        </motion.div>
      )}

      <div className="grid w-full grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
        {viewMode === 'month' ? (
          <Card className="lg:col-span-8 xl:col-span-9 rounded-2xl border border-border overflow-hidden min-w-0">
            <CardContent className="p-3 sm:p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                  onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                  aria-label="Previous month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <div className="text-center min-w-0 flex-1">
                  <h2 className="text-sm sm:text-base font-semibold truncate">
                    {format(currentDate, 'MMMM yyyy')}
                  </h2>
                  {!isSameMonth(new Date(), currentDate) && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => {
                        const today = new Date();
                        setCurrentDate(today);
                        setSelectedDay(today);
                      }}
                    >
                      Go to today
                    </Button>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  aria-label="Next month"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <div className="rounded-xl overflow-hidden border border-border">
                <div className="grid grid-cols-7 border-b border-border">
                  {WEEKDAYS.map((d, i) => (
                    <div
                      key={d.full}
                      className={cn(
                        'bg-muted py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground',
                        i < 6 && 'border-r border-border',
                      )}
                    >
                      <span className="sm:hidden">{d.short}</span>
                      <span className="hidden sm:inline">{d.full}</span>
                    </div>
                  ))}
                </div>

                <div className="divide-y divide-border">
                  {calendarWeeks.map((weekDays, weekIndex) => (
                    <MonthCalendarWeek
                      key={weekIndex}
                      weekDays={weekDays}
                      bookings={monthVisibleBookings}
                      currentDate={currentDate}
                      selectedDay={selectedDay}
                      onDaySelect={handleDaySelect}
                      user={user}
                      canViewAll={canViewAll}
                    />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : timelineMode === 'week' ? (
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
            <CalendarWeekTimeline
              date={timelineDate}
              onDateChange={handleTimelineDateChange}
              bookings={weekBookings}
              selectedBookingId={selectedBooking?.id}
              onSelectBooking={handleSelectBooking}
              onSlotCreate={handleSlotCreate}
              canCreate={canBook}
              user={user}
              canViewAll={canViewAll}
            />
          </div>
        ) : (
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
            <CalendarTimeline
              date={timelineDate}
              onDateChange={handleTimelineDateChange}
              resources={filteredResources}
              dayBookings={rawSelectedDayBookings}
              selectedBookingId={selectedBooking?.id}
              onSelectBooking={handleSelectBooking}
              onSlotCreate={handleSlotCreate}
              canCreate={canBook}
              user={user}
              canViewAll={canViewAll}
            />
          </div>
        )}

        {/* Sidebar detail — tablet stacked, desktop beside calendar */}
        <div className="hidden md:block lg:col-span-4 xl:col-span-3 min-w-0">
          <CalendarDayDetail {...detailProps} className="lg:sticky lg:top-20 w-full" />
        </div>
      </div>

      {/* Mobile detail sheet */}
      <Sheet open={detailSheetOpen && isMobile} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>
              {selectedDay ? format(selectedDay, 'EEEE, MMMM d') : 'Day details'}
            </SheetTitle>
          </SheetHeader>
          <CalendarDayDetailContent {...detailProps} />
        </SheetContent>
      </Sheet>

      {/* Mobile floating bar when sheet is closed */}
      {showMobileBar && (
        <div className="fixed inset-x-4 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 md:hidden pointer-events-none">
          <Button
            className="w-full h-11 rounded-2xl shadow-lg shadow-primary/20 gap-2 pointer-events-auto"
            onClick={() => setDetailSheetOpen(true)}
          >
            <List className="w-4 h-4" />
            {selectedDayBookings.length} booking{selectedDayBookings.length === 1 ? '' : 's'} · {format(selectedDay, 'MMM d')}
          </Button>
        </div>
      )}

      <ConfirmActionDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open && !actionLoading) setConfirmAction(null); }}
        title={confirmAction?.type === 'approve' ? 'Approve this booking?' : 'Reject this booking?'}
        description={
          confirmAction?.booking?.isPairedEvent
            ? (confirmAction?.type === 'approve'
              ? `Confirm “${confirmAction?.booking?.title || 'this booking'}” and its paired resource?`
              : `Reject “${confirmAction?.booking?.title || 'this booking'}” and its paired resource? This cannot be undone.`)
            : (confirmAction?.type === 'approve'
              ? `Confirm “${confirmAction?.booking?.title || 'this booking'}”?`
              : `Reject “${confirmAction?.booking?.title || 'this booking'}”? This cannot be undone.`)
        }
        confirmLabel={confirmAction?.type === 'approve' ? 'Approve' : 'Reject'}
        variant={confirmAction?.type === 'reject' ? 'destructive' : 'default'}
        loading={actionLoading}
        onConfirm={runConfirmedAction}
      />
    </div>
  );
}
