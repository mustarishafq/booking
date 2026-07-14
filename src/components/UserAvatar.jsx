import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const SIZE_CLASS = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
  xl: 'h-14 w-14 text-lg',
  profile: 'h-16 w-16 text-xl sm:h-20 sm:w-20 sm:text-2xl',
};

function getInitials(name, email) {
  if (name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  return (email?.[0] || 'U').toUpperCase();
}

/**
 * Shared user avatar — prefers avatar_url, falls back to initials.
 */
export default function UserAvatar({
  user,
  avatarUrl,
  name,
  email,
  size = 'md',
  className,
  fallbackClassName,
  rounded = true,
}) {
  const displayName = name ?? user?.full_name;
  const displayEmail = email ?? user?.email;
  const src = avatarUrl ?? user?.avatar_url ?? null;
  const initials = getInitials(displayName, displayEmail);

  const radius = size === 'profile'
    ? 'rounded-2xl'
    : rounded
      ? 'rounded-full'
      : 'rounded-lg';

  return (
    <Avatar className={cn(SIZE_CLASS[size] || SIZE_CLASS.md, radius, 'shrink-0', className)}>
      {src ? <AvatarImage src={src} alt={displayName || displayEmail || 'User'} className={radius} /> : null}
      <AvatarFallback
        className={cn(
          radius,
          'bg-primary/10 font-bold text-primary',
          fallbackClassName,
        )}
      >
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Compact avatar + name row for bookers, PIC, care completers, audit actors.
 */
export function UserIdentity({
  user,
  avatarUrl,
  name,
  email,
  size = 'xs',
  className,
  labelClassName,
  showLabel = true,
  rounded = true,
}) {
  const displayName = name ?? user?.full_name;
  const displayEmail = email ?? user?.email;
  const label = displayName?.trim() || displayEmail || '—';

  return (
    <span className={cn('inline-flex items-center gap-1.5 min-w-0 max-w-full', className)}>
      <UserAvatar
        user={user}
        avatarUrl={avatarUrl}
        name={displayName}
        email={displayEmail}
        size={size}
        rounded={rounded}
      />
      {showLabel && (
        <span className={cn('truncate', labelClassName)}>{label}</span>
      )}
    </span>
  );
}
