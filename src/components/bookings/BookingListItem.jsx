import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  Ban, Calendar, CheckCircle2, Clock, MapPin, Repeat, User, XCircle,
} from 'lucide-react';
import { bookingStatusBadge } from '@/lib/bookingUtils';
import { cn } from '@/lib/utils';

export default function BookingListItem({
  booking,
  showBooker = false,
  canManage = false,
  canAct = false,
  onApprove,
  onReject,
  onCancel,
  className,
}) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const cost = ((booking.cost_cents || 0) / 100).toFixed(2);

  const showPendingActions = canManage && booking.status === 'pending';
  const showCancelAction = booking.status === 'confirmed' && canAct;

  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-4 flex flex-col gap-3',
        'hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 transition-all duration-300',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm leading-snug line-clamp-2">{booking.title}</p>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{booking.resource_name}</span>
              {booking.resource_type && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate shrink">{booking.resource_type}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn('shrink-0 capitalize text-xs', bookingStatusBadge[booking.status])}
        >
          {booking.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div className="flex items-center gap-1.5 text-muted-foreground col-span-2 sm:col-span-1">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <div className="min-w-0">
            <p className="text-foreground text-xs sm:text-sm">{format(start, 'EEE, MMM d, yyyy')}</p>
            <p className="text-xs">{format(start, 'h:mm a')} – {format(end, 'h:mm a')}</p>
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wider sm:hidden">Cost</span>
          <span className="font-semibold tabular-nums">RM{cost}</span>
        </div>
      </div>

      {(showBooker || booking.is_recurring) && (
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60">
          {showBooker && (
            <div className="flex items-center gap-1.5 min-w-0 text-xs text-muted-foreground">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">
                {booking.booked_by_name || booking.booked_by_email || '—'}
              </span>
            </div>
          )}
          {booking.is_recurring && (
            <Badge variant="outline" className="text-xs gap-1 h-5">
              <Repeat className="w-3 h-3" />
              Recurring
            </Badge>
          )}
        </div>
      )}

      {(showPendingActions || showCancelAction) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {showPendingActions && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none h-9 text-success border-success/30 hover:bg-success/10 hover:text-success"
                onClick={() => onApprove?.(booking)}
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1 sm:flex-none h-9 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onReject?.(booking)}
              >
                <Ban className="w-4 h-4 mr-1.5" />
                Reject
              </Button>
            </>
          )}
          {showCancelAction && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 sm:flex-none h-9 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onCancel?.(booking)}
            >
              <XCircle className="w-4 h-4 mr-1.5" />
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
