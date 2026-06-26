const JSON_FIELDS = {
  resources: ['amenities'],
  rooms: ['amenities'],
};

const BOOLEAN_FIELDS = {
  bookings: ['is_recurring'],
  resources: ['requires_approval'],
};

export function parseEntityRow(table, row) {
  if (!row) return row;
  const result = { ...row };

  for (const f of JSON_FIELDS[table] || []) {
    if (result[f] && typeof result[f] === 'string') {
      try { result[f] = JSON.parse(result[f]); } catch { result[f] = []; }
    }
  }

  for (const f of BOOLEAN_FIELDS[table] || []) {
    if (f in result) result[f] = !!result[f];
  }

  return result;
}

export function serializeResource(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    resource_type: row.resource_type,
    description: row.description,
    capacity: row.capacity,
    pricing_model: row.pricing_model,
    rate: row.rate != null ? Number(row.rate) : null,
    amenities: row.amenities || [],
    image_url: row.image_url,
    requires_approval: !!row.requires_approval,
    pic_user_id: row.pic_user_id,
    pic_email: row.pic_email || null,
    pic_name: row.pic_name || null,
    status: row.status,
    location: row.location,
    odometer_km: row.odometer_km != null ? Number(row.odometer_km) : null,
    care_summary: row.care_summary || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeBooking(row) {
  if (!row) return null;
  return {
    id: row.id,
    resource_id: row.resource_id,
    resource_name: row.resource_name,
    resource_type: row.resource_type,
    pricing_model: row.pricing_model,
    title: row.title,
    start_time: row.start_time,
    end_time: row.end_time,
    status: row.status,
    cost_cents: row.cost_cents,
    attendees: row.attendees,
    notes: row.notes,
    is_recurring: !!row.is_recurring,
    recurrence_group_id: row.recurrence_group_id,
    recurrence_weeks: row.recurrence_weeks,
    booked_by_email: row.booked_by_email,
    booked_by_name: row.booked_by_name,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    capacity: row.capacity,
    hourly_rate: row.hourly_rate != null ? Number(row.hourly_rate) : null,
    amenities: row.amenities || [],
    image_url: row.image_url,
    status: row.status,
    floor: row.floor,
    room_type: row.room_type,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function serializeTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    user_email: row.user_email,
    type: row.type,
    amount_cents: row.amount_cents,
    balance_after_cents: row.balance_after_cents,
    description: row.description,
    booking_id: row.booking_id,
    created_at: row.created_at,
  };
}

export function serializeCareSchedule(row) {
  if (!row) return null;
  return {
    id: row.id,
    resource_id: row.resource_id,
    resource_name: row.resource_name,
    resource_type: row.resource_type,
    label: row.label,
    category: row.category,
    status: row.status,
    next_due_at: row.next_due_at,
    last_done_at: row.last_done_at,
    block_when_overdue: !!row.block_when_overdue,
    is_active: row.is_active !== false,
  };
}

export function serializeMetadata(counts) {
  return {
    application: 'EMZI Nexus Booking',
    version: '1.0.0',
    entities: counts,
  };
}
