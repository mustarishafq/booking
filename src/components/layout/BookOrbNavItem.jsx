import { CarFront, ShipWheel } from 'lucide-react';
import { cn } from '@/lib/utils';

const NERVE_NODES = [
  { angle: '0deg', delay: '0s' },
  { angle: '72deg', delay: '1.6s' },
  { angle: '144deg', delay: '3.2s' },
  { angle: '216deg', delay: '4.8s' },
  { angle: '288deg', delay: '6.4s' },
];

/**
 * Mobile-only raised Book orb (glass-dock hero FAB).
 * Mirrors AppsOrbNavItem from the portable glass-dock spec.
 */
export default function BookOrbNavItem({ active, onAction, label = 'Book', className }) {
  return (
    <button
      type="button"
      title="New Booking"
      aria-label="New Booking"
      aria-pressed={active}
      onClick={() => onAction?.()}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-end gap-2 px-1 pb-1 transition-colors',
        active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
        className
      )}
    >
      <span
        className={cn(
          'apps-orb-nav pointer-events-none relative -mt-6 flex h-12 w-12 items-center justify-center',
          active && 'apps-orb-nav--active'
        )}
        aria-hidden
      >
        <span className="apps-orb-nav__pulse" />
        <span className="apps-orb-nav__pulse apps-orb-nav__pulse--delayed" />

        <span className="apps-orb-nav__nerve">
          <span className="apps-orb-nav__nerve-track" />
          <span className="apps-orb-nav__nerve-impulse" />
          {NERVE_NODES.map(node => (
            <span
              key={node.angle}
              className="apps-orb-nav__nerve-node"
              style={{
                '--nerve-angle': node.angle,
                '--nerve-delay': node.delay,
              }}
            />
          ))}
        </span>

        <span className="apps-orb-nav__core">
          <span className="apps-orb-nav__icon apps-orb-nav__icon--monitor text-primary-foreground">
            <CarFront className="h-6 w-6" strokeWidth={2.25} />
          </span>
          <span className="apps-orb-nav__icon apps-orb-nav__icon--brain text-primary-foreground">
            <ShipWheel className="h-6 w-6" strokeWidth={2.25} />
          </span>
        </span>
      </span>

      <span className="mt-0.5 text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}
