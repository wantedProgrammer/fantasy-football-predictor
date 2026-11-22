import type { ApolloError } from '@apollo/client';
import { Link } from 'react-router-dom';

export function Loading({ label }: { label: string }) {
  return (
    <div className="rounded-3xl border border-line bg-surface p-12 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
        <span className="absolute h-12 w-12 animate-ping rounded-full bg-accent/30" />
        <span className="relative h-8 w-8 animate-spin rounded-full border-4 border-white/15 border-t-accent" />
      </div>
      <p className="font-display text-xl font-bold uppercase italic tracking-wide text-white/85">
        {label}
      </p>
    </div>
  );
}

export function ErrorPanel({
  title,
  error,
  onRetry,
}: {
  title: string;
  error: ApolloError;
  onRetry?: () => void;
}) {
  const expired = /unauthori[sz]ed/i.test(error.message);

  return (
    <div className="rounded-3xl border border-[#ff1751]/40 bg-[#ff1751]/10 p-6">
      <p className="eyebrow text-[#ff6b8f]">Something went wrong</p>
      <h3 className="mt-1 font-display text-2xl font-extrabold uppercase italic">
        {expired ? 'Your session has expired' : title}
      </h3>
      <p className="mt-2 text-sm text-white/75">
        {expired ? 'Log in again to keep using the predictor.' : error.message}
      </p>
      <div className="mt-4 flex gap-3">
        {expired ? (
          <Link
            to="/login"
            onClick={() => sessionStorage.removeItem('token')}
            className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-white/90"
          >
            Log in
          </Link>
        ) : (
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-ink hover:bg-white/90"
            >
              Try again
            </button>
          )
        )}
      </div>
    </div>
  );
}
