import { format, isSameDay, isSameMonth, isToday } from 'date-fns';
import { bookingStatusSolid, getPairedResourceLabel } from '@/lib/bookingUtils';
import {
  getBookingsForDay,
  getCalendarBookingTitle,
  layoutMonthWeekBars,
} from '@/lib/calendarUtils';
import { cn } from '@/lib/utils';

/** Must match day button top padding + day-number circle height. */
const DATE_HEADER = '1.875rem';
const BAR_HEIGHT_REM = 1;
const LANE_GAP_REM = 0.25;
const LANE_STRIDE_REM = BAR_HEIGHT_REM + LANE_GAP_REM;
const EDGE_GAP_REM = 0.2;

function statusDotClass(status) {
  const map = {
    confirmed: 'bg-success',
    pending: 'bg-warning',
    completed: 'bg-success',
    cancelled: 'bg-destructive/60',
    rejected: 'bg-destructive',
  };
  return map[status] || 'bg-muted-foreground';
}

export default function MonthCalendarWeek({
  weekDays,
  bookings,
  currentDate,
  selectedDay,
  onDaySelect,
  user,
  canViewAll,
}) {
  const { bars, overflowByDay } = layoutMonthWeekBars(bookings, weekDays, { maxLanes: 2 });
  const laneCount = bars.reduce((max, bar) => Math.max(max, bar.lane + 1), 0);
  const hasOverflow = overflowByDay.some(n => n > 0);
  const eventStackRem = Math.max(
    1.5,
    (laneCount > 0 ? laneCount * LANE_STRIDE_REM - LANE_GAP_REM : 0)
      + (hasOverflow ? 1 : 0)
      + 0.35,
  );

  return (
    <div className="relative">
      {/* Layer 0: clickable day cells (background / selection) */}
      <div className="grid grid-cols-7">
        {weekDays.map((day, dayIndex) => {
          const dayBookings = getBookingsForDay(bookings, day);
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <button
              key={dayIndex}
              type="button"
              onClick={() => onDaySelect(day)}
              aria-label={format(day, 'EEEE, MMMM d')}
              className={cn(
                'relative bg-card text-left p-1 sm:p-1.5 transition-colors duration-200',
                'min-h-[4.5rem] sm:min-h-[5.25rem] md:min-h-[5.75rem]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                dayIndex < 6 && 'border-r border-border',
                !inMonth && 'opacity-40',
                isSelected && 'ring-2 ring-primary ring-inset bg-primary/5',
                today && !isSelected && 'bg-primary/[0.07]',
                !isSelected && 'hover:bg-muted/50',
              )}
            >
              {/* Invisible spacer keeps layout height; visible date is layered above */}
              <span className="invisible inline-flex w-5 h-5 sm:w-6 sm:h-6" aria-hidden>
                {format(day, 'd')}
              </span>

              {dayBookings.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden px-0.5">
                  {dayBookings.slice(0, 4).map(b => (
                    <span
                      key={b.id}
                      className={cn('w-1.5 h-1.5 rounded-full', statusDotClass(b.status))}
                      aria-hidden
                    />
                  ))}
                  {dayBookings.length > 4 && (
                    <span className="text-[8px] text-muted-foreground leading-none">+</span>
                  )}
                </div>
              )}

              <div
                className="hidden sm:block mt-1"
                style={{ height: `${eventStackRem}rem` }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {/* Layer 1: spanning event bars — only under the date header */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-1 z-[1] hidden sm:block"
        style={{ top: `calc(${DATE_HEADER} + 0.35rem)` }}
      >
        {bars.map(bar => {
          const pillLabel = bar.booking.isPairedEvent
            ? getPairedResourceLabel(bar.booking) || getCalendarBookingTitle(bar.booking, user, canViewAll)
            : getCalendarBookingTitle(bar.booking, user, canViewAll);
          const leftInset = bar.isStart ? EDGE_GAP_REM : 0;
          const rightInset = bar.isEnd ? EDGE_GAP_REM : 0;

          return (
            <div
              key={bar.id}
              className={cn(
                'absolute px-1 text-[10px] md:text-[11px] truncate',
                bar.isStart && bar.isEnd && 'rounded',
                bar.isStart && !bar.isEnd && 'rounded-l',
                !bar.isStart && bar.isEnd && 'rounded-r',
                !bar.isStart && !bar.isEnd && 'rounded-none',
                bar.booking.isPairedEvent && 'ring-1 ring-inset ring-white/25',
                bookingStatusSolid[bar.booking.status] || 'bg-muted text-muted-foreground',
              )}
              style={{
                left: `calc(${(bar.startCol / 7) * 100}% + ${leftInset}rem)`,
                width: `calc(${(bar.span / 7) * 100}% - ${leftInset + rightInset}rem)`,
                top: `${bar.lane * LANE_STRIDE_REM}rem`,
                height: `${BAR_HEIGHT_REM}rem`,
                lineHeight: `${BAR_HEIGHT_REM}rem`,
              }}
              title={bar.booking.isPairedEvent
                ? `${getCalendarBookingTitle(bar.booking, user, canViewAll)} · ${getPairedResourceLabel(bar.booking)}`
                : pillLabel}
            >
              {bar.showLabel ? pillLabel : '\u00a0'}
            </div>
          );
        })}

        {weekDays.map((_, dayIndex) => (
          overflowByDay[dayIndex] > 0 ? (
            <p
              key={`overflow-${dayIndex}`}
              className="absolute pl-1 text-[10px] text-muted-foreground truncate"
              style={{
                left: `calc(${(dayIndex / 7) * 100}% + ${EDGE_GAP_REM}rem)`,
                width: `calc(${100 / 7}% - ${EDGE_GAP_REM * 2}rem)`,
                top: `${laneCount * LANE_STRIDE_REM}rem`,
              }}
            >
              +{overflowByDay[dayIndex]} more
            </p>
          ) : null
        ))}
      </div>

      {/* Layer 2: date numbers always paint above bars */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] grid grid-cols-7">
        {weekDays.map((day, dayIndex) => {
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const today = isToday(day);
          const inMonth = isSameMonth(day, currentDate);

          return (
            <div
              key={dayIndex}
              className={cn(
                'p-1 sm:p-1.5',
                !inMonth && 'opacity-40',
              )}
            >
              <span
                className={cn(
                  'inline-flex items-center justify-center text-xs sm:text-sm font-medium',
                  'w-5 h-5 sm:w-6 sm:h-6 rounded-full',
                  today && 'bg-primary text-primary-foreground font-bold',
                  isSelected && !today && 'bg-primary/15 text-primary font-semibold',
                  !today && !isSelected && 'bg-card',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
