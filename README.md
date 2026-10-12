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

```sh
npm ci     # also builds the package (the `prepare` script)
npm test
```

`@murkio/node` and `@murkio/react` are not on the npm registry yet, so `package.json` takes them from their
repositories at a pinned commit, built on install; `.npmrc` allows that (npm 12 refuses git
dependencies by default) and `npm publish` refuses to run until the dependency is a plain
version. The tests run against that build, the same code an application gets.

The checks in `infra/pipeline/` are kept in the Murkio identity service and synced from
there, so they are not edited here.

Every pull request runs the workflows in `.github/workflows`. The same checks, locally:

| Workflow | What it runs |
| --- | --- |
| Build | `npm run build`, `npm run package:check` (publint) and `npm pack --dry-run`, on Node.js 20 and 24 |
| Format | `npm run format:check` (Biome; `npm run format` fixes) |
| Lint | `npm run lint` (Biome), `npm run typecheck` (strict TypeScript) |
| Tests | `npm test` on Node.js 20 and 24 |
| Quality & Governance Checks | `for check in infra/pipeline/*.py; do python3 "$check"; done` |
| Security | `npm audit --omit=dev`, `npm audit --audit-level=high`, `npm audit signatures`, `gitleaks git .`, `zizmor --pedantic .` |
| CodeQL, Dependency Review | run by GitHub on the pull request |

Security reports: see [SECURITY.md](SECURITY.md).
