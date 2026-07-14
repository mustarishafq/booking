import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, startOfDay, isAfter, isBefore, addDays } from 'date-fns';
import EmptyState from '@/components/ui/EmptyState';
import { Activity } from 'lucide-react';

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
            icon={Activity}
            title="No activity yet"
            description="Booking activity will appear here once reservations are made."
            className="py-12"
          />
        ) : (
          <div className="h-48 sm:h-56 lg:h-64 -mx-1 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={last7Days} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
                  cursor={{ stroke: 'hsl(var(--primary) / 0.35)', strokeWidth: 1 }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: 'hsl(var(--foreground))',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--primary))' }}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{
                    r: 4,
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--card))',
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 6,
                    fill: 'hsl(var(--primary))',
                    stroke: 'hsl(var(--card))',
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
