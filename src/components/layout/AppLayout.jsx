import React, { useState, useCallback } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

import TopBar from './TopBar';
import BottomNav from './BottomNav';
import BookingModal from '@/components/bookings/BookingModal';

export default function AppLayout() {
  const { user, setUser } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPreset, setBookingPreset] = useState({
    resourceId: '',
    startTime: '',
    endTime: '',
  });

  const openBookingModal = useCallback((preset = '') => {
    if (typeof preset === 'string') {
      setBookingPreset({ resourceId: preset, startTime: '', endTime: '' });
    } else {
      setBookingPreset({
        resourceId: preset?.resourceId || '',
        startTime: preset?.startTime || '',
        endTime: preset?.endTime || '',
      });
    }
    setBookingOpen(true);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="sticky top-0 z-30 shrink-0 transition-all duration-200">
        <TopBar user={user} embedded />
      </div>

      <BookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        preselectedResourceId={bookingPreset.resourceId}
        preselectedStartTime={bookingPreset.startTime}
        preselectedEndTime={bookingPreset.endTime}
        user={user}
        setUser={setUser}
      />

      <main className="flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] pt-0">
        <div className="max-w-[1600px] mx-auto p-4 sm:p-6">
          <Outlet context={{ user, setUser, openBookingModal }} />
        </div>
      </main>

      <BottomNav
        user={user}
        onOpenBooking={() => openBookingModal()}
        bookingModalOpen={bookingOpen}
      />
    </div>
  );
}
