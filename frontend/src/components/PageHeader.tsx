import type { ReactNode } from 'react';

import { HeroBackdrop, RevealText } from './motion';

/** Hero area at the top of each page: flowing glow, word-by-word headline. */
export default function PageHeader({
  eyebrow,
  title,
  accentWords,
  description,
  aside,
}: {
  eyebrow?: string;
  title: string;
  /** Words in the title to render in the accent gradient. */
  accentWords?: string[];
  description?: string;
  aside?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <HeroBackdrop className="-z-10" />
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow && (
            <p className="animate-fade-up flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-mint shadow-[0_0_8px_rgb(33_227_138)]" />
              {eyebrow}
            </p>
          )}
          <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl">
            <RevealText text={title} accentWords={accentWords} delay={80} />
          </h1>
          {description && (
            <p className="animate-fade-up mt-3 max-w-xl text-sm text-muted sm:text-base" style={{ animationDelay: '350ms' }}>
              {description}
            </p>
          )}
        </div>
        {aside && (
          <div className="animate-fade-up w-full lg:w-auto" style={{ animationDelay: '250ms' }}>
            {aside}
          </div>
        )}
      </div>
    </section>
  );
}
