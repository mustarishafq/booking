import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import { getWeekDays, getWeekRangeLabel, navigateWeek } from '@/lib/calendarUtils';
import {
  buildCareResourceWeekRows, getCareItemsForDay,
  careStatusCalendarClass, careStatusDotClass, careCalendarPillLabel,
} from '@/lib/resourceCareUtils';
import { cn } from '@/lib/utils';

function ScrollFadeHint() {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent z-10 md:hidden"
      aria-hidden
    />
  );
}

export default function CareResourceWeekTimeline({
  date,
  onDateChange,
  resources,
  items,
  selectedItemId,
  onSelectItem,
  onDaySelect,
}) {
  const weekDays = useMemo(() => getWeekDays(date), [date]);
  const rows = useMemo(
    () => buildCareResourceWeekRows(resources, items, date),
    [resources, items, date],
  );
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

        {rows.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No care due"
            description="No resources have care items due this week."
            className="py-10 sm:py-12"
          />
        ) : (
          <div className="relative -mx-1">
            <ScrollFadeHint />
            <div className="overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <div className="min-w-[520px] sm:min-w-[640px] md:min-w-[760px]">
                <div className="flex border-b border-border sticky top-0 bg-card z-[5]">
                  <div className="w-24 sm:w-32 md:w-36 shrink-0" />
                  {weekDays.map(day => (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => onDaySelect?.(day)}
                      className={cn(
                        'flex-1 min-w-[64px] sm:min-w-[80px] md:min-w-[96px] p-1.5 sm:p-2 text-center border-l border-border/60',
                        'hover:bg-muted/40 transition-colors',
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
                        {format(day, 'd')}
                      </p>
                    </button>
                  ))}
                </div>

                {rows.map(({ resource, items: rowItems }) => (
                  <div
                    key={resource.id}
                    className="flex border-b border-border/60 last:border-b-0 min-h-[3rem]"
                  >
                    <div className="w-24 sm:w-32 md:w-36 shrink-0 p-1.5 sm:p-2 border-r border-border/60">
                      <p className="text-[10px] sm:text-xs font-semibold truncate leading-snug">
                        {resource.name}
                      </p>
                      {resource.resource_type && (
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">
                          {resource.resource_type}
                        </p>
                      )}
                    </div>

                    {weekDays.map(day => {
                      const dayItems = getCareItemsForDay(rowItems, day);
                      return (
                        <div
                          key={day.toISOString()}
                          className={cn(
                            'flex-1 min-w-[64px] sm:min-w-[80px] md:min-w-[96px] p-1 border-l border-border/60',
                            isToday(day) && 'bg-primary/[0.03]',
                          )}
                        >
                          {dayItems.length > 0 && (
                            <>
                              <div className="flex flex-wrap gap-0.5 sm:hidden">
                                {dayItems.slice(0, 3).map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onSelectItem?.(item)}
                                    className={cn(
                                      'w-1.5 h-1.5 rounded-full',
                                      careStatusDotClass(item.status),
                                      selectedItemId === item.id && 'ring-1 ring-primary ring-offset-1',
                                    )}
                                    aria-label={item.label}
                                  />
                                ))}
                              </div>
                              <div className="hidden sm:block space-y-0.5">
                                {dayItems.slice(0, 2).map(item => (
                                  <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => onSelectItem?.(item)}
                                    className={cn(
                                      'w-full text-left text-[9px] md:text-[10px] px-1 py-0.5 rounded truncate leading-tight',
                                      careStatusCalendarClass(item.status),
                                      selectedItemId === item.id && 'ring-1 ring-primary',
                                    )}
                                    title={`${item.label} — ${item.resource_name}`}
                                  >
                                    {careCalendarPillLabel(item)}
                                  </button>
                                ))}
                                {dayItems.length > 2 && (
                                  <p className="text-[9px] text-muted-foreground pl-0.5">
                                    +{dayItems.length - 2}
                                  </p>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
