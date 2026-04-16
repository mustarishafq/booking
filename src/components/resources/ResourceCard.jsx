import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Tag, Building2, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';

const pricingLabel = { hourly: '/hr', daily: '/day', flat: ' flat' };

const statusColors = {
  active: '',
  maintenance: 'bg-amber-500/10 text-amber-600 border-amber-200',
  inactive: 'bg-red-500/10 text-red-500 border-red-200',
};

function PriceDisplay({ isInternal, resource }) {
  if (isInternal) {
    return (
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
        <Building2 className="w-3.5 h-3.5" />
      </span>
    );
  }
  return <span className="font-semibold text-foreground">RM{resource.rate}{pricingLabel[resource.pricing_model]}</span>;
}

export default function ResourceCard({ resource, onEdit, isAdmin, isInternal, view = 'grid' }) {
  const bookLink = `/book?resource=${resource.id}`;
  const isActive = resource.status === 'active';

  /* ── GRID view ── */
  if (view === 'grid') {
    return (
      <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="aspect-video bg-muted relative overflow-hidden">
          {resource.image_url ? (
            <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
              <Tag className="w-10 h-10 text-muted-foreground/30" />
            </div>
          )}
          <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground">{resource.resource_type}</Badge>
          {resource.status !== 'active' && (
            <Badge className={`absolute top-3 right-3 ${statusColors[resource.status]}`}>{resource.status}</Badge>
          )}
        </div>
        <div className="p-4 space-y-3">
          <div>
            <h3 className="font-semibold text-base">{resource.name}</h3>
            <p className={`text-sm mt-0.5 line-clamp-2 ${resource.description ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
              {resource.description || 'No description provided'}
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {resource.capacity > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{resource.capacity}</span>}
            <PriceDisplay isInternal={isInternal} resource={resource} />
            {resource.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{resource.location}</span>}
          </div>
          {resource.amenities?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.amenities.slice(0, 3).map(a => <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>)}
              {resource.amenities.length > 3 && <Badge variant="secondary" className="text-xs font-normal">+{resource.amenities.length - 3}</Badge>}
            </div>
          )}
          <div className="flex gap-2 mt-1">
            {isActive && <Link to={bookLink} className="flex-1"><Button className="w-full" size="sm">Book Now</Button></Link>}
            {isAdmin && <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>}
          </div>
        </div>
      </Card>
    );
  }

  /* ── LIST view ── */
  if (view === 'list') {
    return (
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <div className="flex gap-0">
          <div className="w-40 sm:w-52 flex-shrink-0 relative overflow-hidden">
            {resource.image_url ? (
              <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full min-h-[120px] flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                <Tag className="w-8 h-8 text-muted-foreground/30" />
              </div>
            )}
            <Badge className="absolute top-2 left-2 text-xs bg-primary/90 text-primary-foreground">{resource.resource_type}</Badge>
          </div>
          <div className="flex-1 p-4 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold text-base leading-tight">{resource.name}</h3>
                  {resource.location && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{resource.location}</p>}
                </div>
                {resource.status !== 'active' && (
                  <Badge className={`text-xs ${statusColors[resource.status]}`}>{resource.status}</Badge>
                )}
              </div>
              <p className={`text-sm mt-1.5 line-clamp-2 ${resource.description ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
                {resource.description || 'No description provided'}
              </p>
            </div>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                {resource.capacity > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{resource.capacity} pax</span>}
                <PriceDisplay isInternal={isInternal} resource={resource} />
                {resource.amenities?.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {resource.amenities.slice(0, 4).map(a => <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>)}
                    {resource.amenities.length > 4 && <Badge variant="secondary" className="text-xs font-normal">+{resource.amenities.length - 4}</Badge>}
                  </div>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {isActive && <Link to={bookLink}><Button size="sm">Book Now</Button></Link>}
                {isAdmin && <Button variant="outline" size="sm" onClick={onEdit}><Pencil className="w-3.5 h-3.5 mr-1" />Edit</Button>}
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  /* ── COMPACT view ── */
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-card hover:bg-muted/40 transition-colors">
      <div className="w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden bg-muted">
        {resource.image_url ? (
          <img src={resource.image_url} alt={resource.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Tag className="w-4 h-4 text-muted-foreground/40" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{resource.name}</p>
          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4">{resource.resource_type}</Badge>
          {resource.status !== 'active' && <Badge className={`text-xs px-1.5 py-0 h-4 ${statusColors[resource.status]}`}>{resource.status}</Badge>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          {resource.capacity > 0 && <span className="flex items-center gap-1"><Users className="w-3 h-3" />{resource.capacity}</span>}
          {resource.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{resource.location}</span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <PriceDisplay isInternal={isInternal} resource={resource} />
        {isActive && <Link to={bookLink}><Button size="sm" className="h-7 text-xs px-3">Book</Button></Link>}
        {isAdmin && <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>}
      </div>
    </div>
  );
}