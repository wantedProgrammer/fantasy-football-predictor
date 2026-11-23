import type { ApolloError } from '@apollo/client';

import { buttonGhost } from './ui';

export function ErrorPanel({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: ApolloError;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="glass flex flex-col items-start gap-4 rounded-2xl border-warn/30 p-6 sm:flex-row sm:items-center">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-warn/15 text-warn">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 8v5M12 16.5v.5" />
          <path d="M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
      </span>
      <div className="flex-1">
        <h3 className="font-semibold">{title}</h3>
        <p className="mt-0.5 text-sm text-muted">{error.message}</p>
      </div>
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonGhost}>
          Try again
        </button>
      )}
    </div>
  );
}
