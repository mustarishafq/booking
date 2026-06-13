import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { Clock, MapPin, User, ArrowRight } from 'lucide-react';
import { bookingStatusBadge } from '@/lib/bookingUtils';
import EmptyState from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

export default function RecentBookings({
  bookings,
  title = 'Recent Bookings',
  emptyTitle = 'No bookings yet',
  emptyDescription,
  showBooker = false,
  viewAllHref = '/bookings',
}) {
  return (
    <Card className="rounded-2xl border border-border h-full flex flex-col">
      <CardHeader className="pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col px-4 sm:px-6 pb-4 sm:pb-6">
        {bookings.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title={emptyTitle}
            description={emptyDescription}
            className="py-8 sm:py-10"
          />
        ) : (
          <div className="space-y-2 sm:space-y-3 flex-1 lg:max-h-[320px] lg:overflow-y-auto lg:pr-1">
            {bookings.map(booking => (
              <div
                key={booking.id}
                className={cn(
                  'flex flex-col gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors duration-300',
                  'sm:flex-row sm:items-center sm:gap-3',
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{booking.title}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                      <Clock className="w-3 h-3 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(booking.start_time), 'MMM d, h:mm a')}
                      </span>
                      {showBooker && booking.booked_by_name && (
                        <>
                          <span className="text-xs text-muted-foreground hidden sm:inline">·</span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-full sm:max-w-[140px]">
                            <User className="w-3 h-3 shrink-0" />
                            {booking.booked_by_name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'self-start sm:self-center shrink-0 text-[11px] sm:text-xs',
                    bookingStatusBadge[booking.status] || '',
                  )}
                >
                  {booking.status}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {viewAllHref && (
          <Button variant="ghost" size="sm" className="w-full mt-3 sm:mt-4 gap-2 text-muted-foreground" asChild>
            <Link to={viewAllHref}>
              View all bookings
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
