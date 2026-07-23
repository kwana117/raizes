import { cookies } from 'next/headers';

const COOKIE = 'raizes_session';

function sessionToken(): string {
  return process.env.SESSION_TOKEN || 'dev-session-token-change-me';
}

export function isAuthed(): boolean {
  return cookies().get(COOKIE)?.value === sessionToken();
}

export function signIn(): void {
  cookies().set(COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
}

export function signOut(): void {
  cookies().delete(COOKIE);
}

export function checkPassword(pw: string): boolean {
  const expected = process.env.APP_PASSWORD || 'familia';
  return pw.length > 0 && pw === expected;
}
