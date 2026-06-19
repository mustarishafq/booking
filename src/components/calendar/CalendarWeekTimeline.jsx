import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import { Calendar } from 'lucide-react';
import { bookingStatusSolid } from '@/lib/bookingUtils';
import {
  getTimelineHours,
  getWeekDays,
  getWeekRangeLabel,
  getWeekBookingPosition,
  navigateWeek,
  getBookingsForDay,
  getCalendarBookingTitle,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
  TIMELINE_HOUR_HEIGHT,
} from '@/lib/calendarUtils';
import { useVerticalTimelineDrag } from '@/hooks/useTimelineDrag';
import { cn } from '@/lib/utils';

function ScrollFadeHint() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10 md:hidden"
      aria-hidden
    />
  );
}

export default function CalendarWeekTimeline({
  date,
  onDateChange,
  bookings,
  selectedBookingId,
  onSelectBooking,
  onSlotCreate,
  canCreate = false,
  user,
  canViewAll = false,
}) {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const hours = useMemo(() => getTimelineHours(), []);
  const totalHeight = hours.length * TIMELINE_HOUR_HEIGHT;

  const { previewStyle, onPointerDown, drag } = useVerticalTimelineDrag({
    enabled: canCreate,
    onSlotCreate,
  });

  const hasAnyBookings = weekDays.some(day => getBookingsForDay(bookings, day).length > 0);
  const isCurrentWeek = weekDays.some(day => isToday(day));

  return (
    <Card className="rounded-2xl border border-border overflow-hidden">
      <CardContent className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={() => onDateChange(navigateWeek(date, 'prev'))}
            aria-label="Previous week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>

          <div className="text-center min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-semibold truncate">{getWeekRangeLabel(date)}</h2>
            {isCurrentWeek ? (
              <p className="text-xs text-primary font-medium">This week</p>
            ) : (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 text-xs text-primary"
                onClick={() => onDateChange(new Date())}
              >
                Go to this week
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
            onClick={() => onDateChange(navigateWeek(date, 'next'))}
            aria-label="Next week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {canCreate && (
          <p className="text-xs text-muted-foreground hidden sm:block">
            Drag on an empty slot to create a booking, or click for a 1-hour slot.
          </p>
        )}

        <div className="relative -mx-1">
          <ScrollFadeHint />
          <div className="overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
            <div className="min-w-[520px] sm:min-w-[640px] md:min-w-[760px]">
              {/* Day headers */}
              <div className="flex border-b border-border sticky top-0 bg-card z-[5]">
                <div className="w-10 sm:w-14 shrink-0" />
                {weekDays.map(day => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'flex-1 min-w-[64px] sm:min-w-[80px] md:min-w-[96px] p-1.5 sm:p-2 text-center border-l border-border/60',
                      isToday(day) && 'bg-primary/5',
                    )}
                  >
                    <p className="text-[9px] sm:text-[10px] font-semibold text-muted-foreground uppercase">
                      <span className="sm:hidden">{format(day, 'EEEEE')}</span>
                      <span className="hidden sm:inline">{format(day, 'EEE')}</span>
                    </p>
                    <p className={cn(
                      'text-xs sm:text-sm font-semibold mt-0.5',
                      isToday(day) && 'text-primary',
                    )}
                    >
                      <span className={cn(
                        'inline-flex items-center justify-center',
                        isToday(day) && 'w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-primary-foreground',
                      )}
                      >
                        {format(day, 'd')}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              {/* Time grid */}
              <div className="flex">
                {/* Hour labels */}
                <div className="w-10 sm:w-14 shrink-0 relative" style={{ height: totalHeight }}>
                  {hours.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute right-1 sm:right-2 text-[9px] sm:text-[10px] text-muted-foreground -translate-y-1/2"
                      style={{ top: i * TIMELINE_HOUR_HEIGHT + TIMELINE_HOUR_HEIGHT / 2 }}
                    >
                      {format(setHour(new Date(), hour), 'ha')}
                    </div>
                  ))}
                </div>

                {/* Day columns */}
                {weekDays.map(day => {
                  const dayBookings = getBookingsForDay(bookings, day);
                  const isDragDay = drag?.day && format(drag.day, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        'flex-1 min-w-[64px] sm:min-w-[80px] md:min-w-[96px] relative border-l border-border/60 bg-muted/10',
                        canCreate && 'cursor-crosshair',
                        isToday(day) && 'bg-primary/[0.03]',
                      )}
                      style={{ height: totalHeight }}
                      onPointerDown={canCreate ? (e) => onPointerDown(e, { day }) : undefined}
                    >
                      {hours.map((hour, i) => (
                        <div
                          key={hour}
                          className="absolute inset-x-0 border-t border-border/40 pointer-events-none"
                          style={{ top: i * TIMELINE_HOUR_HEIGHT }}
                        />
                      ))}

                      {isDragDay && previewStyle && (
                        <div
                          className="absolute inset-x-0.5 sm:inset-x-1 rounded-md bg-primary/20 border-2 border-primary border-dashed pointer-events-none z-20"
                          style={previewStyle}
                        />
                      )}

                      {dayBookings.map(booking => {
                        const position = getWeekBookingPosition(
                          booking,
                          day,
                          TIMELINE_START_HOUR,
                          TIMELINE_END_HOUR,
                        );
                        if (!position) return null;

                        const isSelected = selectedBookingId === booking.id;

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
                              'absolute inset-x-0.5 sm:inset-x-1 rounded-md px-1 sm:px-1.5 py-0.5 sm:py-1 text-left overflow-hidden z-10',
                              'border border-white/20 shadow-sm hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                              bookingStatusSolid[booking.status] || 'bg-primary text-primary-foreground',
                              isSelected && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                            )}
                            style={{ top: position.top, height: position.height, minHeight: '1rem' }}
                            title={`${booking.title} · ${booking.resource_name || ''} · ${format(new Date(booking.start_time), 'h:mm a')} – ${format(new Date(booking.end_time), 'h:mm a')}`}
                          >
                            <p className="text-[9px] sm:text-[10px] font-semibold truncate leading-tight">{booking.title}</p>
                            <p className="text-[8px] sm:text-[9px] opacity-90 truncate hidden sm:block">{booking.resource_name}</p>
                            <p className="text-[8px] opacity-80 truncate hidden md:block">
                              {format(new Date(booking.start_time), 'h:mm a')}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 md:hidden pl-1">
            Swipe horizontally to see all days
          </p>
        </div>

        {!hasAnyBookings && !canCreate && (
          <EmptyState
            icon={Calendar}
            title="No bookings this week"
            description="Nothing scheduled for the selected week."
            className="py-8"
          />
        )}

        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          {TIMELINE_START_HOUR}:00 – {TIMELINE_END_HOUR}:00
        </p>
      </CardContent>
    </Card>
  );
}

function setHour(date, hour) {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d;
}
