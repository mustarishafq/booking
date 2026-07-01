import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, isAfter, isBefore, addDays } from 'date-fns';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

export default function BookingChart({
  bookings,
  title = 'Booking Activity',
  description,
}) {
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = startOfDay(addDays(date, 1));
    const count = bookings.filter(b => {
      const bDate = new Date(b.created_at ?? b.created_date);
      return isAfter(bDate, dayStart) && isBefore(bDate, dayEnd);
    }).length;
    return { day: format(date, 'EEE'), bookings: count };
  });

  const total = last7Days.reduce((sum, d) => sum + d.bookings, 0);

  return (
    <Card className="rounded-2xl border border-border h-full">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-6">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
        {total === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No activity yet"
            description="Booking activity will appear here once reservations are made."
            className="py-12"
          />
        ) : (
          <div className="h-48 sm:h-56 lg:h-64 -mx-1 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
