import { useId } from 'react';
import type { ReactNode } from 'react';

import { POSITION_STYLES, kitColours } from '../lib/format';
import type { Position } from '../lib/format';

/** Club short code in a chip tinted with the club's colour. No logos. */
export function TeamChip({ code, size = 'sm' }: { code: string; size?: 'xs' | 'sm' | 'md' }) {
  const { shirt } = kitColours(code);
  const sizes = {
    xs: 'px-1.5 py-px text-[10px]',
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md font-mono font-semibold tracking-wide text-ink ${sizes[size]}`}
      style={{
        backgroundColor: `color-mix(in srgb, ${shirt} 24%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${shirt} 45%, transparent)`,
      }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: shirt }} />
      {code}
    </span>
  );
}

export function PositionTag({ position }: { position: Position }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-md px-1.5 py-px font-mono text-[10px] font-semibold ${POSITION_STYLES[position]}`}
    >
      {position}
    </span>
  );
}

/** Glass panel with a title row. */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`glass rounded-2xl p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Pill-shaped segmented control. */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  label,
  size = 'md',
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full border border-line bg-white/[0.03] p-1">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.hint}
            onClick={() => onChange(option.value)}
            className={`whitespace-nowrap rounded-full font-medium transition-all duration-300 ${
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
            } ${
              active
                ? 'bg-accent text-[#04130c] shadow-[0_0_20px_-4px_rgb(60_245_160/0.6)]'
                : 'text-muted hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Horizontal percentage bar: accent for healthy values, warm for warnings. */
export function MeterBar({
  value,
  tone = value >= 0.75 ? 'good' : 'warn',
  className = '',
  delay = 0,
}: {
  /** 0-1 */
  value: number;
  tone?: 'good' | 'warn' | 'neutral';
  className?: string;
  delay?: number;
}) {
  const fill =
    tone === 'good' ? 'bg-accent' : tone === 'warn' ? 'bg-warn' : 'bg-white/40';

  return (
    <div className={`h-1.5 overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
      <div
        className={`animate-grow h-full rounded-full ${fill}`}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function EmptyState({
  title,
  body,
  action,
  icon = 'search',
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: 'search' | 'star' | 'check';
}) {
  const paths = {
    search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
    star: <path d="M12 4l2.5 5.2 5.5.8-4 3.9.9 5.6L12 16.9 7.1 19.5l.9-5.6-4-3.9 5.5-.8z" />,
    check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  };

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.05] text-muted">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          {paths[icon]}
        </svg>
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      {body && <p className="mt-1 max-w-sm text-xs text-muted">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Logo({ withWordmark = true }: { withWordmark?: boolean }) {
  // Unique per instance: a gradient defined in a hidden copy can't be referenced.
  const gradientId = `logo-${useId().replace(/:/g, '')}`;

  return (
    <span className="flex items-center gap-2.5">
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#3cf5a0" />
            <stop offset="1" stopColor="#19d3c5" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width="31" height="31" rx="9" fill="#111" stroke="rgb(255 255 255 / 0.12)" />
        <rect x="8" y="17" width="4" height="7" rx="1.5" fill={`url(#${gradientId})`} opacity="0.55" />
        <rect x="14" y="12" width="4" height="12" rx="1.5" fill={`url(#${gradientId})`} opacity="0.8" />
        <rect x="20" y="7" width="4" height="17" rx="1.5" fill={`url(#${gradientId})`} />
      </svg>
      {withWordmark && (
        <span className="text-[15px] font-semibold tracking-tight">
          Fantasy<span className="text-muted">Predictor</span>
        </span>
      )}
    </span>
  );
}

export function FooterNote() {
  return (
    <p className="text-center text-xs text-faint">
      Projections are statistical estimates, not guarantees.
    </p>
  );
}

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-[#04130c] shadow-[0_8px_30px_-8px_rgb(60_245_160/0.6)] transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';

export const buttonGhost =
  'inline-flex items-center justify-center gap-2 rounded-full border border-line bg-white/[0.03] px-4 py-2 text-sm font-medium text-ink transition hover:border-white/20 hover:bg-white/[0.06] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50';
