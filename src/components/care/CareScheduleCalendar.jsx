import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  ChevronLeft, ChevronRight, CalendarDays, LayoutGrid, GanttChartSquare,
  Clock, AlertTriangle, Info,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import CareResourceTimeline from '@/components/care/CareResourceTimeline';
import CareResourceWeekTimeline from '@/components/care/CareResourceWeekTimeline';
import { CareDayDetail, CareDayDetailContent } from '@/components/care/CareDayDetail';
import {
  careStatusCalendarClass, careStatusDotClass, getCareItemsForDay,
  getCareItemsInMonth, countCareDueToday, countCareOverdueInMonth,
  hasCalendarDueDate, careCalendarPillLabel,
} from '@/lib/resourceCareUtils';
import { cn } from '@/lib/utils';

const VIEW_MODES = [
  { key: 'month', icon: LayoutGrid, label: 'Month' },
  { key: 'timeline', icon: GanttChartSquare, label: 'By resource' },
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
    destructive: 'bg-destructive/10 text-destructive',
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

export default function CareScheduleCalendar({
  schedules,
  resources = [],
  canManage,
  onComplete,
  onEditResource,
}) {
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState('month');
  const [timelineMode, setTimelineMode] = useState('day');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [timelineDate, setTimelineDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const datedItems = useMemo(
    () => schedules.filter(hasCalendarDueDate),
    [schedules],
  );

  const usageOnlyCount = schedules.length - datedItems.length;

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

  const todayDueCount = useMemo(() => countCareDueToday(datedItems), [datedItems]);
  const monthDueCount = useMemo(
    () => getCareItemsInMonth(datedItems, currentDate).length,
    [datedItems, currentDate],
  );
  const overdueMonthCount = useMemo(
    () => countCareOverdueInMonth(datedItems, currentDate),
    [datedItems, currentDate],
  );

  const detailDate = viewMode === 'month' ? selectedDay : timelineDate;
  const selectedDayItems = useMemo(
    () => getCareItemsForDay(datedItems, detailDate),
    [datedItems, detailDate],
  );

  const handleDaySelect = useCallback((day) => {
    setSelectedDay(day);
    setSelectedItem(null);
    if (!isSameMonth(day, currentDate)) {
      setCurrentDate(day);
    }
    if (isMobile) {
      setDetailSheetOpen(true);
    }
  }, [currentDate, isMobile]);

  const handleSelectItem = useCallback((item) => {
    setSelectedItem(prev => (prev?.id === item.id ? null : item));
    if (isMobile) {
      setDetailSheetOpen(true);
    }
  }, [isMobile]);

  const handleTimelineDateChange = useCallback((date) => {
    setTimelineDate(date);
    setSelectedItem(null);
  }, []);

  const handleWeekDaySelect = useCallback((day) => {
    setTimelineDate(day);
    setSelectedDay(day);
    setSelectedItem(null);
    if (isMobile) {
      setDetailSheetOpen(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (selectedItem && !selectedDayItems.some(i => i.id === selectedItem.id)) {
      setSelectedItem(null);
    }
  }, [selectedDayItems, selectedItem]);

  const detailProps = {
    date: detailDate,
    items: selectedDayItems,
    selectedItem,
    onSelectItem: handleSelectItem,
    canManage,
    onComplete,
    onEditResource,
  };

  const visibleStatCount = overdueMonthCount > 0 ? 3 : 2;
  const statGridClass =
    visibleStatCount >= 3
      ? 'grid-cols-2 md:grid-cols-3'
      : 'grid-cols-2';

  return (
    <div className="space-y-4 sm:space-y-6">
      {usageOnlyCount > 0 && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            {usageOnlyCount} usage-based item{usageOnlyCount === 1 ? '' : 's'} (booking hours, odometer, etc.) have no fixed due date — switch to <strong className="text-foreground font-medium">List</strong> to view them.
          </p>
        </div>
      )}

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

      {datedItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn('grid w-full gap-2.5 sm:gap-3', statGridClass)}
        >
          <CalendarStatPill icon={Clock} label="Due today" value={todayDueCount} color="warning" />
          <CalendarStatPill icon={CalendarDays} label="This month" value={monthDueCount} color="success" />
          {overdueMonthCount > 0 && (
            <CalendarStatPill icon={AlertTriangle} label="Overdue (month)" value={overdueMonthCount} color="destructive" />
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

              <div className="grid grid-cols-7 gap-px bg-border rounded-xl overflow-hidden">
                {WEEKDAYS.map(d => (
                  <div
                    key={d.full}
                    className="bg-muted py-1.5 sm:py-2 text-center text-[10px] sm:text-xs font-semibold text-muted-foreground"
                  >
                    <span className="sm:hidden">{d.short}</span>
                    <span className="hidden sm:inline">{d.full}</span>
                  </div>
                ))}

                {calendarDays.map((day, i) => {
                  const dayItems = getCareItemsForDay(datedItems, day);
                  const isSelected = selectedDay && isSameDay(day, selectedDay);
                  const today = isToday(day);
                  const inMonth = isSameMonth(day, currentDate);
                  const hasOverdue = dayItems.some(item => item.status === 'overdue');

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDaySelect(day)}
                      className={cn(
                        'bg-card text-left p-1 sm:p-1.5 transition-colors duration-200',
                        'min-h-[3.25rem] sm:min-h-[4.75rem] md:min-h-[5.5rem] lg:min-h-[6rem]',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                        !inMonth && 'opacity-40',
                        isSelected && 'ring-2 ring-primary ring-inset bg-primary/5',
                        today && !isSelected && 'bg-primary/[0.07]',
                        hasOverdue && !isSelected && 'bg-destructive/[0.04]',
                        !isSelected && 'hover:bg-muted/50',
                      )}
                    >
                      <span
                        className={cn(
                          'inline-flex items-center justify-center text-xs sm:text-sm font-medium',
                          'w-5 h-5 sm:w-6 sm:h-6 rounded-full',
                          today && 'bg-primary text-primary-foreground font-bold',
                          isSelected && !today && 'bg-primary/15 text-primary font-semibold',
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {dayItems.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5 sm:hidden px-0.5">
                          {dayItems.slice(0, 4).map(item => (
                            <span
                              key={item.id}
                              className={cn('w-1.5 h-1.5 rounded-full', careStatusDotClass(item.status))}
                              aria-hidden
                            />
                          ))}
                          {dayItems.length > 4 && (
                            <span className="text-[8px] text-muted-foreground leading-none">+</span>
                          )}
                        </div>
                      )}

                      <div className="mt-0.5 sm:mt-1 space-y-0.5 hidden sm:block">
                        {dayItems.slice(0, 2).map(item => (
                          <div
                            key={item.id}
                            className={cn(
                              'text-[10px] md:text-[11px] px-1 py-0.5 rounded truncate leading-tight',
                              careStatusCalendarClass(item.status),
                            )}
                            title={`${item.label} — ${item.resource_name}`}
                          >
                            {careCalendarPillLabel(item)}
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <p className="text-[10px] text-muted-foreground pl-1">
                            +{dayItems.length - 2} more
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
                {[
                  { status: 'overdue', label: 'Overdue' },
                  { status: 'due', label: 'Due today' },
                  { status: 'upcoming', label: 'Upcoming' },
                  { status: 'ok', label: 'OK' },
                ].map(({ status, label }) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <span className={cn('w-2 h-2 rounded-full', careStatusDotClass(status))} />
                    {label}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : timelineMode === 'week' ? (
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
            <CareResourceWeekTimeline
              date={timelineDate}
              onDateChange={handleTimelineDateChange}
              resources={resources}
              items={datedItems}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectItem}
              onDaySelect={handleWeekDaySelect}
            />
          </div>
        ) : (
          <div className="lg:col-span-8 xl:col-span-9 min-w-0">
            <CareResourceTimeline
              date={timelineDate}
              onDateChange={handleTimelineDateChange}
              resources={resources}
              items={datedItems}
              selectedItemId={selectedItem?.id}
              onSelectItem={handleSelectItem}
            />
          </div>
        )}

        <div className="hidden md:block lg:col-span-4 xl:col-span-3 min-w-0">
          <CareDayDetail {...detailProps} className="lg:sticky lg:top-20 w-full" />
        </div>
      </div>

      <Sheet open={detailSheetOpen && isMobile} onOpenChange={setDetailSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <SheetHeader className="text-left mb-4">
            <SheetTitle>
              {detailDate ? format(detailDate, 'EEEE, MMMM d') : 'Day details'}
            </SheetTitle>
          </SheetHeader>
          <CareDayDetailContent {...detailProps} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
