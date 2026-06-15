import {
  LayoutDashboard, CalendarDays, Boxes, BookOpen, Plus,
  Users, CreditCard, Receipt, Settings, Shield, User, Bell,
} from 'lucide-react';

export const mainNavItems = [
  { label: 'Dashboard', dockLabel: 'Dashboard', icon: LayoutDashboard, path: '/', match: (p) => p === '/' },
  { label: 'Resources', dockLabel: 'Resources', icon: Boxes, path: '/resources', permission: 'view_resources', match: (p) => p.startsWith('/resources') },
  { label: 'Bookings', dockLabel: 'Bookings', icon: BookOpen, path: '/bookings', permission: 'book_resources', match: (p) => p.startsWith('/bookings') },
  { label: 'Calendar', dockLabel: 'Calendar', icon: CalendarDays, path: '/calendar', permission: 'view_calendar', match: (p) => p.startsWith('/calendar') },
];

export const secondaryNavItems = [
  { label: 'Credits', dockLabel: 'Credits', icon: CreditCard, path: '/credits', permission: 'top_up_credits', paymentOnly: true, match: (p) => p.startsWith('/credits') },
  { label: 'Transactions', dockLabel: 'Txns', icon: Receipt, path: '/transactions', permission: 'view_own_transactions', paymentOnly: true, match: (p) => p.startsWith('/transactions') },
  { label: 'Notifications', dockLabel: 'Notification', icon: Bell, path: '/notifications', match: (p) => p.startsWith('/notifications'), badgeKey: 'notifications' },
  { label: 'Profile', dockLabel: 'Profile', icon: User, path: '/profile', match: (p) => p.startsWith('/profile') },
];

export const adminNavItems = [
  { label: 'Users', dockLabel: 'Users', icon: Users, path: '/users', permission: 'view_users', match: (p) => p.startsWith('/users') },
  { label: 'Roles & Permissions', dockLabel: 'Roles', icon: Shield, path: '/roles', permission: 'manage_roles', match: (p) => p.startsWith('/roles') },
  { label: 'Settings', dockLabel: 'Settings', icon: Settings, path: '/settings', permission: 'manage_settings', match: (p) => p.startsWith('/settings') },
];

export function getCenterDockAction(user, { hasPermission }) {
  if (user?.role !== 'user') return null;
  if (!hasPermission(user, 'book_resources')) return null;

  return {
    label: 'New Booking',
    dockLabel: 'Book',
    icon: Plus,
    action: 'openBookingModal',
  };
}

export function isMobileUserNav(user) {
  return user?.role === 'user';
}

export function isAdminNav(user) {
  return user?.role === 'admin';
}

/** Admin mobile dock: left → right (Profile is rightmost). */
const ADMIN_MOBILE_DOCK_PATH_ORDER = ['/', '/resources', '/bookings', '/calendar', '/notifications', '/profile'];

/** Admin tablet/desktop dock: all items, Profile rightmost. */
const ADMIN_DESKTOP_DOCK_PATH_ORDER = [
  '/',
  '/resources',
  '/bookings',
  '/calendar',
  '/notifications',
  '/users',
  '/roles',
  '/settings',
  '/credits',
  '/transactions',
  '/profile',
];

const ADMIN_DOCK_LABELS = {
  '/calendar': 'Calendars',
  '/bookings': 'Booking',
  '/notifications': 'Notifications',
};

export const ADMIN_DOCK_PATHS = new Set(ADMIN_MOBILE_DOCK_PATH_ORDER);

export const MOBILE_USER_SIDEBAR_PATHS = new Set(['/resources', '/bookings']);

function getAllNavItems(user, { hasPermission }) {
  const isAdmin = isAdminNav(user);
  const visibleAdmin = isAdmin
    ? adminNavItems
    : adminNavItems.filter(item => hasPermission(user, item.permission));

  return filterNavItems(
    [...mainNavItems, ...secondaryNavItems, ...visibleAdmin],
    user,
    { hasPermission },
  );
}

export function getAdminDockItems(user, { hasPermission }, { isMobile = false } = {}) {
  const order = isMobile ? ADMIN_MOBILE_DOCK_PATH_ORDER : ADMIN_DESKTOP_DOCK_PATH_ORDER;
  const byPath = new Map(getAllNavItems(user, { hasPermission }).map(item => [item.path, item]));

  return order
    .map(path => {
      const item = byPath.get(path);
      if (!item) return null;
      const dockLabel = ADMIN_DOCK_LABELS[path];
      return dockLabel ? { ...item, dockLabel } : item;
    })
    .filter(Boolean);
}

export function getAdminSidebarItems(user, { hasPermission }) {
  return getAllNavItems(user, { hasPermission }).filter(item => !ADMIN_DOCK_PATHS.has(item.path));
}

export function getSidebarItems(user, { hasPermission }, { isMobile = false } = {}) {
  if (isAdminNav(user)) {
    if (!isMobile) return [];
    return getAdminSidebarItems(user, { hasPermission });
  }
  if (!isMobile || !isMobileUserNav(user)) return [];
  return getMobileUserSidebarItems(user, { hasPermission });
}

const ADMIN_SIDEBAR_PATHS = new Set(adminNavItems.map(item => item.path));

export function getSidebarSections(user, { hasPermission }, { isMobile = false } = {}) {
  const items = getSidebarItems(user, { hasPermission }, { isMobile });
  return {
    main: items.filter(item => !ADMIN_SIDEBAR_PATHS.has(item.path)),
    admin: items.filter(item => ADMIN_SIDEBAR_PATHS.has(item.path)),
  };
}

export function getMobileUserSidebarItems(user, { hasPermission }) {
  return getDockNavItems(user, { hasPermission }).filter(item =>
    MOBILE_USER_SIDEBAR_PATHS.has(item.path)
  );
}

export function getMobileUserDockItems(user, { hasPermission }) {
  return getDockNavItems(user, { hasPermission }).filter(item =>
    !MOBILE_USER_SIDEBAR_PATHS.has(item.path)
  );
}

export function getDockNavItems(user, { hasPermission }) {
  return getAllNavItems(user, { hasPermission });
}

export function filterNavItems(items, user, { hasPermission }) {
  const isInternal = user?.user_type === 'internal';
  return items.filter(item => {
    if (item.permission && !hasPermission(user, item.permission)) return false;
    if (item.paymentOnly && isInternal) return false;
    return true;
  });
}

export function isNavActive(item, pathname) {
  if (item.match) return item.match(pathname);
  return pathname === item.path;
}

function insertCenterAction(items, centerAction) {
  const profileItem = items.find(item => item.path === '/profile');
  const dockItems = items.filter(item => item.path !== '/profile');

  if (!centerAction) {
    const result = dockItems.map(item => ({ kind: 'item', item }));
    if (profileItem) result.push({ kind: 'item', item: profileItem });
    return result;
  }

  const mid = Math.ceil(dockItems.length / 2);
  const result = dockItems.slice(0, mid).map(item => ({ kind: 'item', item }));
  result.push({ kind: 'center', item: centerAction });
  dockItems.slice(mid).forEach(item => result.push({ kind: 'item', item }));
  if (profileItem) result.push({ kind: 'item', item: profileItem });
  return result;
}

export function getDockEntries(user, { hasPermission }, { isCompactNav = false, isMobile = false } = {}) {
  if (!user) return [];

  if (isAdminNav(user)) {
    return insertCenterAction(
      getAdminDockItems(user, { hasPermission }, { isMobile }),
      getCenterDockAction(user, { hasPermission }),
    );
  }

  const useCompactUserDock = isMobile && isMobileUserNav(user);
  let items = useCompactUserDock
    ? getMobileUserDockItems(user, { hasPermission })
    : getDockNavItems(user, { hasPermission });

  const showProfileInDock = isCompactNav || isMobileUserNav(user);
  if (!showProfileInDock) {
    items = items.filter(item => item.path !== '/profile');
  }

  const centerAction = getCenterDockAction(user, { hasPermission });
  return insertCenterAction(items, centerAction);
}
