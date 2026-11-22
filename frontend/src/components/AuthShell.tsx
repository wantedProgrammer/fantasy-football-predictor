import type { ReactNode } from 'react';

import logo from '../assets/logo.svg';
import { Shirt, Swoosh } from './Decor';

const SHOWCASE = [
  { name: 'Captain', team: 'LIV', points: '12.4', armband: true },
  { name: 'Differential', team: 'BHA', points: '7.8' },
  { name: 'Value pick', team: 'CRY', points: '6.1' },
];

/** Split-screen layout for the login and registration pages. */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-ink text-white lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative isolate hidden overflow-hidden bg-sweep p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-ink/70 via-ink/30 to-transparent" />
        <Swoosh className="-z-10" />

        <div className="flex items-center gap-3">
          <img src={logo} alt="" className="h-10 w-10" />
          <span className="font-display text-2xl font-extrabold uppercase italic tracking-wide">
            Fantasy<span className="text-accent">Predictor</span>
          </span>
        </div>

        <div>
          <h2 className="headline text-7xl xl:text-8xl">
            Pick smarter.
            <br />
            <span className="text-accent">Every</span> gameweek.
          </h2>
          <p className="mt-5 max-w-md text-base font-medium text-white/80">
            Projected points, the optimal 15-player squad and captaincy calls for Fantasy Premier
            League and Champions League Fantasy.
          </p>

          <div className="mt-10 flex gap-3">
            {SHOWCASE.map((card) => (
              <div
                key={card.name}
                className="flex w-32 flex-col items-center rounded-2xl border border-white/15 bg-ink/50 p-3 backdrop-blur"
              >
                <span className="relative">
                  {card.armband && (
                    <span className="absolute -right-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-300 font-display text-xs font-black text-black">
                      C
                    </span>
                  )}
                  <Shirt teamShort={card.team} size={48} />
                </span>
                <span className="eyebrow mt-2 text-white/70">{card.name}</span>
                <span className="stat text-3xl text-accent">{card.points}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs font-semibold text-white/60">
          Statistical estimates from official fantasy data. Team news and luck still matter.
        </p>
      </section>

      {/* Form panel */}
      <section className="relative flex items-center justify-center p-6 sm:p-10">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-sweep lg:hidden" />
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src={logo} alt="" className="h-9 w-9" />
            <span className="font-display text-xl font-extrabold uppercase italic tracking-wide">
              Fantasy<span className="text-accent">Predictor</span>
            </span>
          </div>
          <p className="eyebrow text-accent">{eyebrow}</p>
          <h1 className="headline mt-2 text-5xl sm:text-6xl">{title}</h1>
          <p className="mt-3 text-sm text-white/65">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="eyebrow mb-2 block text-white/60">
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-[#ff1751]/40 bg-[#ff1751]/10 px-4 py-3 text-sm font-semibold text-[#ff8fab]"
    >
      {message}
    </div>
  );
}

export const primaryButton =
  'w-full rounded-full bg-accent py-3.5 font-display text-xl font-extrabold uppercase italic tracking-wide text-on-accent shadow-[0_10px_30px_-10px_var(--accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60';
