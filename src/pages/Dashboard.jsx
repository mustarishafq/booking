import { db } from '@/api/base44Client';

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { LayoutDashboard, LayoutGrid, BookOpen, CreditCard } from 'lucide-react';
import StatCard from '@/components/dashboard/StatCard';
import RecentBookings from '@/components/dashboard/RecentBookings';
import BookingChart from '@/components/dashboard/BookingChart';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { user } = useOutletContext();
  
  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-created_date', 50),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list('-created_date', 50),
  });

  const activeResources = resources.filter(r => r.status === 'active').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const totalRevenue = transactions
    .filter(t => t.type === 'booking_charge')
    .reduce((sum, t) => sum + Math.abs(t.amount_cents || 0), 0);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="text-muted-foreground mt-1">Here's what's happening today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Resources" value={activeResources} icon={LayoutGrid} color="primary" subtitle={`${resources.length} total`} />
        <StatCard title="Active Bookings" value={confirmedBookings} icon={BookOpen} color="accent" subtitle={`${bookings.length} total`} />
        <StatCard title="Revenue" value={`RM${(totalRevenue / 100).toFixed(2)}`} icon={CreditCard} color="success" />
        <StatCard title="Your Credits" value={`RM${((user?.credit_balance_cents || 0) / 100).toFixed(2)}`} icon={LayoutDashboard} color="warning" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingChart bookings={bookings} />
        <RecentBookings bookings={bookings} />
      </div>
    </div>
  );
}