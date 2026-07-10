import { z } from 'zod';

export const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  per_page: z.coerce.number().int().min(1).max(200).optional(),
  sort_by: z.string().optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
});

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const resourceListSchema = listQuerySchema.extend({
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  resource_type: z.string().optional(),
});

export const bookingListSchema = listQuerySchema.extend({
  status: z.enum(['confirmed', 'cancelled', 'completed', 'pending', 'rejected']).optional(),
  resource_id: z.string().optional(),
  booked_by_email: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const transactionListSchema = listQuerySchema.extend({
  user_email: z.string().optional(),
  type: z.string().optional(),
});

export const roomListSchema = listQuerySchema.extend({
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  room_type: z.enum(['meeting', 'conference', 'workshop', 'studio', 'office']).optional(),
});

export const careScheduleListSchema = listQuerySchema.extend({
  status: z.enum(['overdue', 'due', 'upcoming', 'ok']).optional(),
  resource_type: z.string().optional(),
  category: z.enum(['compliance', 'preventive', 'cleaning', 'inspection', 'other']).optional(),
});

export const createBookingSchema = z.object({
  resource_id: z.string().min(1),
  title: z.string().min(1),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  status: z.enum(['confirmed', 'cancelled', 'completed', 'pending', 'rejected']).optional(),
  cost_cents: z.number().int().min(0).optional(),
  attendees: z.number().int().positive().optional(),
  notes: z.string().optional(),
  is_recurring: z.boolean().optional(),
  recurrence_group_id: z.string().optional(),
  recurrence_weeks: z.number().int().positive().optional(),
  booking_group_id: z.string().optional(),
  resource_phone: z.string().optional(),
  booked_by_email: z.string().email().optional(),
  booked_by_name: z.string().optional(),
});

export const updateBookingSchema = createBookingSchema.partial();

export const createResourceSchema = z.object({
  name: z.string().min(1),
  resource_type: z.string().min(1),
  pairing_role: z.enum(['none', 'vehicle', 'driver']).optional(),
  pair_with_type: z.string().nullable().optional(),
  pair_with_types: z.array(z.string()).optional(),
  description: z.string().optional(),
  capacity: z.number().int().positive().optional(),
  pricing_model: z.enum(['hourly', 'daily', 'flat']).optional(),
  rate: z.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  image_url: z.string().optional(),
  requires_approval: z.boolean().optional(),
  pic_user_id: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  location: z.string().optional(),
  phone: z.string().optional(),
  odometer_km: z.number().optional(),
});

export const updateResourceSchema = createResourceSchema.partial();

export const updateRoomSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  capacity: z.number().int().min(0).optional(),
  hourly_rate: z.number().min(0).optional(),
  amenities: z.array(z.string()).optional(),
  image_url: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  floor: z.string().optional(),
  room_type: z.enum(['meeting', 'conference', 'workshop', 'studio', 'office']).optional(),
});

export const createRoomSchema = updateRoomSchema.extend({
  name: z.string().min(1),
});
