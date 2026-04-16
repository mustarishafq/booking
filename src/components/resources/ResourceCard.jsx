import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Tag, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const pricingLabel = { hourly: '/hr', daily: '/day', flat: ' flat' };

const statusColors = {
  active: '',
  maintenance: 'bg-amber-500/10 text-amber-600',
  inactive: 'bg-red-500/10 text-red-500',
};

export default function ResourceCard({ resource, onEdit, isAdmin, isInternal }) {
  return (
    <Card className="overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className="aspect-video bg-muted relative overflow-hidden">
        {resource.image_url ? (
          <img
            src={resource.image_url}
            alt={resource.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
            <Tag className="w-10 h-10 text-muted-foreground/30" />
          </div>
        )}
        <Badge className="absolute top-3 left-3 bg-primary/90 text-primary-foreground">
          {resource.resource_type}
        </Badge>
        {resource.status !== 'active' && (
          <Badge className={`absolute top-3 right-3 ${statusColors[resource.status]}`}>
            {resource.status}
          </Badge>
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
          {resource.capacity > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              <span>{resource.capacity}</span>
            </div>
          )}
          <div className="flex items-center gap-1 font-medium text-foreground">
            {isInternal ? (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                <Building2 className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span>RM{resource.rate}{pricingLabel[resource.pricing_model]}</span>
            )}
          </div>
          {resource.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              <span>{resource.location}</span>
            </div>
          )}
        </div>

        {resource.amenities?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {resource.amenities.slice(0, 3).map(a => (
              <Badge key={a} variant="secondary" className="text-xs font-normal">{a}</Badge>
            ))}
            {resource.amenities.length > 3 && (
              <Badge variant="secondary" className="text-xs font-normal">+{resource.amenities.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-1">
          {resource.status === 'active' && (
            <Link to={`/book?resource=${resource.id}`} className="flex-1">
              <Button className="w-full" size="sm">Book Now</Button>
            </Link>
          )}
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
          )}
        </div>
      </div>
    </Card>
  );
}