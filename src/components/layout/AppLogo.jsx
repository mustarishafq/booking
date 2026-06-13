import { cn } from '@/lib/utils';
import { APP_LOGO_PNG, APP_LOGO_SVG } from '@/lib/appConfig';

export default function AppLogo({ className, size = 'md', showText = false, textClassName }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <picture>
        <source srcSet={APP_LOGO_SVG} type="image/svg+xml" />
        <img
          src={APP_LOGO_PNG}
          alt="EMZI Nexus Booking"
          className={cn(sizes[size] || sizes.md, 'object-contain shrink-0')}
        />
      </picture>
      {showText && (
        <span className={cn('font-bold tracking-tight', textClassName)}>
          EMZI Nexus Booking
        </span>
      )}
    </div>
  );
}
