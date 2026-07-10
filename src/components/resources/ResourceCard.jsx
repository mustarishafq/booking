import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users, MapPin, Pencil, ShieldCheck, UserRound, Wrench, Link2, Phone, Zap, CalendarDays,
} from 'lucide-react';
import { resourceStatusBadge, getPairWithTypes } from '@/lib/bookingUtils';
import { getResourceTypeIcon, getResourceExp } from '@/lib/resourceVisuals';
import { cn } from '@/lib/utils';

const pricingLabel = { hourly: '/hr', daily: '/day', flat: ' flat' };

function phoneHref(phone) {
  const digits = String(phone || '').replace(/[^\d+]/g, '');
  return digits ? `tel:${digits}` : null;
}

function PhoneLink({ phone, className, compact = false, onClick }) {
  const href = phoneHref(phone);
  if (!href) return null;
  return (
    <a
      href={href}
      onClick={onClick}
      className={cn('flex items-center gap-1 min-w-0 text-primary hover:underline', className)}
      title={`Call ${phone}`}
    >
      <Phone className={cn('shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span className="truncate">{phone}</span>
    </a>
  );
}

function PairWithBadge({ resource, className, compact = false }) {
  const types = getPairWithTypes(resource);
  if (types.length === 0) return null;
  const label = types.length === 1
    ? `Pairs with ${types[0]}`
    : `Pairs with ${types.length} types`;
  return (
    <Badge
      variant="outline"
      className={cn('gap-1 bg-background/90 pointer-events-none backdrop-blur-sm', className)}
      title={types.join(', ')}
    >
      <Link2 className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {compact && types.length > 1 ? `+${types.length}` : label}
    </Badge>
  );
}

function CareBadge({ summary, className }) {
  if (!summary) return null;
  if (summary.overdue > 0) {
    return (
      <Badge className={cn('gap-1 bg-destructive/90 text-destructive-foreground pointer-events-none', className)}>
        <Wrench className="w-3 h-3" />
        {summary.overdue} overdue
      </Badge>
    );
  }
  if (summary.due > 0) {
    return (
      <Badge className={cn('gap-1 bg-warning/90 text-warning-foreground pointer-events-none', className)}>
        <Wrench className="w-3 h-3" />
        Due now
      </Badge>
    );
  }
  if (summary.upcoming > 0 && summary.next_due_at) {
    return (
      <Badge variant="outline" className={cn('gap-1 pointer-events-none', className)}>
        <Wrench className="w-3 h-3" />
        Due {summary.next_due_at}
      </Badge>
    );
  }
  return null;
}

function PicDisplay({ resource, className, compact = false }) {
  if (!resource.pic_user_id) return null;
  const label = resource.pic_name?.trim() || resource.pic_email;
  if (!label) return null;

  return (
    <span
      className={cn('flex items-center gap-1 min-w-0', className)}
      title={resource.pic_email && resource.pic_name ? resource.pic_email : undefined}
    >
      <UserRound className={cn('shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span className="truncate">{label}</span>
    </span>
  );
}

function ApprovalBadge({ className, compact = false }) {
  return (
    <Badge className={cn('bg-warning/90 text-warning-foreground gap-1', className)}>
      <ShieldCheck className={compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      {compact ? 'Approval' : 'Approval required'}
    </Badge>
  );
}

function PriceDisplay({ isInternal, resource, className }) {
  if (isInternal) return null;
  return (
    <span className={cn('font-semibold text-foreground whitespace-nowrap tabular-nums', className)}>
      RM{resource.rate}{pricingLabel[resource.pricing_model]}
    </span>
  );
}

function TypeIconBadge({ resourceType, className }) {
  const Icon = getResourceTypeIcon(resourceType);
  return (
    <Badge className={cn('gap-1 bg-primary/90 text-primary-foreground backdrop-blur-sm', className)}>
      <Icon className="w-3 h-3 shrink-0" />
      <span className="truncate">{resourceType}</span>
    </Badge>
  );
}

function ResourceMeta({ resource, isInternal, amenityLimit = 3, className }) {
  return (
    <div className={cn('flex items-center gap-3 sm:gap-4 text-sm text-muted-foreground flex-wrap', className)}>
      {resource.capacity > 0 && (
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5 shrink-0" />
          {resource.capacity}
          <span className="hidden sm:inline"> pax</span>
        </span>
      )}
      <PriceDisplay isInternal={isInternal} resource={resource} />
      {resource.location && (
        <span className="flex items-center gap-1 min-w-0">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{resource.location}</span>
        </span>
      )}
      {resource.phone && (
        <PhoneLink phone={resource.phone} onClick={(e) => e.stopPropagation()} />
      )}
      {resource.amenities?.length > 0 && (
        <div className="flex gap-1 flex-wrap w-full sm:w-auto">
          {resource.amenities.slice(0, amenityLimit).map(a => (
            <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>
          ))}
          {resource.amenities.length > amenityLimit && (
            <Badge variant="secondary" className="text-xs font-normal">+{resource.amenities.length - amenityLimit}</Badge>
          )}
        </div>
      )}
    </div>
  );
}

function ResourceActions({ isActive, isAdmin, onBook, onEdit, resourceId, bookLabel = 'Book Now', className }) {
  if (!isActive && !isAdmin) return null;

  return (
    <div className={cn('flex gap-2', className)}>
      {isActive && onBook && (
        <Button className="flex-1 sm:flex-none min-h-9" size="sm" onClick={() => onBook(resourceId)}>
          {bookLabel}
        </Button>
      )}
      {isAdmin && (
        <Button variant="outline" size="sm" className="min-h-9" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5 sm:mr-1" />
          <span className="hidden sm:inline">Edit</span>
        </Button>
      )}
    </div>
  );
}

function ImagePlaceholder({ resourceType }) {
  const Icon = getResourceTypeIcon(resourceType);
  return (
    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/15 via-primary/5 to-muted">
      <div className="rounded-2xl bg-background/60 p-4 ring-1 ring-primary/10 shadow-sm">
        <Icon className="w-10 h-10 text-primary/45" />
      </div>
    </div>
  );
}

function MetaChip({ icon: Icon, children }) {
  if (!children) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted/80 px-1.5 py-0.5 text-[11px] text-muted-foreground max-w-full">
      <Icon className="w-3 h-3 shrink-0 text-primary/70" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function ExpBadge({ bookingCount = 0, className }) {
  const { exp, level, bookingCount: count } = getResourceExp(bookingCount);
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 pointer-events-none shadow-sm',
        'border-white/25 bg-white/15 text-white backdrop-blur-md',
        'dark:border-white/20 dark:bg-black/30',
        className,
      )}
      title={`${count} booking${count !== 1 ? 's' : ''} · ${exp} EXP · Level ${level}`}
    >
      <Zap className="w-3 h-3 fill-amber-300 text-amber-300" />
      <span className="tabular-nums">{exp} XP</span>
      <span className="opacity-80">· Lv.{level}</span>
    </Badge>
  );
}

export default function ResourceCard({ resource, onEdit, onBook, isAdmin, isInternal, bookingCount = 0, view = 'grid' }) {
  const isActive = resource.status === 'active';

  /* ── GRID view ── */
  if (view === 'grid') {
    const canBook = isActive && onBook;
    const TypeIcon = getResourceTypeIcon(resource.resource_type);
    const amenities = resource.amenities || [];
    const pairTypes = getPairWithTypes(resource);
    const tel = phoneHref(resource.phone);
    const expInfo = getResourceExp(bookingCount);

    return (
      <Card
        className={cn(
          'rounded-2xl border border-border/60 overflow-hidden group',
          'bg-card shadow-sm hover:shadow-md hover:shadow-primary/10 hover:border-primary/30',
          'transition-all duration-300 h-full flex flex-col',
          canBook && 'cursor-pointer',
        )}
        onClick={canBook ? () => onBook(resource.id) : undefined}
        onKeyDown={canBook ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onBook(resource.id);
          }
        } : undefined}
        role={canBook ? 'button' : undefined}
        tabIndex={canBook ? 0 : undefined}
      >
        {/* Media */}
        <div className="relative aspect-[4/3] overflow-hidden bg-muted shrink-0">
          {resource.image_url ? (
            <img
              src={resource.image_url}
              alt={resource.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <ImagePlaceholder resourceType={resource.resource_type} />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent pointer-events-none" />

          <div className="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5">
            <div className="flex flex-col items-start gap-1 max-w-[75%]">
              <Badge className="gap-1 bg-primary text-primary-foreground shadow-sm text-[10px] px-2 max-w-full truncate">
                <TypeIcon className="w-3 h-3 shrink-0" />
                <span className="truncate">{resource.resource_type}</span>
              </Badge>
              <ExpBadge bookingCount={bookingCount} className="text-[10px] px-1.5" />
            </div>
            <div className="flex flex-col items-end gap-1">
              {resource.status !== 'active' && (
                <Badge className={cn('text-[10px] capitalize shadow-sm', resourceStatusBadge[resource.status])}>
                  {resource.status}
                </Badge>
              )}
              {pairTypes.length > 0 && (
                <PairWithBadge resource={resource} className="text-[10px] shadow-sm" compact />
              )}
            </div>
          </div>

          <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-end justify-between gap-2">
            {resource.requires_approval !== false ? (
              <ApprovalBadge className="text-[10px] shadow-sm" compact />
            ) : (
              <span />
            )}
            <div className="flex items-center gap-1.5">
              {!isInternal && (
                <span className="rounded-full bg-black/45 backdrop-blur-sm border border-white/15 px-2.5 py-1 text-xs font-semibold text-white tabular-nums shadow-sm">
                  RM{resource.rate}{pricingLabel[resource.pricing_model]}
                </span>
              )}
              {isAdmin && (
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 shadow-md pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  aria-label="Edit resource"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Body — dense stack, actions pinned */}
        <div className="flex flex-1 flex-col p-3.5 gap-2.5">
          <div className="min-w-0 space-y-1">
            <h3 className="font-semibold text-[15px] leading-snug tracking-tight line-clamp-2">
              {resource.name}
            </h3>
            <p className={cn(
              'text-xs leading-relaxed line-clamp-2',
              resource.description ? 'text-muted-foreground' : 'text-muted-foreground/45',
            )}
            >
              {resource.description || 'No description provided'}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <MetaChip icon={Users}>
              {resource.capacity > 0 ? `${resource.capacity} pax` : null}
            </MetaChip>
            <MetaChip icon={MapPin}>{resource.location || null}</MetaChip>
            {pairTypes.length > 0 && (
              <MetaChip icon={Link2}>
                {pairTypes.length === 1 ? pairTypes[0] : `${pairTypes.length} types`}
              </MetaChip>
            )}
            <MetaChip icon={Zap}>
              {`${expInfo.bookingCount} booked`}
            </MetaChip>
          </div>

          {/* EXP progress toward next level */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                <Zap className="w-3 h-3 fill-current" />
                {expInfo.exp} XP
              </span>
              <span>Lv.{expInfo.level}</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${Math.max(4, expInfo.progress * 100)}%` }}
              />
            </div>
          </div>

          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {amenities.slice(0, 3).map(a => (
                <Badge key={a} variant="secondary" className="text-[10px] font-normal h-5 px-1.5">
                  {a}
                </Badge>
              ))}
              {amenities.length > 3 && (
                <Badge variant="secondary" className="text-[10px] font-normal h-5 px-1.5">
                  +{amenities.length - 3}
                </Badge>
              )}
            </div>
          )}

          <CareBadge summary={resource.care_summary} className="text-[10px] w-fit" />

          <div className="mt-auto pt-1.5 flex items-stretch gap-2 pointer-events-auto">
            {tel ? (
              <Button
                asChild
                variant="outline"
                size="sm"
                className={cn(
                  'h-10 gap-1.5 text-xs font-semibold rounded-xl',
                  'border-border/80 bg-muted/40 hover:bg-muted hover:text-foreground',
                  canBook ? 'flex-1' : 'w-full',
                )}
              >
                <a
                  href={tel}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Call ${resource.phone}`}
                  title={`Call ${resource.phone}`}
                >
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  Contact
                </a>
              </Button>
            ) : null}
            {canBook ? (
              <Button
                size="sm"
                className={cn(
                  'h-10 gap-1.5 text-xs font-semibold rounded-xl shadow-md shadow-primary/25',
                  'hover:shadow-lg hover:shadow-primary/30',
                  tel ? 'flex-[1.35]' : 'w-full',
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  onBook(resource.id);
                }}
              >
                <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                Book now
              </Button>
            ) : null}
          </div>
        </div>
      </Card>
    );
  }

  /* ── LIST view ── */
  if (view === 'list') {
    return (
      <Card className="rounded-2xl border border-border/70 overflow-hidden hover:shadow-lg hover:shadow-primary/10 hover:border-primary/25 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:gap-0">
          <div className="relative w-full md:w-44 lg:w-52 flex-shrink-0 overflow-hidden">
            <div className="aspect-[16/9] md:aspect-auto md:h-full md:min-h-[148px]">
              {resource.image_url ? (
                <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
              ) : (
                <ImagePlaceholder resourceType={resource.resource_type} />
              )}
            </div>
            <div className="absolute top-2 left-2 flex flex-wrap gap-1 max-w-[calc(100%-1rem)]">
              <TypeIconBadge resourceType={resource.resource_type} className="text-xs" />
              <PairWithBadge resource={resource} className="text-xs" compact />
            </div>
            {resource.requires_approval !== false && (
              <ApprovalBadge className="absolute bottom-2 left-2 text-xs" compact />
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base leading-tight tracking-tight">{resource.name}</h3>
                  {resource.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{resource.location}</span>
                    </p>
                  )}
                  <PicDisplay resource={resource} className="text-xs text-muted-foreground mt-0.5" />
                </div>
                {resource.status !== 'active' && (
                  <Badge className={cn('text-xs shrink-0 capitalize', resourceStatusBadge[resource.status])}>
                    {resource.status}
                  </Badge>
                )}
              </div>
              <p className={cn(
                'text-sm line-clamp-2 md:line-clamp-3',
                resource.description ? 'text-muted-foreground' : 'text-muted-foreground/40',
              )}
              >
                {resource.description || 'No description provided'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-auto">
              <div className="space-y-2 flex-1 min-w-0">
                <ResourceMeta resource={resource} isInternal={isInternal} amenityLimit={4} />
                <CareBadge summary={resource.care_summary} />
              </div>
              <ResourceActions
                isActive={isActive}
                isAdmin={isAdmin}
                onBook={onBook}
                onEdit={onEdit}
                resourceId={resource.id}
                className="w-full sm:w-auto shrink-0"
              />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  /* ── COMPACT view ── */
  const CompactIcon = getResourceTypeIcon(resource.resource_type);

  return (
    <div className="px-3 py-3 sm:px-4 hover:bg-muted/40 transition-colors">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl flex-shrink-0 overflow-hidden bg-muted ring-1 ring-border/50">
            {resource.image_url ? (
              <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/5">
                <CompactIcon className="w-4 h-4 text-primary/50" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{resource.name}</p>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 shrink-0 gap-1 hidden sm:inline-flex">
                <CompactIcon className="w-2.5 h-2.5" />
                {resource.resource_type}
              </Badge>
              <PairWithBadge resource={resource} className="text-xs px-1.5 py-0 h-4 shrink-0 hidden sm:inline-flex" compact />
              {resource.status !== 'active' && (
                <Badge className={cn('text-xs px-1.5 py-0 h-4 shrink-0 capitalize', resourceStatusBadge[resource.status])}>
                  {resource.status}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              {resource.capacity > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {resource.capacity}
                </span>
              )}
              {resource.location && (
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[8rem] sm:max-w-none">{resource.location}</span>
                </span>
              )}
              <PicDisplay resource={resource} compact />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 pl-14 sm:pl-0 shrink-0">
          <PriceDisplay isInternal={isInternal} resource={resource} className="text-sm" />
          <div className="flex items-center gap-2">
            {isActive && onBook && (
              <Button size="sm" className="h-8 px-3" onClick={() => onBook(resource.id)}>Book</Button>
            )}
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={onEdit} aria-label="Edit resource">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
