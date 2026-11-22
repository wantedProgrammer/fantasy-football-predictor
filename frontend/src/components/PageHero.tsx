import type { ReactNode } from 'react';

import { Swoosh } from './Decor';

type PageHeroProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  /** Optional background photo, faded into the theme gradient. */
  image?: string;
  /** Controls shown on the right (gameweek picker, etc.). */
  actions?: ReactNode;
};

/** Full-width gradient band at the top of each page. */
export default function PageHero({ eyebrow, title, description, image, actions }: PageHeroProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line bg-sweep">
      {image && (
        <img
          src={image}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-35 mix-blend-luminosity"
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/85 via-ink/40 to-transparent" />
      <Swoosh className="-z-10 opacity-80" />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 pb-8 pt-8 sm:px-6 sm:pt-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          {eyebrow && <p className="eyebrow text-white/80">{eyebrow}</p>}
          <h1 className="headline mt-2 text-5xl sm:text-7xl">{title}</h1>
          {description && (
            <p className="mt-3 max-w-xl text-sm font-medium text-white/80 sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="w-full lg:w-auto">{actions}</div>}
      </div>
    </section>
  );
}
