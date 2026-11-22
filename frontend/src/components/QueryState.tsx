import type { ApolloError } from '@apollo/client';
import { Link } from 'react-router-dom';

export function Loading({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900 p-12 text-center">
      <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-emerald-400" />
      <p className="text-slate-300">{label}</p>
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
    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
      <h3 className="font-bold">{expired ? 'Your session has expired' : title}</h3>
      <p className="mt-2 text-sm">
        {expired
          ? 'Log in again to keep using the predictor.'
          : error.message}
      </p>
      <div className="mt-4 flex gap-3">
        {expired ? (
          <Link
            to="/login"
            onClick={() => sessionStorage.removeItem('token')}
            className="rounded-lg bg-red-400/20 px-3 py-2 text-sm font-semibold hover:bg-red-400/30"
          >
            Log in
          </Link>
        ) : (
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-lg bg-red-400/20 px-3 py-2 text-sm font-semibold hover:bg-red-400/30"
            >
              Try again
            </button>
          )
        )}
      </div>
    </div>
  );
}
