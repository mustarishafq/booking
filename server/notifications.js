import { randomUUID } from 'crypto';
import pool from './db.js';

export async function createNotification({ userEmail, type, title, body, link = null }) {
  if (!userEmail) return null;
  const id = randomUUID();
  await pool.query(
    'INSERT INTO notifications (id, user_email, type, title, body, link) VALUES (?, ?, ?, ?, ?, ?)',
    [id, userEmail.toLowerCase(), type, title, body || '', link],
  );
  return id;
}

async function getAdminEmails() {
  const [rows] = await pool.query(
    "SELECT email FROM users WHERE role = 'admin' AND approved = 1",
  );
  return rows.map(r => r.email.toLowerCase());
}

async function getResourcePicEmail(resourceId) {
  if (!resourceId) return null;
  const [rows] = await pool.query(
    `SELECT u.email
     FROM resources r
     INNER JOIN users u ON u.id = r.pic_user_id
     WHERE r.id = ?`,
    [resourceId],
  );
  const email = rows[0]?.email;
  return email ? email.toLowerCase() : null;
}

async function notifyUser(email, type, title, body, link) {
  await createNotification({ userEmail: email, type, title, body, link }).catch(() => {});
}

export async function notifyBookingSubmitted(booking) {
  const link = '/bookings';
  const title = booking.title || 'Booking';
  const resource = booking.resource_name || 'resource';
  const booker = booking.booked_by_name || booking.booked_by_email;
  const bookerEmail = booking.booked_by_email?.toLowerCase();
  const isPending = booking.status === 'pending';

  if (bookerEmail) {
    await notifyUser(
      bookerEmail,
      'booking_submitted',
      isPending ? 'Booking submitted for approval' : 'Booking confirmed',
      isPending
        ? `"${title}" at ${resource} is pending approval.`
        : `"${title}" at ${resource} has been confirmed.`,
      link,
    );
  }

  const picEmail = await getResourcePicEmail(booking.resource_id);
  if (picEmail && picEmail !== bookerEmail) {
    await notifyUser(
      picEmail,
      isPending ? 'booking_pending_pic' : 'booking_new_pic',
      isPending ? 'New booking awaiting approval' : 'New booking on your resource',
      isPending
        ? `${booker} submitted "${title}" for ${resource}.`
        : `${booker} booked "${title}" for ${resource}.`,
      link,
    );
  }

  if (isPending) {
    const admins = await getAdminEmails();
    await Promise.all(admins.map(email => {
      if (email === bookerEmail || email === picEmail) return Promise.resolve();
      return notifyUser(
        email,
        'booking_pending',
        'New booking pending approval',
        `${booker} submitted "${title}" at ${resource}.`,
        link,
      );
    }));
  }
}

export async function notifyBookingStatusChange(booking, status) {
  const link = '/bookings';
  const title = booking.title || 'Booking';
  const resource = booking.resource_name || 'resource';
  const email = booking.booked_by_email;
  if (!email) return;

  const messages = {
    confirmed: {
      type: 'booking_confirmed',
      title: 'Booking confirmed',
      body: `"${title}" at ${resource} has been approved.`,
    },
    rejected: {
      type: 'booking_rejected',
      title: 'Booking rejected',
      body: `"${title}" at ${resource} was rejected.`,
    },
    cancelled: {
      type: 'booking_cancelled',
      title: 'Booking cancelled',
      body: `"${title}" at ${resource} was cancelled.`,
    },
  };

  const msg = messages[status];
  if (!msg) return;

  const bookerEmail = email.toLowerCase();
  await notifyUser(bookerEmail, msg.type, msg.title, msg.body, link);

  const picEmail = await getResourcePicEmail(booking.resource_id);
  if (picEmail && picEmail !== bookerEmail) {
    await notifyUser(
      picEmail,
      `booking_${status}_pic`,
      `Booking ${status}: ${title}`,
      `"${title}" at ${resource} is now ${status}.`,
      link,
    );
  }

  if (status === 'confirmed' || status === 'rejected' || status === 'cancelled') {
    const admins = await getAdminEmails();
    await Promise.all(admins.map(adminEmail => {
      if (adminEmail === bookerEmail || adminEmail === picEmail) return Promise.resolve();
      return notifyUser(
        adminEmail,
        `booking_${status}`,
        `Booking ${status}: ${title}`,
        `"${title}" at ${resource} is now ${status}.`,
        link,
      );
    }));
  }
}
