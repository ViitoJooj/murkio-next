# @murkio/next

Murkio identity for Next.js (app router). The client side is `@murkio/react`; the
server side is `@murkio/node`.

```sh
NEXT_PUBLIC_MURKIO_KEY=pk_...   # the only setting (MURKIO_PUBLISHABLE_KEY works on the server too)
```

```tsx
// app/layout.tsx
import { MurkioProvider } from '@murkio/next';
import { MurkioBootstrap } from '@murkio/next/server';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><MurkioBootstrap /></head>
      <body><MurkioProvider afterLogin="/dashboard">{children}</MurkioProvider></body>
    </html>
  );
}

// app/login/page.tsx
'use client';
import { MurkioIdentityCanvas } from '@murkio/next';
export default function Login() {
  return <MurkioIdentityCanvas />;
}

// app/dashboard/page.tsx (server component)
import { auth, currentUser } from '@murkio/next/server';
export default async function Dashboard() {
  const session = await auth();          // null when signed out
  const user = await currentUser();      // email, roles, 2FA
  return <p>Hello {user?.email}</p>;
}

// middleware.ts
import { murkioMiddleware } from '@murkio/next/server';
export default murkioMiddleware({ required: true, signInUrl: '/login' });
export const config = { matcher: ['/dashboard/:path*'] };
```

`murkioMiddleware` also refreshes an expired session cookie with a short handshake
page, so server components see the user right after the 15-minute access token
expires. See `@murkio/node` for the cookie, CSRF and revocation rules.

## Developing

This repository is a git submodule of the Murkio identity service
(`libs/external/next`) and is developed from there: the JavaScript packages share one
npm workspace, and the tests read the contract, the vectors and the fixtures every Murkio
SDK shares (`libs/spec`).

```sh
# in libs/ of the service repository, cloned with --recurse-submodules
npm ci
npm run build
npm test
```
