import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format, isToday, isTomorrow, isSameDay } from 'date-fns';
import {
  Ban, CheckCircle2, Link2, Pencil, Phone, Repeat, XCircle,
} from 'lucide-react';
import { bookingStatusBadge, getBookingPhone, isBookingEditable, phoneTelHref } from '@/lib/bookingUtils';
import { getResourceTypeIcon } from '@/lib/resourceVisuals';
import { UserIdentity } from '@/components/UserAvatar';
import { cn } from '@/lib/utils';

const statusAccent = {
  confirmed: 'bg-success',
  pending: 'bg-warning',
  cancelled: 'bg-destructive/50',
  rejected: 'bg-destructive',
  completed: 'bg-primary',
};

function timeLabel(start, end) {
  const endTime = isSameDay(start, end)
    ? format(end, 'h:mm a')
    : format(end, 'MMM d, h:mm a');
  if (isToday(start)) return `Today · ${format(start, 'h:mm a')} – ${endTime}`;
  if (isTomorrow(start)) return `Tomorrow · ${format(start, 'h:mm a')} – ${endTime}`;
  return `${format(start, 'EEE, MMM d')} · ${format(start, 'h:mm a')} – ${endTime}`;
}

export default function BookingListItem({
  booking,
  pairedSibling = null,
  resources = [],
  showBooker = false,
  hideCost = false,
  canManage = false,
  canAct = false,
  onApprove,
  onReject,
  onCancel,
  onEdit,
  className,
}) {
  const start = new Date(booking.start_time);
  const end = new Date(booking.end_time);
  const cost = (((booking.cost_cents || 0) + (pairedSibling?.cost_cents || 0)) / 100).toFixed(2);
  const resource = resources.find(r => r.id === booking.resource_id);
  const TypeIcon = getResourceTypeIcon(booking.resource_type);

  const showPendingActions = canManage && booking.status === 'pending';
  const showCancelAction = booking.status === 'confirmed' && canAct;
  const showEditAction = canAct && isBookingEditable(booking);
  const phone = getBookingPhone(booking, resources);
  const callHref = phoneTelHref(phone);
  const showActions = showPendingActions || showCancelAction || showEditAction || !!callHref;
  const showMeta = showBooker || booking.is_recurring || !!pairedSibling;

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border/70 bg-card overflow-hidden',
        'shadow-sm hover:shadow-md hover:shadow-primary/10 hover:border-primary/25',
        'transition-all duration-300',
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row">
        {/* Media */}
        <div className="relative sm:w-40 lg:w-48 shrink-0 bg-muted aspect-[16/9] sm:aspect-auto sm:min-h-[10rem] sm:self-stretch overflow-hidden">
          {resource?.image_url ? (
            <img
              src={resource.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
              <TypeIcon className="w-10 h-10 text-primary/35" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none sm:bg-gradient-to-r sm:from-transparent sm:to-black/15" />
          <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-black/55 backdrop-blur-md border border-white/10 px-2.5 py-1.5 text-white">
            <p className="text-[10px] font-semibold uppercase tracking-wider leading-none opacity-80">
              {format(start, 'MMM')}
            </p>
            <p className="text-lg font-bold tabular-nums leading-none mt-0.5">
              {format(start, 'd')}
            </p>
          </div>
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 h-1 sm:inset-y-0 sm:left-auto sm:right-0 sm:w-1 sm:h-full sm:bottom-auto',
              statusAccent[booking.status] || 'bg-border',
            )}
          />
        </div>

        {/* Body */}
        <div className="flex-1 min-w-0 p-4 sm:p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-base leading-snug tracking-tight line-clamp-2">
                  {booking.title}
                </h3>
                <Badge
                  variant="outline"
                  className={cn(
                    'capitalize text-xs shrink-0 sm:hidden',
                    bookingStatusBadge[booking.status],
                  )}
                >
                  {booking.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 min-w-0">
                <TypeIcon className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                <span className="truncate">{booking.resource_name}</span>
                {booking.resource_type && (
                  <>
                    <span aria-hidden className="opacity-40">·</span>
                    <span className="truncate shrink-0">{booking.resource_type}</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="text-sm font-medium text-foreground/90 tabular-nums">
                {timeLabel(start, end)}
              </span>
              {!hideCost && (
                <span className="text-sm font-semibold tabular-nums">RM{cost}</span>
              )}
            </div>

            {showMeta && (
              <div className="flex flex-wrap items-center gap-2">
                {showBooker && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/80 px-2 py-1 text-xs text-muted-foreground max-w-full">
                    <UserIdentity
                      name={booking.booked_by_name}
                      email={booking.booked_by_email}
                      avatarUrl={booking.booked_by_avatar_url}
                      className="max-w-full"
                      labelClassName="text-xs text-muted-foreground"
                    />
                  </span>
                )}
                {booking.is_recurring && (
                  <Badge variant="outline" className="text-xs gap-1 h-6 px-2">
                    <Repeat className="w-3 h-3" />
                    Recurring
                  </Badge>
                )}
                {pairedSibling && (
                  <Badge
                    variant="outline"
                    className="text-xs gap-1 h-6 px-2 border-primary/30 text-primary bg-primary/5"
                  >
                    <Link2 className="w-3 h-3" />
                    + {pairedSibling.resource_name}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Status + actions rail */}
          <div className="flex flex-col gap-3 sm:items-end shrink-0 sm:min-w-[8.5rem]">
            <Badge
              variant="outline"
              className={cn(
                'capitalize text-xs hidden sm:inline-flex',
                bookingStatusBadge[booking.status],
              )}
            >
              {booking.status}
            </Badge>

            {showActions && (
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {callHref && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 text-xs gap-1.5 rounded-xl border-border/80 bg-muted/40"
                    asChild
                  >
                    <a href={callHref}>
                      <Phone className="w-3.5 h-3.5" />
                      Call
                    </a>
                  </Button>
                )}
                {showEditAction && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 text-xs gap-1.5 rounded-xl"
                    onClick={() => onEdit?.(booking)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </Button>
                )}
                {showPendingActions && (
                  <>
                    <Button
                      size="sm"
                      className="h-9 px-3 text-xs gap-1.5 rounded-xl bg-success text-success-foreground hover:bg-success/90"
                      onClick={() => onApprove?.(booking)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 px-3 text-xs gap-1.5 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => onReject?.(booking)}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Reject
                    </Button>
                  </>
                )}
                {showCancelAction && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-9 px-3 text-xs gap-1.5 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onCancel?.(booking)}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
