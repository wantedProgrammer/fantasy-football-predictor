import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/** Headline that reveals word by word, each word going from blurred to sharp. */
export function RevealText({
  text,
  className = '',
  delay = 0,
  step = 70,
  accentWords = [],
}: {
  text: string;
  className?: string;
  /** Initial delay in ms. */
  delay?: number;
  /** Delay between words in ms. */
  step?: number;
  /** Words (exact match) to render in the accent gradient. */
  accentWords?: string[];
}) {
  const words = text.split(/\s+/).filter(Boolean);

  return (
    <span className={className} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden="true">
          <span
            className={`animate-word ${accentWords.includes(word) ? 'text-accent' : ''}`}
            style={{ animationDelay: `${delay + index * step}ms` }}
          >
            {word}
          </span>
          {index < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  );
}

/** Animates a number from 0 to `value` once, then follows changes. */
function useCountUp(value: number, duration = 1100): number {
  const reduce = prefersReducedMotion();
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) return;

    const from = fromRef.current;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = from + (value - from) * eased;
      fromRef.current = current;
      setDisplay(current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduce]);

  return reduce ? value : display;
}

export function CountUp({
  value,
  format = (current) => current.toFixed(1),
  className = '',
  duration,
}: {
  value: number;
  format?: (current: number) => string;
  className?: string;
  duration?: number;
}) {
  const current = useCountUp(value, duration);

  return (
    <span className={`num ${className}`}>
      {/* Screen readers get the final value, not every frame. */}
      <span aria-hidden="true">{format(current)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/** Card that tilts toward the pointer and glows under it. Pass extra classes for the surface. */
export function TiltCard({
  children,
  className = '',
  style,
  as: Tag = 'div',
  onClick,
  maxTilt = 5,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: 'div' | 'button' | 'article' | 'li';
  onClick?: () => void;
  maxTilt?: number;
  'aria-label'?: string;
  'aria-pressed'?: boolean;
}) {
  const ref = useRef<HTMLElement | null>(null);

  function handleMove(event: PointerEvent<HTMLElement>) {
    if (event.pointerType !== 'mouse' || prefersReducedMotion()) return;
    const element = event.currentTarget;
    const rect = element.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    element.style.setProperty('--rx', `${(0.5 - y) * maxTilt}deg`);
    element.style.setProperty('--ry', `${(x - 0.5) * maxTilt}deg`);
    element.style.setProperty('--mx', `${x * 100}%`);
    element.style.setProperty('--my', `${y * 100}%`);
  }

  function handleLeave(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty('--rx', '0deg');
    event.currentTarget.style.setProperty('--ry', '0deg');
  }

  return (
    <Tag
      ref={ref as never}
      className={`tilt ${className}`}
      style={style}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onClick={onClick}
      {...(Tag === 'button' ? { type: 'button' as const } : {})}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Slowly flowing green/teal glow, placed behind hero areas. */
export function GlowBackdrop({ className = '', intensity = 1 }: { className?: string; intensity?: number }) {
  return (
    <div aria-hidden="true" className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div
        className="absolute -left-[10%] -top-[40%] h-[140%] w-[60%] rounded-full blur-[90px]"
        style={{
          background: 'radial-gradient(circle, rgb(60 245 160 / 0.55), transparent 65%)',
          opacity: 0.32 * intensity,
          animation: 'flow-a 22s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute -right-[5%] -top-[30%] h-[130%] w-[55%] rounded-full blur-[100px]"
        style={{
          background: 'radial-gradient(circle, rgb(25 211 197 / 0.6), transparent 65%)',
          opacity: 0.26 * intensity,
          animation: 'flow-b 26s ease-in-out infinite alternate',
        }}
      />
      {/* Fine grid lines, like an analytics canvas */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(rgb(255 255 255 / 0.035) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / 0.035) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 50% 0%, black 30%, transparent 75%)',
        }}
      />
    </div>
  );
}

let sparkId = 0;

/** Animated line chart of recent values. Draws itself on mount. */
export function Sparkline({
  values,
  labels,
  width = 220,
  height = 56,
  className = '',
}: {
  values: number[];
  /** Optional label per value (e.g. "GW12"), used for the accessible description. */
  labels?: string[];
  width?: number;
  height?: number;
  className?: string;
}) {
  const [id] = useState(() => `spark-${(sparkId += 1)}`);

  if (values.length < 2) {
    return null;
  }

  const pad = 5;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const points = values.map((value, index) => [
    pad + (index / (values.length - 1)) * (width - pad * 2),
    pad + (1 - (value - min) / range) * (height - pad * 2),
  ]);
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
  const [lastX, lastY] = points[points.length - 1];
  const description = values
    .map((value, index) => `${labels?.[index] ?? `#${index + 1}`}: ${value}`)
    .join(', ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`h-auto w-full overflow-visible ${className}`}
      role="img"
      aria-label={`Points by gameweek. ${description}`}
    >
      <defs>
        <linearGradient id={`${id}-stroke`} x1="0" x2="1">
          <stop offset="0" stopColor="#3cf5a0" />
          <stop offset="1" stopColor="#19d3c5" />
        </linearGradient>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3cf5a0" stopOpacity="0.25" />
          <stop offset="1" stopColor="#3cf5a0" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id}-fill)`} className="animate-fade-up" style={{ animationDelay: '0.5s' }} />
      <path
        d={line}
        pathLength={1}
        fill="none"
        stroke={`url(#${id}-stroke)`}
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-draw"
      />
      <circle cx={lastX} cy={lastY} r="6" fill="#19d3c5" opacity="0.3" className="animate-pulse-dot" />
      <circle cx={lastX} cy={lastY} r="3" fill="#19d3c5" />
    </svg>
  );
}
