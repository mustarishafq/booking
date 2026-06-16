import { useMemo } from 'react';
import { format, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import { navigateDay } from '@/lib/calendarUtils';
import {
  buildCareResourceRows, careStatusCalendarClass, careCalendarPillLabel,
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

export default function CareResourceTimeline({
  date,
  onDateChange,
  resources,
  items,
  selectedItemId,
  onSelectItem,
}) {
  const rows = useMemo(
    () => buildCareResourceRows(resources, items, date),
    [resources, items, date],
  );

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

        {rows.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No care due"
            description="No resources have care items due on this day."
            className="py-10 sm:py-12"
          />
        ) : (
          <div className="relative -mx-1">
            <ScrollFadeHint />
            <div className="overflow-x-auto px-1 pb-1 [scrollbar-width:thin]">
              <div className="min-w-[480px] sm:min-w-[560px]">
                <div className="flex border-b border-border sticky top-0 bg-card z-[5]">
                  <div className="w-28 sm:w-36 md:w-44 shrink-0 p-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Resource
                  </div>
                  <div className="flex-1 p-2 text-[10px] sm:text-xs font-semibold text-muted-foreground uppercase tracking-wider border-l border-border/60">
                    Due items
                  </div>
                </div>

                {rows.map(({ resource, items: rowItems }) => (
                  <div
                    key={resource.id}
                    className="flex border-b border-border/60 last:border-b-0 min-h-[3.5rem]"
                  >
                    <div className="w-28 sm:w-36 md:w-44 shrink-0 p-2 sm:p-2.5 border-r border-border/60">
                      <p className="text-xs sm:text-sm font-semibold truncate leading-snug">
                        {resource.name}
                      </p>
                      {resource.resource_type && (
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate mt-0.5">
                          {resource.resource_type}
                        </p>
                      )}
                    </div>

                    <div className="flex-1 p-2 sm:p-2.5 flex flex-wrap gap-1 content-start">
                      {rowItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => onSelectItem?.(item)}
                          className={cn(
                            'text-[10px] sm:text-[11px] px-1.5 py-0.5 rounded truncate leading-tight max-w-full',
                            'transition-all hover:ring-1 hover:ring-primary/30',
                            careStatusCalendarClass(item.status),
                            selectedItemId === item.id && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                          )}
                          title={`${item.label} — ${item.resource_name}`}
                        >
                          {careCalendarPillLabel(item)}
                          <span className="opacity-80"> · {item.label}</span>
                        </button>
                      ))}
                    </div>
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
