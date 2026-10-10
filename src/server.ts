import { createMurkio, safeJson, type AuthResult, type Murkio, type MurkioServerOptions, type ProtectOptions, type Session } from '@murkio/node';
import { createElement } from 'react';

let server: Murkio | null = null;

/**
 * The server-side client, created once per process from MURKIO_PUBLISHABLE_KEY
 * (or NEXT_PUBLIC_MURKIO_KEY) and MURKIO_API_URL (or NEXT_PUBLIC_MURKIO_API_URL).
 */
export function getMurkio(): Murkio {
  server ??= createMurkio({
    publishableKey: process.env.MURKIO_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_MURKIO_KEY,
    apiUrl: process.env.MURKIO_API_URL ?? process.env.NEXT_PUBLIC_MURKIO_API_URL,
  });
  return server;
}

/** Creates the server-side client with explicit options (custom servers, tests) instead of the environment. */
export function configureMurkio(options: MurkioServerOptions): Murkio {
  server = createMurkio(options);
  return server;
}

/**
 * The session of a request, from its headers. Server components and route
 * handlers use `auth()`, which reads them from next/headers; this one takes
 * them directly (tests, custom servers).
 */
export async function authFromHeaders(headers: Headers, options: { loadUser?: boolean; checkRevocation?: boolean } = {}): Promise<AuthResult> {
  const host = headers.get('x-forwarded-host') ?? headers.get('host') ?? 'localhost';
  const protocol = headers.get('x-forwarded-proto') ?? (host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https');
  return getMurkio().authenticate(new Request(`${protocol}://${host}/`, { headers }), options);
}

/** The session of the current request in a server component or route handler, or null. */
export async function auth(options: { checkRevocation?: boolean } = {}): Promise<Session | null> {
  const { headers } = await import('next/headers');
  return (await authFromHeaders(new Headers(await headers()), options)).session;
}

/** The signed-in user's profile (POST /v1/me, cached a minute per session), or null. */
export async function currentUser() {
  const { headers } = await import('next/headers');
  return (await authFromHeaders(new Headers(await headers()), { loadUser: true })).user;
}

/**
 * Middleware for middleware.ts. It refreshes an expired session cookie with a
 * short handshake page, and with `required` answers 401 (or redirects pages to
 * `signInUrl`) when nobody is signed in:
 *
 *   export default murkioMiddleware({ required: true, signInUrl: '/login' });
 *   export const config = { matcher: ['/dashboard/:path*'] };
 */
export function murkioMiddleware(options: ProtectOptions = {}) {
  return async (request: Request): Promise<Response | undefined> => {
    const { response } = await getMurkio().protect(request, options);
    return response ?? undefined;
  };
}

/**
 * Inlines the bootstrap (application, config and canvas) in the page, so the
 * canvas draws without waiting for the API. Put it in the root layout's <head>.
 * On a statically generated page the browser ignores it after two minutes and
 * asks the API, so a published canvas never stays frozen in a build.
 */
export async function MurkioBootstrap() {
  const bootstrap = await getMurkio().bootstrap();
  return createElement('script', {
    type: 'application/json',
    id: 'murkio-bootstrap',
    'data-generated-at': String(Date.now()),
    dangerouslySetInnerHTML: { __html: safeJson(bootstrap) },
  });
}

export type { AuthResult, ProtectOptions, Session };
