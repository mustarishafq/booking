import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock, MapPin } from 'lucide-react';

const statusColors = {
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  completed: 'bg-primary/10 text-primary border-primary/20',
};

export default function RecentBookings({ bookings }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Recent Bookings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bookings.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">No recent bookings</p>
        )}
        {bookings.slice(0, 5).map(booking => (
          <div key={booking.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{booking.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Clock className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {format(new Date(booking.start_time), 'MMM d, h:mm a')}
                </span>
              </div>
            </div>
            <Badge variant="outline" className={statusColors[booking.status] || ''}>
              {booking.status}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}