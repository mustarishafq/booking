import {
  differenceInMinutes,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  isSameDay,
  format,
} from 'date-fns';

export const TIMELINE_START_HOUR = 6;
export const TIMELINE_END_HOUR = 22;
export const TIMELINE_HOUR_HEIGHT = 48;
export const TIMELINE_SNAP_MINUTES = 30;
export const TIMELINE_MIN_DURATION_MINUTES = 30;

const HIDDEN_STATUSES = new Set(['cancelled', 'rejected']);

export function isOwnBooking(booking, user) {
  const email = user?.email?.toLowerCase();
  if (!email || !booking?.booked_by_email) return false;
  return booking.booked_by_email.toLowerCase() === email;
}

export function canViewCalendarBookingDetails(booking, user, canViewAll) {
  if (canViewAll) return true;
  return isOwnBooking(booking, user);
}

export function getCalendarBookingTitle(booking, user, canViewAll) {
  if (canViewCalendarBookingDetails(booking, user, canViewAll)) {
    return booking.title || 'Booking';
  }
  return 'Booked';
}

/** Calendar shows all active bookings so users can see resource availability. */
export function filterCalendarBookings(bookings, { roomFilter = 'all' } = {}) {
  let list = bookings.filter(b => !HIDDEN_STATUSES.has(b.status));

  if (roomFilter !== 'all') {
    list = list.filter(b => b.resource_type === roomFilter);
  }

  return list;
}

/** True when [booking.start_time, booking.end_time) overlaps [rangeStart, rangeEnd]. */
export function bookingOverlapsRange(booking, rangeStart, rangeEnd) {
  return new Date(booking.start_time) < rangeEnd && new Date(booking.end_time) > rangeStart;
}

/** Bookings active on this calendar day (including multi-day spans). */
export function getBookingsForDay(bookings, date) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return bookings.filter(b => bookingOverlapsRange(b, dayStart, dayEnd));
}

/** Bookings that overlap any day in the given month. */
export function getBookingsInMonth(bookings, monthDate) {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  return bookings.filter(b => bookingOverlapsRange(b, start, end));
}

/** Compact time range for calendar blocks; includes dates when multi-day. */
export function formatCalendarTimeRange(booking) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  if (isSameDay(start, end)) {
    return `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`;
  }
  return `${format(start, 'MMM d, h:mm a')} – ${format(end, 'MMM d, h:mm a')}`;
}

export function getWeekDays(date) {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function getWeekRangeLabel(date) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const sameMonth = start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.getDate()}, ${end.getFullYear()}`;
  }
  return `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

export function getTimelineHours(startHour = TIMELINE_START_HOUR, endHour = TIMELINE_END_HOUR) {
  return Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
}

export function getTimelineWindow(date, startHour = TIMELINE_START_HOUR, endHour = TIMELINE_END_HOUR) {
  const dayBase = startOfDay(date);
  return {
    start: setMinutes(setHours(dayBase, startHour), 0),
    end: setMinutes(setHours(dayBase, endHour), 0),
    totalMinutes: (endHour - startHour) * 60,
  };
}

export function snapMinutesValue(minutes, snap = TIMELINE_SNAP_MINUTES) {
  return Math.round(minutes / snap) * snap;
}

export function clampTimelineMinutes(minutes, totalMinutes) {
  return Math.max(0, Math.min(minutes, totalMinutes));
}

export function pctToMinutes(pct, totalMinutes) {
  return clampTimelineMinutes(snapMinutesValue(pct * totalMinutes), totalMinutes);
}

export function minutesToPct(minutes, totalMinutes) {
  return (minutes / totalMinutes) * 100;
}

export function slotFromMinutes(date, startMinutes, endMinutes, startHour = TIMELINE_START_HOUR) {
  const dayBase = startOfDay(date);
  const start = addMinutesToDay(dayBase, startHour, startMinutes);
  const end = addMinutesToDay(dayBase, startHour, Math.max(endMinutes, startMinutes + TIMELINE_MIN_DURATION_MINUTES));
  return { start, end };
}

function addMinutesToDay(dayBase, startHour, offsetMinutes) {
  const base = setMinutes(setHours(dayBase, startHour), 0);
  return new Date(base.getTime() + offsetMinutes * 60 * 1000);
}

export function toDateTimeLocalValue(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function getBookingTimelinePosition(booking, date, startHour = TIMELINE_START_HOUR, endHour = TIMELINE_END_HOUR) {
  const { start: windowStart, end: windowEnd, totalMinutes } = getTimelineWindow(date, startHour, endHour);

  const bookingStart = new Date(booking.start_time);
  const bookingEnd = new Date(booking.end_time);

  const effectiveStart = bookingStart < windowStart ? windowStart : bookingStart;
  const effectiveEnd = bookingEnd > windowEnd ? windowEnd : bookingEnd;

  if (effectiveEnd <= effectiveStart) {
    return null;
  }

  const offsetMinutes = differenceInMinutes(effectiveStart, windowStart);
  const durationMinutes = differenceInMinutes(effectiveEnd, effectiveStart);

  const left = minutesToPct(offsetMinutes, totalMinutes);
  const width = minutesToPct(durationMinutes, totalMinutes);

  return {
    left: `${Math.max(0, left)}%`,
    width: `${Math.min(100 - left, Math.max(width, 1.5))}%`,
  };
}

export function getWeekBookingPosition(booking, day, startHour = TIMELINE_START_HOUR, endHour = TIMELINE_END_HOUR) {
  const { start: windowStart, end: windowEnd, totalMinutes } = getTimelineWindow(day, startHour, endHour);
  const bookingStart = new Date(booking.start_time);
  const bookingEnd = new Date(booking.end_time);

  const effectiveStart = bookingStart < windowStart ? windowStart : bookingStart;
  const effectiveEnd = bookingEnd > windowEnd ? windowEnd : bookingEnd;

  if (effectiveEnd <= effectiveStart) return null;

  const topMinutes = differenceInMinutes(effectiveStart, windowStart);
  const heightMinutes = differenceInMinutes(effectiveEnd, effectiveStart);

  return {
    top: `${(topMinutes / totalMinutes) * 100}%`,
    height: `${Math.max((heightMinutes / totalMinutes) * 100, 2)}%`,
    hourSpan: heightMinutes / 60,
  };
}

export function buildTimelineRows(resources, dayBookings) {
  const rowMap = new Map();

  resources
    .filter(r => r.status === 'active')
    .forEach(resource => {
      rowMap.set(resource.id, {
        id: resource.id,
        name: resource.name,
        type: resource.resource_type,
        bookings: [],
      });
    });

  dayBookings.forEach(booking => {
    const key = booking.resource_id;
    if (!rowMap.has(key)) {
      rowMap.set(key, {
        id: key,
        name: booking.resource_name || booking.room_name || 'Unknown resource',
        type: booking.resource_type,
        bookings: [],
      });
    }
    rowMap.get(key).bookings.push(booking);
  });

  return [...rowMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function navigateDay(date, direction) {
  return direction === 'prev' ? subDays(date, 1) : addDays(date, 1);
}

export function navigateWeek(date, direction) {
  return direction === 'prev' ? subWeeks(date, 1) : addWeeks(date, 1);
}

export function bookingOverlapsSlot(bookings, resourceId, start, end, excludeId) {
  return bookings.some(b =>
    b.resource_id === resourceId &&
    b.id !== excludeId &&
    !HIDDEN_STATUSES.has(b.status) &&
    new Date(b.start_time) < end &&
    new Date(b.end_time) > start,
  );
}

export function getBookingsInWeek(bookings, weekDate) {
  const start = startOfWeek(weekDate);
  const end = endOfWeek(weekDate);
  return bookings.filter(b => bookingOverlapsRange(b, start, end));
}

/**
 * Lay out multi-day booking bars for one calendar week (Sun–Sat).
 * Returns positioned segments that can span consecutive day columns.
 */
export function layoutMonthWeekBars(bookings, weekDays, { maxLanes = 2 } = {}) {
  if (!weekDays?.length) return { bars: [], overflowByDay: Array(7).fill(0) };

  const weekStart = startOfDay(weekDays[0]);
  const weekEndExclusive = addDays(startOfDay(weekDays[weekDays.length - 1]), 1);

  const candidates = [];
  for (const booking of bookings) {
    if (!bookingOverlapsRange(booking, weekStart, weekEndExclusive)) continue;

    let startCol = -1;
    let endCol = -1;
    for (let i = 0; i < weekDays.length; i += 1) {
      const dayStart = startOfDay(weekDays[i]);
      const dayEnd = addDays(dayStart, 1);
      if (bookingOverlapsRange(booking, dayStart, dayEnd)) {
        if (startCol === -1) startCol = i;
        endCol = i;
      }
    }
    if (startCol === -1) continue;

    const bookingStart = new Date(booking.start_time);
    const bookingEnd = new Date(booking.end_time);
    const afterSegmentEnd = addDays(startOfDay(weekDays[endCol]), 1);
    candidates.push({
      booking,
      startCol,
      endCol,
      span: endCol - startCol + 1,
      isStart: isSameDay(bookingStart, weekDays[startCol]),
      isEnd: !bookingOverlapsRange(booking, afterSegmentEnd, addDays(afterSegmentEnd, 1)),
      continuesBefore: bookingStart < weekStart,
      continuesAfter: bookingEnd > weekEndExclusive,
    });
  }

  candidates.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    if (b.span !== a.span) return b.span - a.span;
    return new Date(a.booking.start_time) - new Date(b.booking.start_time);
  });

  const laneEnds = Array.from({ length: maxLanes }, () => -1);
  const bars = [];
  const overflowByDay = Array(7).fill(0);

  for (const item of candidates) {
    let lane = -1;
    for (let i = 0; i < maxLanes; i += 1) {
      if (laneEnds[i] < item.startCol) {
        lane = i;
        break;
      }
    }
    if (lane === -1) {
      for (let d = item.startCol; d <= item.endCol; d += 1) overflowByDay[d] += 1;
      continue;
    }
    laneEnds[lane] = item.endCol;
    bars.push({
      id: item.booking.id,
      booking: item.booking,
      lane,
      startCol: item.startCol,
      span: item.span,
      isStart: item.isStart,
      isEnd: item.isEnd,
      showLabel: item.isStart || item.continuesBefore,
    });
  }

  return { bars, overflowByDay };
}

export function dragPreviewStyle(anchorPct, currentPct) {
  const left = Math.min(anchorPct, currentPct);
  const width = Math.abs(currentPct - anchorPct);
  return {
    left: `${left * 100}%`,
    width: `${Math.max(width * 100, 1.5)}%`,
  };
}

export function dragPreviewStyleVertical(anchorPct, currentPct) {
  const top = Math.min(anchorPct, currentPct);
  const height = Math.abs(currentPct - anchorPct);
  return {
    top: `${top * 100}%`,
    height: `${Math.max(height * 100, 2)}%`,
  };
}

export function slotFromHorizontalDrag(date, resourceId, anchorPct, currentPct, startHour, endHour) {
  const { totalMinutes } = getTimelineWindow(date, startHour, endHour);
  const startMin = pctToMinutes(Math.min(anchorPct, currentPct), totalMinutes);
  let endMin = pctToMinutes(Math.max(anchorPct, currentPct), totalMinutes);
  if (endMin - startMin < TIMELINE_MIN_DURATION_MINUTES) {
    endMin = startMin + TIMELINE_MIN_DURATION_MINUTES;
  }
  const { start, end } = slotFromMinutes(date, startMin, endMin, startHour);
  return { date, resourceId, start, end };
}

export function slotFromVerticalDrag(day, anchorPct, currentPct, startHour, endHour) {
  const { totalMinutes } = getTimelineWindow(day, startHour, endHour);
  const startMin = pctToMinutes(Math.min(anchorPct, currentPct), totalMinutes);
  let endMin = pctToMinutes(Math.max(anchorPct, currentPct), totalMinutes);
  if (endMin - startMin < TIMELINE_MIN_DURATION_MINUTES) {
    endMin = startMin + TIMELINE_MIN_DURATION_MINUTES;
  }
  const { start, end } = slotFromMinutes(day, startMin, endMin, startHour);
  return { date: day, start, end };
}

export function slotFromClickHorizontal(date, resourceId, pct, startHour, endHour, defaultDurationMinutes = 60) {
  const { totalMinutes } = getTimelineWindow(date, startHour, endHour);
  const startMin = pctToMinutes(pct, totalMinutes);
  const endMin = Math.min(startMin + defaultDurationMinutes, totalMinutes);
  const { start, end } = slotFromMinutes(date, startMin, endMin, startHour);
  return { date, resourceId, start, end };
}

export function slotFromClickVertical(day, pct, startHour, endHour, defaultDurationMinutes = 60) {
  const { totalMinutes } = getTimelineWindow(day, startHour, endHour);
  const startMin = pctToMinutes(pct, totalMinutes);
  const endMin = Math.min(startMin + defaultDurationMinutes, totalMinutes);
  const { start, end } = slotFromMinutes(day, startMin, endMin, startHour);
  return { date: day, start, end };
}
