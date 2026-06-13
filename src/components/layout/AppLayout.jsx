import { db } from '@/api/base44Client';

import React, { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router-dom';

import TopBar from './TopBar';
import BottomNav from './BottomNav';
import MobileNavSidebar from './MobileNavSidebar';
import BookingModal from '@/components/bookings/BookingModal';

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPreset, setBookingPreset] = useState({
    resourceId: '',
    startTime: '',
    endTime: '',
  });

  useEffect(() => {
    db.auth.me().then(setUser).catch(() => {});
  }, []);

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
    <div className="min-h-[100dvh] bg-background">
      <TopBar user={user} onMenuOpen={() => setMenuOpen(true)} />
      <MobileNavSidebar user={user} open={menuOpen} onOpenChange={setMenuOpen} />
      <BookingModal
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        preselectedResourceId={bookingPreset.resourceId}
        preselectedStartTime={bookingPreset.startTime}
        preselectedEndTime={bookingPreset.endTime}
        user={user}
        setUser={setUser}
      />

      <main className="pt-16 pb-[calc(4.75rem+env(safe-area-inset-bottom))]">
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
