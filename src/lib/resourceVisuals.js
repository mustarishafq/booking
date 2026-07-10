import {
  Boxes, CarFront, ShipWheel, Building2, Wrench, Package,
  Waves, Monitor, Users, MapPin,
} from 'lucide-react';

/**
 * Pick a Lucide icon for a free-text resource_type.
 */
export function getResourceTypeIcon(resourceType = '') {
  const t = String(resourceType).toLowerCase();

  if (/\b(car|vehicle|van|truck|suv|fleet)\b/.test(t)) return CarFront;
  if (/\b(driver|pilot|operator|chauffeur)\b/.test(t)) return ShipWheel;
  if (/\b(room|hall|meeting|office|space|venue)\b/.test(t)) return Building2;
  if (/\b(boat|yacht|vessel|ship)\b/.test(t)) return Waves;
  if (/\b(equip|tool|device|laptop|monitor|av)\b/.test(t)) return Monitor;
  if (/\b(service|staff|team|crew)\b/.test(t)) return Users;
  if (/\b(maint|repair|care)\b/.test(t)) return Wrench;
  if (/\b(package|kit|set)\b/.test(t)) return Package;
  if (/\b(location|site|area)\b/.test(t)) return MapPin;

  return Boxes;
}

/** Statuses that count toward resource EXP */
const EXP_BOOKING_STATUSES = new Set(['confirmed', 'completed', 'pending']);

/** EXP awarded per counted booking */
export const EXP_PER_BOOKING = 10;

/** EXP needed to advance one level */
export const EXP_PER_LEVEL = 50;

/**
 * Count bookings per resource_id (excludes cancelled / rejected).
 */
export function buildResourceBookingCounts(bookings = []) {
  const counts = {};
  for (const b of bookings) {
    if (!b?.resource_id) continue;
    if (!EXP_BOOKING_STATUSES.has(b.status)) continue;
    counts[b.resource_id] = (counts[b.resource_id] || 0) + 1;
  }
  return counts;
}

/**
 * Derive EXP / level from total bookings for a resource.
 */
export function getResourceExp(bookingCount = 0) {
  const count = Math.max(0, Number(bookingCount) || 0);
  const exp = count * EXP_PER_BOOKING;
  const level = Math.floor(exp / EXP_PER_LEVEL) + 1;
  const intoLevel = exp % EXP_PER_LEVEL;
  const progress = intoLevel / EXP_PER_LEVEL;
  return { bookingCount: count, exp, level, intoLevel, progress };
}
