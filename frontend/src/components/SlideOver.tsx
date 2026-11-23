import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

const DURATION_MS = 380;

/**
 * Panel that slides in from the right on desktop and up from the bottom on
 * mobile. Closes on Escape, backdrop click or the close button.
 */
export default function SlideOver({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  if (open && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (open) {
      // Next frame so the transition runs from the off-screen position.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    // Closing: the panel slides out (shown is false), then unmounts.
    const timer = window.setTimeout(() => {
      setVisible(false);
      setMounted(false);
    }, DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [open]);

  const shown = open && visible;

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          shown ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      <div
        className={`absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-3xl border-t border-line bg-[#0f0f0f]/95 shadow-2xl backdrop-blur-xl transition-transform ease-[cubic-bezier(0.16,1,0.3,1)] sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[440px] sm:rounded-none sm:rounded-l-3xl sm:border-l sm:border-t-0 ${
          shown ? 'translate-x-0 translate-y-0' : 'translate-y-full sm:translate-x-full sm:translate-y-0'
        }`}
        style={{ transitionDuration: `${DURATION_MS}ms` }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-[#0f0f0f]/90 px-5 py-3.5 backdrop-blur">
          <span className="mx-auto h-1 w-10 rounded-full bg-white/15 sm:hidden" aria-hidden="true" />
          <p className="hidden text-xs font-medium uppercase tracking-[0.14em] text-muted sm:block">{title}</p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="absolute right-3 top-2.5 flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-white/10 hover:text-ink sm:static"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
