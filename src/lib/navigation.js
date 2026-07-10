import {
  LayoutDashboard, CalendarDays, Boxes, BookOpen, Plus,
  Users, CreditCard, Receipt, Settings, Shield, User, Bell, Grip,
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
  { label: 'Notifications', dockLabel: 'Notif', icon: Bell, path: '/notifications', match: (p) => p.startsWith('/notifications'), badgeKey: 'notifications' },
  { label: 'Profile', dockLabel: 'Profile', icon: User, path: '/profile', match: (p) => p.startsWith('/profile') },
];

export const adminNavItems = [
  { label: 'Users', dockLabel: 'Users', icon: Users, path: '/users', permission: 'view_users', match: (p) => p.startsWith('/users') },
  { label: 'Roles & Permissions', dockLabel: 'Roles', icon: Shield, path: '/roles', permission: 'manage_roles', match: (p) => p.startsWith('/roles') },
  { label: 'Settings', dockLabel: 'Settings', icon: Settings, path: '/settings', permission: 'manage_settings', match: (p) => p.startsWith('/settings') },
];

/** Mobile dock: Dashboard · Resources · [Book orb] · Calendar · More */
const MOBILE_DOCK_LEFT_PATHS = ['/', '/resources'];
const MOBILE_DOCK_RIGHT_PATHS = ['/calendar'];
const ADMIN_MOBILE_FALLBACK_PATHS = ['/', '/resources', '/bookings'];

/** Desktop dock order — Profile last when shown. */
const DESKTOP_DOCK_PATH_ORDER = [
  '/',
  '/resources',
  '/bookings',
  '/calendar',
  '/users',
  '/roles',
  '/settings',
  '/credits',
  '/transactions',
  '/profile',
];

const DESKTOP_DOCK_LABELS = {
  '/': 'Dashboard',
  '/calendar': 'Calendar',
  '/bookings': 'Bookings',
  '/notifications': 'Notif',
};

const MORE_ITEM = {
  label: 'More',
  dockLabel: 'More',
  icon: Grip,
  type: 'more',
  badgeKey: 'notifications',
};

export function getCenterDockAction(user, { hasPermission }) {
  if (!user || !hasPermission(user, 'book_resources')) return null;

  return {
    label: 'New Booking',
    dockLabel: 'Book',
    icon: Plus,
    action: 'openBookingModal',
    type: 'book-orb',
  };
}

export function isMobileUserNav(user) {
  return user?.role === 'user';
}

export function isAdminNav(user) {
  return user?.role === 'admin';
}

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

function getItemByPath(byPath, path, labelOverrides = {}) {
  const item = byPath.get(path);
  if (!item) return null;
  const dockLabel = labelOverrides[path];
  return dockLabel ? { ...item, dockLabel } : item;
}

/**
 * Mobile More sheet routes — everything not on the primary 5-tab dock.
 * Notifications live here (bell + badge); More dock tab also shows the badge.
 */
export function buildMobileMoreItems(user, { hasPermission }) {
  const all = getAllNavItems(user, { hasPermission });
  const dockPaths = new Set([...MOBILE_DOCK_LEFT_PATHS, ...MOBILE_DOCK_RIGHT_PATHS]);

  const overflow = all.filter(item => !dockPaths.has(item.path));
  const adminPaths = new Set(adminNavItems.map(i => i.path));

  // Keep Notifications near the front of the More grid
  const main = overflow
    .filter(item => !adminPaths.has(item.path))
    .sort((a, b) => {
      if (a.path === '/notifications') return -1;
      if (b.path === '/notifications') return 1;
      return 0;
    });

  return {
    main,
    admin: overflow.filter(item => adminPaths.has(item.path)),
  };
}

function buildMobileDockEntries(user, { hasPermission }) {
  const byPath = new Map(getAllNavItems(user, { hasPermission }).map(item => [item.path, item]));
  const center = getCenterDockAction(user, { hasPermission });
  const entries = [];

  for (const path of MOBILE_DOCK_LEFT_PATHS) {
    if (center && entries.length >= 2) break;
    const item = getItemByPath(byPath, path, DESKTOP_DOCK_LABELS);
    if (item) entries.push({ kind: 'item', item });
  }

  if (center) {
    entries.push({ kind: 'book-orb', item: center });
  } else {
    for (const path of ADMIN_MOBILE_FALLBACK_PATHS) {
      if (entries.some(e => e.item?.path === path)) continue;
      if (entries.length >= 3) break;
      const item = getItemByPath(byPath, path, DESKTOP_DOCK_LABELS);
      if (item) entries.push({ kind: 'item', item });
    }
  }

  for (const path of MOBILE_DOCK_RIGHT_PATHS) {
    const item = getItemByPath(byPath, path, DESKTOP_DOCK_LABELS);
    if (item) entries.push({ kind: 'item', item });
  }

  const moreSections = buildMobileMoreItems(user, { hasPermission });
  const morePaths = [...moreSections.main, ...moreSections.admin].map(i => i.path);

  entries.push({
    kind: 'more',
    item: {
      ...MORE_ITEM,
      match: (p) => morePaths.some(path => (path === '/' ? p === '/' : p.startsWith(path))),
    },
  });

  return entries;
}

function buildDesktopDockEntries(user, { hasPermission }) {
  const byPath = new Map(getAllNavItems(user, { hasPermission }).map(item => [item.path, item]));
  const hideProfile = isMobileUserNav(user); // profile via TopBar avatar on desktop

  return DESKTOP_DOCK_PATH_ORDER
    .filter(path => !(hideProfile && path === '/profile'))
    .map(path => getItemByPath(byPath, path, DESKTOP_DOCK_LABELS))
    .filter(Boolean)
    .map(item => ({ kind: 'item', item }));
}

export function getDockEntries(user, { hasPermission }, { isMobile = false } = {}) {
  if (!user) return [];
  return isMobile
    ? buildMobileDockEntries(user, { hasPermission })
    : buildDesktopDockEntries(user, { hasPermission });
}

/** @deprecated Prefer buildMobileMoreItems — kept for any leftover callers */
export function getSidebarItems(user, { hasPermission }, { isMobile = false } = {}) {
  if (!isMobile) return [];
  const { main, admin } = buildMobileMoreItems(user, { hasPermission });
  return [...main, ...admin];
}

export function getSidebarSections(user, { hasPermission }, { isMobile = false } = {}) {
  if (!isMobile) return { main: [], admin: [] };
  return buildMobileMoreItems(user, { hasPermission });
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

export function isMoreNavActive(moreItem, pathname) {
  return isNavActive(moreItem, pathname);
}
