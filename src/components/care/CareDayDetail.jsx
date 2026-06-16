import { format } from 'date-fns';
import { Calendar, MapPin, Wrench, ShieldAlert, CheckCircle2, Pencil } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/ui/EmptyState';
import {
  CARE_STATUS_META, formatCareDue, intervalTypeLabel,
} from '@/lib/resourceCareUtils';
import { cn } from '@/lib/utils';

export function CareDayDetailContent({
  date,
  items,
  selectedItem,
  onSelectItem,
  canManage,
  onComplete,
  onEditResource,
}) {
  const displayItems = selectedItem
    ? [selectedItem, ...items.filter(i => i.id !== selectedItem.id)]
    : items;

  if (!date) {
    return <p className="text-sm text-muted-foreground">Select a day to see due care items</p>;
  }

  if (displayItems.length === 0) {
    return (
      <EmptyState
        icon={Calendar}
        title="No care due"
        description={`Nothing due for ${format(date, 'MMMM d')}.`}
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {displayItems.map(item => {
        const meta = CARE_STATUS_META[item.status] || CARE_STATUS_META.ok;
        const isSelected = selectedItem?.id === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectItem?.(item)}
            className={cn(
              'w-full text-left rounded-xl border p-3 sm:p-3.5 space-y-2 transition-all duration-200',
              isSelected
                ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                : 'bg-card border-border hover:border-primary/20 hover:shadow-sm',
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold leading-snug line-clamp-2">{item.label}</p>
              <Badge variant="outline" className={cn('shrink-0 text-[10px] sm:text-xs border-0', meta.className)}>
                {meta.label}
              </Badge>
            </div>

            {item.resource_name && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{item.resource_name}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Wrench className="w-3 h-3 shrink-0" />
              <span>{item.resource_type} · {intervalTypeLabel(item.interval_type)}</span>
            </div>

            <div className="text-xs text-muted-foreground">
              Next: {formatCareDue(item)}
            </div>

            {item.block_when_overdue && (
              <div className="flex items-center gap-1.5 text-xs text-warning">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span>Blocks booking when overdue</span>
              </div>
            )}

            {canManage && isSelected && (
              <div className="flex gap-2 pt-1 border-t border-border/60">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-1"
                  onClick={(e) => { e.stopPropagation(); onComplete?.(item); }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Done
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs flex-1"
                  onClick={(e) => { e.stopPropagation(); onEditResource?.(item.resource_id); }}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Resource
                </Button>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function CareDayDetail({
  date,
  items,
  selectedItem,
  onSelectItem,
  canManage,
  onComplete,
  onEditResource,
  className,
}) {
  return (
    <Card className={cn('rounded-2xl border border-border h-fit', className)}>
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold truncate">
              {date ? format(date, 'EEEE') : 'Select a day'}
            </h3>
            {date && (
              <p className="text-sm text-muted-foreground">{format(date, 'MMMM d, yyyy')}</p>
            )}
          </div>
          {items.length > 0 && (
            <Badge variant="secondary" className="shrink-0 tabular-nums">
              {items.length}
            </Badge>
          )}
        </div>

        <CareDayDetailContent
          date={date}
          items={items}
          selectedItem={selectedItem}
          onSelectItem={onSelectItem}
          canManage={canManage}
          onComplete={onComplete}
          onEditResource={onEditResource}
        />
      </CardContent>
    </Card>
  );
}
