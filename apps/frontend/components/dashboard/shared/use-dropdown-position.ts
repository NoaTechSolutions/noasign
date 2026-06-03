'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';

/**
 * Positions a row-action dropdown with `position: fixed` (computed from the
 * trigger's viewport rect) so it escapes the table's `overflow` clipping.
 * Opens upward when there isn't enough room below. Closes on outside click,
 * scroll, or resize.
 *
 * Usage: put `triggerRef` on the trigger <button>, and on the dropdown <div>
 * put `ref={menuRef}`, `style={style}`, and `onClick={close}` (so clicking any
 * item closes the menu after its handler runs).
 */
export function useDropdownPosition(estimatedHeight = 220) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    setOpen((prev) => {
      if (prev) return false;
      const el = triggerRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const right = Math.max(8, window.innerWidth - rect.right);
        const spaceBelow = window.innerHeight - rect.bottom;
        if (spaceBelow < estimatedHeight) {
          setStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 4, right, top: 'auto', zIndex: 1000 });
        } else {
          setStyle({ position: 'fixed', top: rect.bottom + 4, right, bottom: 'auto', zIndex: 1000 });
        }
      }
      return true;
    });
  }, [estimatedHeight]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (menuRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Scroll closes the menu UNLESS the scroll happened inside the menu
    // itself (e.g., a tall bottom-sheet body scrolling its own content).
    const onScroll = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  return { open, toggle, close, style, triggerRef, menuRef };
}
