import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Tag, Building2, Pencil, ShieldCheck, UserRound } from 'lucide-react';
import { resourceStatusBadge } from '@/lib/bookingUtils';
import { cn } from '@/lib/utils';

const pricingLabel = { hourly: '/hr', daily: '/day', flat: ' flat' };

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
      Approval required
    </Badge>
  );
}

function PriceDisplay({ isInternal, resource, className }) {
  if (isInternal) {
    return (
      <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full bg-success/10 text-success border border-success/30', className)}>
        <Building2 className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span className={cn('font-semibold text-foreground whitespace-nowrap', className)}>
      RM{resource.rate}{pricingLabel[resource.pricing_model]}
    </span>
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

export default function ResourceCard({ resource, onEdit, onBook, isAdmin, isInternal, view = 'grid' }) {
  const isActive = resource.status === 'active';

  /* ── GRID view ── */
  if (view === 'grid') {
    const canBook = isActive && onBook;

    return (
      <Card
        className={cn(
          'rounded-2xl border border-border overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full flex flex-col relative',
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
        <div className="aspect-[4/3] sm:aspect-video bg-muted relative overflow-hidden">
          {resource.image_url ? (
            <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
              <Tag className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground max-w-[calc(100%-1.5rem)] truncate pointer-events-none">
            {resource.resource_type}
          </Badge>
          {resource.status !== 'active' && (
            <Badge className={`absolute top-3 right-3 pointer-events-none ${resourceStatusBadge[resource.status]}`}>{resource.status}</Badge>
          )}
          {resource.requires_approval !== false && (
            <ApprovalBadge className="absolute bottom-3 left-3 pointer-events-none" />
          )}
          {isAdmin && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute bottom-3 right-3 z-10 h-8 w-8 shadow-md opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              aria-label="Edit resource"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
        <div className="p-4 space-y-3 flex-1 flex flex-col pointer-events-none">
          <div>
            <h3 className="font-semibold text-base leading-snug">{resource.name}</h3>
            <PicDisplay resource={resource} className="text-xs text-muted-foreground mt-1" />
            <p className={`text-sm mt-0.5 line-clamp-2 ${resource.description ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
              {resource.description || 'No description provided'}
            </p>
          </div>
          <ResourceMeta resource={resource} isInternal={isInternal} amenityLimit={3} className="flex-1" />
        </div>
      </Card>
    );
  }

  /* ── LIST view ── */
  if (view === 'list') {
    return (
      <Card className="rounded-2xl border border-border overflow-hidden hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
        <div className="flex flex-col md:flex-row md:gap-0">
          <div className="relative w-full md:w-44 lg:w-52 flex-shrink-0 overflow-hidden">
            <div className="aspect-[16/9] md:aspect-auto md:h-full md:min-h-[148px]">
              {resource.image_url ? (
                <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                  <Tag className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <Badge className="absolute top-2 left-2 text-xs bg-primary/90 text-primary-foreground max-w-[calc(100%-1rem)] truncate">
              {resource.resource_type}
            </Badge>
            {resource.requires_approval !== false && (
              <ApprovalBadge className="absolute bottom-2 left-2 text-xs" />
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col gap-3 min-w-0">
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-base leading-tight">{resource.name}</h3>
                  {resource.location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{resource.location}</span>
                    </p>
                  )}
                  <PicDisplay resource={resource} className="text-xs text-muted-foreground mt-0.5" />
                </div>
                {resource.status !== 'active' && (
                  <Badge className={`text-xs shrink-0 ${resourceStatusBadge[resource.status]}`}>{resource.status}</Badge>
                )}
              </div>
              <p className={`text-sm line-clamp-2 md:line-clamp-3 ${resource.description ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                {resource.description || 'No description provided'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mt-auto">
              <ResourceMeta resource={resource} isInternal={isInternal} amenityLimit={4} className="flex-1" />
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
  return (
    <div className="px-3 py-3 sm:px-4 bg-card hover:bg-muted/40 transition-colors">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 overflow-hidden bg-muted">
            {resource.image_url ? (
              <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Tag className="w-4 h-4 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm truncate">{resource.name}</p>
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 shrink-0 hidden sm:inline-flex">
                {resource.resource_type}
              </Badge>
              {resource.status !== 'active' && (
                <Badge className={`text-xs px-1.5 py-0 h-4 shrink-0 ${resourceStatusBadge[resource.status]}`}>
                  {resource.status}
                </Badge>
              )}
              {resource.requires_approval !== false && (
                <ApprovalBadge className="text-[10px] px-1.5 py-0 h-4 shrink-0" compact />
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
              <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 sm:hidden">
                {resource.resource_type}
              </Badge>
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
