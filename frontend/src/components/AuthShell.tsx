import type { ReactNode } from 'react';

import { HeroBackdrop, RevealText } from './motion';
import { FooterNote, Logo } from './ui';

/** Centred card on an animated gradient, shared by the login and registration pages. */
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
    <main className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden bg-bg px-4 py-12 text-ink">
      <HeroBackdrop className="-z-10" position="62% 50%" focus="center" />

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="animate-fade-up inline-flex">
            <Logo />
          </div>
          <p className="mt-6 text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
            <RevealText text="Your best team, every gameweek." accentWords={['every', 'gameweek.']} delay={150} />
          </p>
        </div>

        <section className="glass animate-fade-up rounded-3xl p-6 sm:p-8" style={{ animationDelay: '300ms' }}>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-mint">{eyebrow}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </section>

        <div className="mt-8">
          <FooterNote />
        </div>
      </div>
    </main>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-xs font-medium text-muted">
      {children}
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
      {message}
    </div>
  );
}

export const primaryButton =
  'w-full rounded-full bg-accent py-3 text-sm font-semibold text-[#03140d] shadow-[0_10px_30px_-10px_rgb(33_227_138/0.7)] transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50';
