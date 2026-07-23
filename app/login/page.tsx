'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-60"
      style={{ background: 'var(--accent)', color: 'var(--accent-ink)' }}
    >
      {pending ? 'A entrar…' : 'Entrar'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, {});
  return (
    <main
      className="paper-grain flex min-h-screen items-center justify-center px-6"
      style={{ background: 'var(--bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="mb-6 text-center">
          <div
            className="font-serif text-3xl font-semibold"
            style={{ color: 'var(--ink)' }}
          >
            Raízes
          </div>
          <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
            O arquivo da família
          </p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="password">
              Palavra-passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              className="field"
              placeholder="••••••••"
            />
          </div>
          {state?.error ? (
            <p className="text-sm" style={{ color: 'var(--danger)' }}>
              {state.error}
            </p>
          ) : null}
          <SubmitButton />
        </form>
      </div>
    </main>
  );
}
