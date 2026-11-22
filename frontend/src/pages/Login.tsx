import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';

import { LOGIN } from '../graphql/auth';
import logo from '../assets/logo.svg';

type LoginResponse = {
  login: {
    accessToken: string;
  };
};

type LoginVariables = {
  input: {
    mobile: string;
    password: string;
  };
};

export default function Login() {
  const navigate = useNavigate();

  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation<LoginResponse, LoginVariables>(
    LOGIN,
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!/^0\d{9}$/.test(mobile)) {
      setError('Mobile number must contain 10 digits and start with 0.');
      return;
    }

    if (password.length < 6 || !/[A-Z]/.test(password)) {
      setError(
        'Password must be at least 6 characters and contain one uppercase letter.',
      );
      return;
    }

    try {
      const result = await login({
        variables: {
          input: {
            mobile,
            password,
          },
        },
      });

      const token = result.data?.login.accessToken;

      if (!token) {
        setError('Login succeeded, but no access token was returned.');
        return;
      }

      sessionStorage.setItem('token', token);
      navigate('/team', { replace: true });
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : 'Unable to log in. Please try again.';

      setError(message);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-700 via-emerald-500 to-sky-700 p-6">
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src={logo}
            alt="Fantasy Predictor"
            className="mb-4 h-20 w-20 object-contain"
          />

          <h1 className="text-3xl font-bold text-slate-900">Welcome back</h1>

          <p className="mt-2 text-sm text-slate-500">
            Log in to see the best Premier League and Champions League fantasy
            teams for the next gameweek.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="mobile"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Mobile number
            </label>

            <input
              id="mobile"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={mobile}
              onChange={(event) => setMobile(event.target.value)}
              placeholder="0612345678"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600">
          Don&apos;t have an account?
          <Link
            to="/register"
            className="ml-2 font-semibold text-emerald-700 hover:underline"
          >
            Register
          </Link>
        </p>
      </section>
    </main>
  );
}