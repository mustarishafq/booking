import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dragPreviewStyle,
  dragPreviewStyleVertical,
  slotFromHorizontalDrag,
  slotFromVerticalDrag,
  slotFromClickHorizontal,
  slotFromClickVertical,
  TIMELINE_START_HOUR,
  TIMELINE_END_HOUR,
} from '@/lib/calendarUtils';

export function useHorizontalTimelineDrag({ enabled, onSlotCreate }) {
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;

  const cancel = useCallback(() => setDrag(null), []);

  const onPointerDown = useCallback((e, { date, resourceId }) => {
    if (!enabled || e.button !== 0) return;
    if (e.target.closest('[data-booking-block]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const next = { axis: 'horizontal', anchorPct: pct, currentPct: pct, date, resourceId, rect };
    setDrag(next);

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const x = Math.max(0, Math.min(ev.clientX - d.rect.left, d.rect.width));
      setDrag(prev => prev ? { ...prev, currentPct: x / d.rect.width } : null);
    };

    const onUp = (ev) => {
      const d = dragRef.current;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      if (!d) return;
      setDrag(null);

      const moved = Math.abs(d.currentPct - d.anchorPct) > 0.01;
      const slot = moved
        ? slotFromHorizontalDrag(d.date, d.resourceId, d.anchorPct, d.currentPct, TIMELINE_START_HOUR, TIMELINE_END_HOUR)
        : slotFromClickHorizontal(d.date, d.resourceId, d.anchorPct, TIMELINE_START_HOUR, TIMELINE_END_HOUR);

      onSlotCreate?.(slot);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  }, [enabled, onSlotCreate]);

  useEffect(() => () => setDrag(null), []);

  const previewStyle = drag
    ? dragPreviewStyle(drag.anchorPct, drag.currentPct)
    : null;

  return { drag, previewStyle, onPointerDown, cancel };
}

export function useVerticalTimelineDrag({ enabled, onSlotCreate }) {
  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);
  dragRef.current = drag;

  const cancel = useCallback(() => setDrag(null), []);

  const onPointerDown = useCallback((e, { day }) => {
    if (!enabled || e.button !== 0) return;
    if (e.target.closest('[data-booking-block]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientY - rect.top) / rect.height;
    const next = { axis: 'vertical', anchorPct: pct, currentPct: pct, day, rect };
    setDrag(next);

    const onMove = (ev) => {
      const d = dragRef.current;
      if (!d) return;
      const y = Math.max(0, Math.min(ev.clientY - d.rect.top, d.rect.height));
      setDrag(prev => prev ? { ...prev, currentPct: y / d.rect.height } : null);
    };

    const onUp = () => {
      const d = dragRef.current;
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      if (!d) return;
      setDrag(null);

      const moved = Math.abs(d.currentPct - d.anchorPct) > 0.01;
      const slot = moved
        ? slotFromVerticalDrag(d.day, d.anchorPct, d.currentPct, TIMELINE_START_HOUR, TIMELINE_END_HOUR)
        : slotFromClickVertical(d.day, d.anchorPct, TIMELINE_START_HOUR, TIMELINE_END_HOUR);

      onSlotCreate?.(slot);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    e.preventDefault();
  }, [enabled, onSlotCreate]);

  useEffect(() => () => setDrag(null), []);

  const previewStyle = drag
    ? dragPreviewStyleVertical(drag.anchorPct, drag.currentPct)
    : null;

  return { drag, previewStyle, onPointerDown, cancel };
}
