import { db } from '@/api/base44Client';

import React, { useState } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Plus, Search, XCircle, Calendar, Clock, CheckCircle2, Ban } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors = {
  confirmed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  pending:   'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  rejected:  'bg-red-500/10 text-red-600 border-red-500/20',
  completed: 'bg-primary/10 text-primary border-primary/20',
};

export default function Bookings() {
  const { user } = useOutletContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const isAdmin = user?.role === 'admin';

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 100),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
    enabled: isAdmin,
  });
  const filtered = bookings
    .filter(b => isAdmin || b.booked_by_email === user?.email)
    .filter(b => statusFilter === 'all' || b.status === statusFilter)
    .filter(b => b.title?.toLowerCase().includes(search.toLowerCase()) || b.room_name?.toLowerCase().includes(search.toLowerCase()));

  const handleApprove = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'confirmed' });
    // Deduct credits from the booking owner
    if (booking.cost_cents > 0) {
      const owner = allUsers.find(u => u.email === booking.booked_by_email);
      if (owner) {
        const newBalance = (owner.credit_balance_cents || 0) - booking.cost_cents;
        await db.entities.User.update(owner.id, { credit_balance_cents: newBalance });
        await db.entities.Transaction.create({
          user_email: owner.email,
          type: 'booking_charge',
          amount_cents: -booking.cost_cents,
          balance_after_cents: newBalance,
          description: `Booking approved: ${booking.title} — ${booking.resource_name}`,
          booking_id: booking.id,
        });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['users'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleReject = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'rejected' });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
  };

  const handleCancel = async (booking) => {
    await db.entities.Booking.update(booking.id, { status: 'cancelled' });
    // Refund credits
    if (booking.cost_cents && booking.booked_by_email === user?.email) {
      const newBalance = (user.credit_balance_cents || 0) + booking.cost_cents;
      await db.auth.updateMe({ credit_balance_cents: newBalance });
      await db.entities.Transaction.create({
        user_email: user.email,
        type: 'refund',
        amount_cents: booking.cost_cents,
        balance_after_cents: newBalance,
        description: `Refund: ${booking.title} at ${booking.room_name}`,
        booking_id: booking.id,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1">{isAdmin ? 'All bookings' : 'Your bookings'}</p>
        </div>
        <Link to="/book">
          <Button><Plus className="w-4 h-4 mr-2" /> New Booking</Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search bookings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {['confirmed', 'pending', 'cancelled', 'rejected', 'completed'].map(s => (
              <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No bookings found</p>
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{b.title}</p>
                        {b.is_recurring && <Badge variant="outline" className="text-xs mt-0.5">Recurring</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-muted-foreground">{b.resource_name}</p>
                        {b.resource_type && <span className="text-xs text-muted-foreground/70">{b.resource_type}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{format(new Date(b.start_time), 'MMM d, yyyy')}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(b.start_time), 'h:mm a')} - {format(new Date(b.end_time), 'h:mm a')}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">RM{((b.cost_cents || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[b.status]}>{b.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {isAdmin && b.status === 'pending' && (
                          <>
                            <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700" onClick={() => handleApprove(b)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleReject(b)}>
                              <Ban className="w-4 h-4 mr-1" /> Reject
                            </Button>
                          </>
                        )}
                        {b.status === 'confirmed' && (isAdmin || b.booked_by_email === user?.email) && (
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => handleCancel(b)}>
                            <XCircle className="w-4 h-4 mr-1" /> Cancel
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}