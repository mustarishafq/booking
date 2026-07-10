import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Calendar, MapPin, User, Phone, Pencil, Link2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ui/EmptyState';
import {
  bookingStatusSolid, bookingStatusBadge, getBookingPhone, phoneTelHref, isBookingEditable,
} from '@/lib/bookingUtils';
import {
  getTimelineHours,
  getBookingTimelinePosition,
  buildTimelineRows,
  navigateDay,
  getCalendarBookingTitle,
  canViewCalendarBookingDetails,
  isOwnBooking,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
} from '@/lib/calendarUtils';
import { useHorizontalTimelineDrag } from '@/hooks/useTimelineDrag';
import { cn } from '@/lib/utils';

function ScrollFadeHint() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10 md:hidden"
      aria-hidden
    />
  );
}

export default function CalendarTimeline({
  date,
  onDateChange,
  resources,
  dayBookings,
  selectedBookingId,
  onSelectBooking,
  onSlotCreate,
  canCreate = false,
  user,
  canViewAll = false,
}) {
  const hours = useMemo(() => getTimelineHours(), []);
  const rows = useMemo(
    () => buildTimelineRows(resources, dayBookings),
    [resources, dayBookings],
  );

  const { previewStyle, onPointerDown, drag } = useHorizontalTimelineDrag({
    enabled: canCreate,
    onSlotCreate,
  });

  return (
    <Card className="rounded-2xl border border-border overflow-hidden">
      <CardContent className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={() => onDateChange(navigateDay(date, 'prev'))}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-center min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold truncate">
              {format(date, 'EEEE, MMMM d')}
            </h2>
            {isToday(date) ? (
              <p className="text-xs text-primary font-medium">Today</p>
            ) : (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => onDateChange(new Date())}
              >
                Go to today
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={() => onDateChange(navigateDay(date, 'next'))}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {canCreate && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            Drag across an empty slot to set duration, or click for a 1-hour booking.
          </p>
        )}

        {rows.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No resources to show"
            description="No active resources match your filters for this day."
            className="py-10 sm:py-12"
          />
        ) : (
          <div className="relative -mx-1">
            <ScrollFadeHint />
            <div className="overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <div className="min-w-[560px] sm:min-w-[640px] md:min-w-[720px]">
                <div className="flex border-b border-border">
                  <div className="w-24 sm:w-36 md:w-44 shrink-0 p-1.5 sm:p-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resource
                  </div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}>
                    {hours.map(hour => (
                      <div
                        key={hour}
                        className="border-l border-border/60 px-0.5 sm:px-1 py-1.5 sm:py-2 text-[9px] sm:text-[10px] md:text-xs text-muted-foreground text-center"
                      >
                        {format(setHourDate(date, hour), 'ha')}
                      </div>
                    ))}
                  </div>
                </div>

                {rows.map(row => {
                  const isDragRow = drag?.resourceId === row.id;

                  return (
                    <div key={row.id} className="flex border-b border-border/60 last:border-b-0">
                      <div className="w-24 sm:w-36 md:w-44 shrink-0 p-1.5 sm:p-2 border-r border-border/60">
                        <p className="text-xs sm:text-sm font-medium truncate">{row.name}</p>
                        {row.type && (
                          <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{row.type}</p>
                        )}
                      </div>

                      <div
                        className={cn(
                          'flex-1 relative h-12 sm:h-14 md:h-16 bg-muted/20',
                          canCreate && 'cursor-crosshair',
                        )}
                        onPointerDown={canCreate ? (e) => onPointerDown(e, { date, resourceId: row.id }) : undefined}
                      >
                        <div
                          className="absolute inset-0 grid pointer-events-none"
                          style={{ gridTemplateColumns: `repeat(${hours.length}, minmax(0, 1fr))` }}
                        >
                          {hours.map(hour => (
                            <div key={hour} className="border-l border-border/40 first:border-l-0" />
                          ))}
                        </div>

                        {isDragRow && previewStyle && (
                          <div
                            className="absolute top-1 bottom-1 sm:top-1.5 sm:bottom-1.5 rounded-md bg-primary/20 border-2 border-primary border-dashed pointer-events-none z-20"
                            style={previewStyle}
                          />
                        )}

                        {row.bookings.map(booking => {
                          const position = getBookingTimelinePosition(
                            booking,
                            date,
                            TIMELINE_START_HOUR,
                            TIMELINE_END_HOUR,
                          );
                          if (!position) return null;

                          const isSelected = selectedBookingId === booking.id;
                          const label = getCalendarBookingTitle(booking, user, canViewAll);

                          return (
                            <button
                              key={booking.id}
                              type="button"
                              data-booking-block
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectBooking?.(booking);
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className={cn(
                                'absolute top-1 bottom-1 sm:top-1.5 sm:bottom-1.5 rounded-md px-1 sm:px-1.5 py-0.5 text-left overflow-hidden z-10',
                                'border border-white/20 shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                bookingStatusSolid[booking.status] || 'bg-primary text-primary-foreground',
                                isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                              )}
                              style={{ left: position.left, width: position.width, minWidth: '1.5rem' }}
                              title={`${label} · ${format(new Date(booking.start_time), 'h:mm a')} – ${format(new Date(booking.end_time), 'h:mm a')}`}
                            >
                              <p className="text-[9px] sm:text-[10px] md:text-xs font-semibold truncate leading-tight">
                                {label}
                              </p>
                              <p className="text-[8px] sm:text-[9px] md:text-[10px] opacity-90 truncate hidden sm:block">
                                {format(new Date(booking.start_time), 'h:mm a')} – {format(new Date(booking.end_time), 'h:mm a')}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5 md:hidden pl-1">
              Swipe horizontally to see all hours
            </p>
          </div>
        )}

        {dayBookings.length > 0 && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span>
              {dayBookings.length} booking{dayBookings.length === 1 ? '' : 's'} · {TIMELINE_START_HOUR}:00 – {TIMELINE_END_HOUR}:00
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function setHourDate(date, hour) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function CalendarDayDetailContent({
  date,
  bookings,
  selectedBooking,
  onSelectBooking,
  canManage,
  onApprove,
  onReject,
  onEdit,
  user,
  canViewAll = false,
  resources = [],
}) {
  const displayBookings = (() => {
    if (!selectedBooking) return bookings;
    const match = bookings.find(
      b => b.id === selectedBooking.id || b.pairedSibling?.id === selectedBooking.id,
    );
    if (match) return [match, ...bookings.filter(b => b.id !== match.id)];
    return [selectedBooking, ...bookings.filter(b => b.id !== selectedBooking.id)];
  })();

  if (!date) {
    return <p className="text-sm text-muted-foreground">Select a day to see its bookings</p>;
  }

  if (displayBookings.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No bookings"
        description={`Nothing scheduled for ${format(date, 'MMMM d')}.`}
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {displayBookings.map(b => {
        const isSelected = selectedBooking?.id === b.id
          || (b.isPairedEvent && selectedBooking?.id === b.pairedSibling?.id);
        const showDetails = canViewCalendarBookingDetails(b, user, canViewAll);
        const title = getCalendarBookingTitle(b, user, canViewAll);
        const primaryPhone = getBookingPhone(b, resources);
        const siblingPhone = b.isPairedEvent
          ? getBookingPhone(b.pairedSibling, resources)
          : null;
        const primaryCallHref = phoneTelHref(primaryPhone);
        const siblingCallHref = phoneTelHref(siblingPhone);
        const canEdit = isSelected
          && onEdit
          && isBookingEditable(b)
          && (canManage || isOwnBooking(b, user));
        const showPending = canManage && b.status === 'pending' && isSelected;
        const showActions = primaryCallHref || siblingCallHref || showPending || canEdit;
        const primaryName = b.resource_name || b.room_name;
        const siblingName = b.pairedSibling?.resource_name || b.pairedSibling?.room_name;

        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBooking?.(b)}
            className={cn(
              'w-full text-left rounded-xl border p-3 sm:p-3.5 space-y-2 transition-all duration-200',
              isSelected
                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                : 'bg-card border-border hover:border-primary/20 hover:shadow-sm',
              b.isPairedEvent && !isSelected && 'border-primary/15',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold leading-snug line-clamp-2">{title}</p>
                {b.isPairedEvent && (
                  <Badge
                    variant="outline"
                    className="h-5 gap-1 text-[10px] border-primary/30 text-primary bg-primary/5"
                  >
                    <Link2 className="w-3 h-3" />
                    Paired
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className={cn('shrink-0 capitalize text-[10px] sm:text-xs border-0', bookingStatusBadge[b.status])}>
                {b.status}
              </Badge>
            </div>

            {b.isPairedEvent && (primaryName || siblingName) ? (
              <div className="rounded-lg bg-muted/50 border border-border/60 p-2 space-y-1.5">
                {primaryName && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <MapPin className="w-3 h-3 shrink-0 text-muted-foreground" />
                    <span className="truncate font-medium">{primaryName}</span>
                    {b.resource_type && (
                      <span className="text-muted-foreground truncate">· {b.resource_type}</span>
                    )}
                  </div>
                )}
                {siblingName && (
                  <div className="flex items-center gap-1.5 text-xs text-foreground">
                    <Link2 className="w-3 h-3 shrink-0 text-primary" />
                    <span className="truncate font-medium">{siblingName}</span>
                    {b.pairedSibling?.resource_type && (
                      <span className="text-muted-foreground truncate">· {b.pairedSibling.resource_type}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (primaryName) && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{primaryName}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 shrink-0" />
              <span>
                {format(new Date(b.start_time), 'h:mm a')} – {format(new Date(b.end_time), 'h:mm a')}
              </span>
            </div>

            {showDetails && b.booked_by_email && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <User className="w-3 h-3 shrink-0" />
                <span className="truncate">{b.booked_by_name || b.booked_by_email}</span>
              </div>
            )}

            {showActions && (
              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/60">
                {primaryCallHref && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs flex-1"
                    asChild
                  >
                    <a href={primaryCallHref} onClick={(e) => e.stopPropagation()}>
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      {b.isPairedEvent && siblingCallHref
                        ? `Call ${primaryName || 'resource'}`
                        : 'Call'}
                    </a>
                  </Button>
                )}
                {siblingCallHref && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs flex-1"
                    asChild
                  >
                    <a href={siblingCallHref} onClick={(e) => e.stopPropagation()}>
                      <Phone className="w-3.5 h-3.5 mr-1.5" />
                      Call {siblingName || 'pair'}
                    </a>
                  </Button>
                )}
                {canEdit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs flex-1"
                    onClick={(e) => { e.stopPropagation(); onEdit(b); }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
                {showPending && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-success border-success/30 hover:bg-success/10 hover:text-success flex-1"
                      onClick={(e) => { e.stopPropagation(); onApprove(b); }}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive flex-1"
                      onClick={(e) => { e.stopPropagation(); onReject(b); }}
                    >
                      Reject
                    </Button>
                  </>
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CalendarDayDetail({
  date,
  bookings,
  selectedBooking,
  onSelectBooking,
  canManage,
  onApprove,
  onReject,
  onEdit,
  user,
  canViewAll = false,
  resources = [],
  className,
}) {
  return (
    <Card className={cn('rounded-2xl border border-border flex flex-col max-h-[calc(100dvh-6rem)]', className)}>
      <CardContent className="p-4 md:p-5 flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-4 shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">
              {date ? format(date, 'EEEE') : 'Select a day'}
            </h3>
            {date && (
              <p className="text-sm text-muted-foreground">{format(date, 'MMMM d, yyyy')}</p>
            )}
          </div>
          {bookings.length > 0 && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {bookings.length}
            </Badge>
          )}
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 -mr-1 pr-1 [scrollbar-width:thin]">
          <CalendarDayDetailContent
            date={date}
            bookings={bookings}
            selectedBooking={selectedBooking}
            onSelectBooking={onSelectBooking}
            canManage={canManage}
            onApprove={onApprove}
            onReject={onReject}
            onEdit={onEdit}
            user={user}
            canViewAll={canViewAll}
            resources={resources}
          />
        </div>
      </CardContent>
    </Card>
  );
}
