import { db } from '@/api/base44Client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useOutletContext } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar, CheckCircle2, Ban } from 'lucide-react';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, addMonths, subMonths, isSameMonth, isSameDay, isToday,
  parseISO
} from 'date-fns';

const statusColors = {
  confirmed: 'bg-primary text-primary-foreground',
  pending:   'bg-amber-500 text-white',
  cancelled: 'bg-red-400 text-white',
  rejected:  'bg-red-600 text-white',
  completed: 'bg-emerald-500 text-white',
};

export default function CalendarView() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'admin';
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [roomFilter, setRoomFilter] = useState('all');

  const { data: bookings = [] } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 200),
  });

  const resourceTypes = useMemo(() => {
    const types = [...new Set(bookings.map(b => b.resource_type).filter(Boolean))].sort();
    return types;
  }, [bookings]);

  const filteredBookings = roomFilter === 'all'
    ? bookings
    : bookings.filter(b => b.resource_type === roomFilter);

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
  }, [currentDate]);

  const getBookingsForDay = (date) => {
    return filteredBookings.filter(b => isSameDay(new Date(b.start_time), date) && b.status !== 'cancelled' && b.status !== 'rejected');
  };

  const selectedDayBookings = selectedDay ? getBookingsForDay(selectedDay) : [];

  const handleApprove = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'confirmed' });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const handleReject = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'rejected' });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="text-muted-foreground mt-1">Visual overview of all bookings</p>
        </div>
        <Select value={roomFilter} onValueChange={setRoomFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {resourceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(subMonths(currentDate, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold">{format(currentDate, 'MMMM yyyy')}</h2>
              <Button variant="ghost" size="icon" onClick={() => setCurrentDate(addMonths(currentDate, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayBookings = getBookingsForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                return (
                  <div
                    key={i}
                    onClick={() => setSelectedDay(day)}
                    className={`
                      bg-card min-h-[80px] p-1.5 cursor-pointer transition-colors
                      ${!isSameMonth(day, currentDate) ? 'opacity-40' : ''}
                      ${isSelected ? 'ring-2 ring-primary ring-inset' : ''}
                      ${isToday(day) ? 'bg-primary/5' : 'hover:bg-muted/50'}
                    `}
                  >
                    <span className={`text-xs font-medium ${isToday(day) ? 'text-primary font-bold' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayBookings.slice(0, 2).map(b => (
                        <div key={b.id} className={`text-[10px] px-1 py-0.5 rounded truncate ${statusColors[b.status]}`}>
                          {b.title}
                        </div>
                      ))}
                      {dayBookings.length > 2 && (
                        <p className="text-[10px] text-muted-foreground pl-1">+{dayBookings.length - 2} more</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3">
              {selectedDay ? format(selectedDay, 'EEEE, MMM d') : 'Select a day'}
            </h3>
            {selectedDay ? (
              selectedDayBookings.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No bookings</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayBookings.map(b => (
                    <div key={b.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <p className="text-sm font-medium">{b.title}</p>
                      <p className="text-xs text-muted-foreground">{b.resource_name || b.room_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(b.start_time), 'h:mm a')} - {format(new Date(b.end_time), 'h:mm a')}
                      </p>
                      {b.booked_by_email && (
                        <p className="text-xs text-muted-foreground">{b.booked_by_email}</p>
                      )}
                      <Badge variant="outline" className={`text-xs ${statusColors[b.status]} border-0`}>
                        {b.status}
                      </Badge>
                      {isAdmin && b.status === 'pending' && (
                        <div className="flex gap-1 pt-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 px-2" onClick={() => handleApprove(b)}>
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive px-2" onClick={() => handleReject(b)}>
                            <Ban className="w-3 h-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="text-sm text-muted-foreground">Click on a day to see its bookings</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}