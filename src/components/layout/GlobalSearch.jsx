import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { BookOpen, Boxes, Loader2, Search } from 'lucide-react';
import { db } from '@/api/base44Client';
import { hasPermission } from '@/lib/permissions';
import { useGlobalSearchShortcut } from '@/hooks/useGlobalSearchShortcut';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

const RESULT_LIMIT = 5;
const DEBOUNCE_MS = 250;

function useDebouncedValue(value, delay = DEBOUNCE_MS) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function matchesQuery(value, query) {
  return value?.toLowerCase().includes(query.toLowerCase());
}

function getInitials(name, email) {
  if (name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  return (email?.[0] || 'U').toUpperCase();
}

export function GlobalSearchTrigger({ onClick, className }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex w-full items-center rounded-lg bg-muted/50 pl-9 pr-3 h-10',
        'text-sm text-left text-muted-foreground transition-colors',
        'hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className,
      )}
      aria-label="Open global search"
    >
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <span className="truncate">Search resources, bookings…</span>
      <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
        ⌘K
      </kbd>
    </button>
  );
}

export default function GlobalSearch({ user }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query);

  const canViewResources = hasPermission(user, 'view_resources');
  const canViewBookings = hasPermission(user, 'book_resources') || hasPermission(user, 'view_all_bookings');
  const canViewUsers = hasPermission(user, 'view_users');
  const seeAllBookings = hasPermission(user, 'view_all_bookings') || hasPermission(user, 'manage_bookings');

  const openSearch = useCallback(() => setOpen(true), []);
  useGlobalSearchShortcut(openSearch);

  const resourcesQuery = useQuery({
    queryKey: ['resources'],
    queryFn: () => db.entities.Resource.list(),
    enabled: open && canViewResources,
  });

  const bookingsQuery = useQuery({
    queryKey: ['bookings'],
    queryFn: () => db.entities.Booking.list('-start_time', 200),
    enabled: open && canViewBookings,
  });

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: () => db.entities.User.list(),
    enabled: open && canViewUsers,
  });

  const resources = resourcesQuery.data ?? [];
  const bookings = bookingsQuery.data ?? [];
  const users = usersQuery.data ?? [];

  const isLoading =
    (canViewResources && resourcesQuery.isLoading) ||
    (canViewBookings && bookingsQuery.isLoading) ||
    (canViewUsers && usersQuery.isLoading);
  const trimmedQuery = debouncedQuery.trim();

  const results = useMemo(() => {
    if (!trimmedQuery) {
      return { resources: [], bookings: [], users: [] };
    }

    const resourceResults = canViewResources
      ? resources.filter(r =>
          matchesQuery(r.name, trimmedQuery) ||
          matchesQuery(r.resource_type, trimmedQuery) ||
          matchesQuery(r.location, trimmedQuery),
        ).slice(0, RESULT_LIMIT)
      : [];

    const visibleBookings = seeAllBookings
      ? bookings
      : bookings.filter(b => b.booked_by_email === user?.email);

    const bookingResults = canViewBookings
      ? visibleBookings.filter(b =>
          matchesQuery(b.title, trimmedQuery) ||
          matchesQuery(b.resource_name, trimmedQuery) ||
          matchesQuery(b.booked_by_name, trimmedQuery) ||
          matchesQuery(b.booked_by_email, trimmedQuery),
        ).slice(0, RESULT_LIMIT)
      : [];

    const userResults = canViewUsers
      ? users.filter(u =>
          matchesQuery(u.full_name, trimmedQuery) ||
          matchesQuery(u.email, trimmedQuery),
        ).slice(0, RESULT_LIMIT)
      : [];

    return {
      resources: resourceResults,
      bookings: bookingResults,
      users: userResults,
    };
  }, [
    trimmedQuery,
    resources,
    bookings,
    users,
    canViewResources,
    canViewBookings,
    canViewUsers,
    seeAllBookings,
    user?.email,
  ]);

  const totalResults = results.resources.length + results.bookings.length + results.users.length;

  const handleOpenChange = (nextOpen) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery('');
  };

  const closeAndNavigate = (path) => {
    setOpen(false);
    setQuery('');
    navigate(path);
  };

  return (
    <>
      <GlobalSearchTrigger onClick={() => setOpen(true)} />

      <CommandDialog open={open} onOpenChange={handleOpenChange} shouldFilter={false}>
        <CommandInput
          placeholder="Search resources, bookings, or users…"
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {!trimmedQuery && (
            <CommandEmpty>Type to search resources, bookings, or users.</CommandEmpty>
          )}

          {trimmedQuery && isLoading && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching…
            </div>
          )}

          {trimmedQuery && !isLoading && totalResults === 0 && (
            <CommandEmpty>No results found.</CommandEmpty>
          )}

          {trimmedQuery && !isLoading && results.resources.length > 0 && (
            <CommandGroup heading="Resources">
              {results.resources.map(resource => (
                <CommandItem
                  key={`resource-${resource.id}`}
                  value={`resource-${resource.id}`}
                  onSelect={() => closeAndNavigate(`/resources?search=${encodeURIComponent(resource.name || trimmedQuery)}`)}
                  className="gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Boxes className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{resource.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[resource.resource_type, resource.location].filter(Boolean).join(' · ') || 'Resource'}
                    </p>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {trimmedQuery && !isLoading && results.bookings.length > 0 && (
            <CommandGroup heading="Bookings">
              {results.bookings.map(booking => (
                <CommandItem
                  key={`booking-${booking.id}`}
                  value={`booking-${booking.id}`}
                  onSelect={() => closeAndNavigate(`/bookings?search=${encodeURIComponent(booking.title || trimmedQuery)}`)}
                  className="gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-info/10">
                    <BookOpen className="h-4 w-4 text-info" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{booking.title || booking.resource_name || 'Booking'}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[booking.resource_name, booking.start_time ? format(new Date(booking.start_time), 'MMM d, yyyy') : null]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  {booking.status && (
                    <Badge variant="secondary" className="capitalize shrink-0 text-[10px]">
                      {booking.status}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {trimmedQuery && !isLoading && results.users.length > 0 && (
            <CommandGroup heading="Users">
              {results.users.map(resultUser => (
                <CommandItem
                  key={`user-${resultUser.id}`}
                  value={`user-${resultUser.id}`}
                  onSelect={() => closeAndNavigate(`/users?search=${encodeURIComponent(resultUser.email || trimmedQuery)}`)}
                  className="gap-3"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(resultUser.full_name, resultUser.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{resultUser.full_name || resultUser.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{resultUser.email}</p>
                  </div>
                  {resultUser.role && (
                    <Badge variant="secondary" className="capitalize shrink-0 text-[10px]">
                      {resultUser.role}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
