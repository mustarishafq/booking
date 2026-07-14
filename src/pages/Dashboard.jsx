import { db } from '@/api/base44Client';
import { resourceCareApi } from '@/api/resourceCare';

import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import {
  LayoutDashboard, LayoutGrid, BookOpen, CreditCard,
  CalendarCheck, Clock, Users, Plus,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import StatCard from '@/components/dashboard/StatCard';
import RecentBookings from '@/components/dashboard/RecentBookings';
import BookingChart from '@/components/dashboard/BookingChart';
import DashboardAlerts from '@/components/dashboard/DashboardAlerts';
import DashboardQuickActions from '@/components/dashboard/DashboardQuickActions';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  hasPermission,
  showDashboardRevenue,
} from '@/lib/permissions';
import {
  isAdminDashboard,
  scopeBookings,
  getDashboardMeta,
  getDashboardDescription,
  buildDashboardStats,
  buildDashboardAlerts,
  buildQuickActions,
  getListBookings,
} from '@/lib/dashboardUtils';

const STAT_ICONS = {
  LayoutGrid,
  BookOpen,
  CreditCard,
  CalendarCheck,
  Clock,
  Users,
};

const STAT_GRID = {
  1: 'grid-cols-1',
  2: 'grid-cols-2 sm:grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
};

export default function Dashboard() {
  const { user, openBookingModal } = useOutletContext();

  const adminView = isAdminDashboard(user);
  const meta = getDashboardMeta(user);
  const showRevenue = showDashboardRevenue(user);
  const canViewUsers = hasPermission(user, 'view_users');
  const canBook = hasPermission(user, 'book_resources');

  const canManageResources = hasPermission(user, 'manage_resources');

  const { data: careSummary } = useQuery({
    queryKey: ['resource-care-summary'],
    queryFn: () => resourceCareApi.summary(),
    enabled: canManageResources,
  });

  const { data: resources = [] } = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 10000),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list('-created_date', 50),
    enabled: showRevenue,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
    enabled: canViewUsers,
  });

  const scopedBookings = useMemo(
    () => scopeBookings(bookings, user),
    [bookings, user],
  );

  const stats = useMemo(
    () => buildDashboardStats({ user, resources, bookings, transactions, users }),
    [user, resources, bookings, transactions, users],
  );

  const alerts = useMemo(
    () => buildDashboardAlerts({ user, bookings, users, careSummary }),
    [user, bookings, users, careSummary],
  );

  const quickActions = useMemo(
    () => buildQuickActions(user, { openBookingModal }),
    [user, openBookingModal],
  );

  const listBookings = useMemo(
    () => getListBookings(bookings, user),
    [bookings, user],
  );

  const skeletonCount = adminView ? 4 : 3;

  if (bookingsLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <Skeleton className="h-14 sm:h-16 w-full max-w-md rounded-lg" />
        <div className={`grid ${STAT_GRID[skeletonCount]} gap-3 sm:gap-4`}>
          {Array.from({ length: skeletonCount }, (_, i) => (
            <Skeleton key={i} className="h-24 sm:h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-20 sm:h-24 rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <Skeleton className="h-64 sm:h-72 lg:col-span-7 xl:col-span-8 rounded-2xl" />
          <Skeleton className="h-64 sm:h-72 lg:col-span-5 xl:col-span-4 rounded-2xl" />
        </div>
      </div>
    );
  }

  const gridCols = STAT_GRID[Math.min(stats.length, 4)] || STAT_GRID[4];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        title={`Welcome back${user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}`}
        description={getDashboardDescription(user)}
      />

      <DashboardAlerts alerts={alerts} />

      <div className={`grid ${gridCols} gap-3 sm:gap-4`}>
        {stats.map((stat, index) => (
          <StatCard
            key={stat.key}
            title={stat.title}
            value={stat.value}
            icon={STAT_ICONS[stat.icon]}
            color={stat.color}
            subtitle={stat.subtitle}
            index={index}
          />
        ))}
      </div>

      <DashboardQuickActions actions={quickActions} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6"
      >
        <div className="lg:col-span-7 xl:col-span-8 min-w-0">
          <BookingChart
            bookings={scopedBookings}
            title={meta.chartTitle}
            description={meta.chartDescription}
          />
        </div>
        <div className="lg:col-span-5 xl:col-span-4 min-w-0">
          <RecentBookings
            bookings={listBookings}
            title={meta.listTitle}
            emptyTitle={meta.listEmptyTitle}
            emptyDescription={meta.listEmptyDescription}
            showBooker={adminView}
            viewAllHref="/bookings"
          />
        </div>
      </motion.div>

      {!adminView && canBook && listBookings.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-dashed border-border bg-muted/30 p-4 sm:p-6 text-center"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Ready to reserve a room or resource?
          </p>
          <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2">
            <Button className="gap-2 rounded-xl w-full sm:w-auto" onClick={() => openBookingModal()}>
              <Plus className="w-4 h-4" />
              Make a booking
            </Button>
            <Button variant="outline" className="gap-2 rounded-xl w-full sm:w-auto" asChild>
              <Link to="/resources">
                <LayoutGrid className="w-4 h-4" />
                Browse resources
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
