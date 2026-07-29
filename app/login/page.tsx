'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { login } from '../actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn btn-primary w-full py-2.5">
      {pending ? 'A entrar…' : 'Entrar'}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(login, {});
  return (
    <main className="paper-plate flex min-h-screen items-center justify-center px-6">
      <div className="panel anim-fade-up w-full max-w-sm p-9">
        <div className="mb-7 text-center">
          <div className="mb-2 text-xl" style={{ color: 'var(--accent)' }} aria-hidden>
            ❦
          </div>
          <h1 className="font-serif text-[32px] font-semibold leading-none" style={{ color: 'var(--ink)' }}>
            Raízes
          </h1>
          <p
            className="mt-2 text-[10px] uppercase tracking-[0.16em]"
            style={{ color: 'var(--faint)' }}
          >
            arquivo da família
          </p>
        </div>
        <form action={formAction} className="space-y-4">
          <div>
            <label className="label mb-1" htmlFor="password">
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
