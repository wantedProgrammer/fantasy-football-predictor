import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@apollo/client';

import { LOGIN } from '../graphql/auth';
import AuthShell, { FieldLabel, FormError, primaryButton } from '../components/AuthShell';

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
    <AuthShell
      eyebrow="Welcome back, manager"
      title="Log in"
      subtitle="See the best Premier League and Champions League fantasy teams for the next gameweek."
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <FieldLabel htmlFor="mobile">Mobile number</FieldLabel>
          <input
            id="mobile"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
            placeholder="0612345678"
            className="field py-3.5"
          />
        </div>

        <div>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            className="field py-3.5"
          />
        </div>

        {error && <FormError message={error} />}

        <button type="submit" disabled={loading} className={primaryButton}>
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-white/60">
        New here?
        <Link to="/register" className="ml-2 font-extrabold text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
