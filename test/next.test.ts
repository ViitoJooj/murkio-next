import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { isValidElement, type ReactElement } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';
import { fnv1a32 } from '@murkio/node';
import { MurkioProvider } from '../src/index';
import { authFromHeaders, configureMurkio, MurkioBootstrap, murkioMiddleware } from '../src/server';

const PK = 'pk_next_test';
let privateKey: CryptoKey;
let jwk: Record<string, unknown>;

const bootstrap = {
  application_id: 'app-1',
  issuer: 'enterprise-auth',
  jwks_url: '/v1/applications/app-1/jwks.json',
  config: { methods: { password: true }, mfa: { mode: 'off' }, oauth_providers: [], signup: { login_on_verify: true } },
  canvas: { version: 2, document: { schema: 1, note: '</script>' } },
};

const fakeFetch = (async (input: RequestInfo | URL) => {
  const path = new URL(String(input)).pathname;
  const body = path === '/v1/client' ? { data: bootstrap } : path.endsWith('jwks.json') ? { keys: [jwk] } : { error: 'nope' };
  return new Response(JSON.stringify(body), { status: path === '/v1/client' || path.endsWith('jwks.json') ? 200 : 404 });
}) as typeof fetch;

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
  privateKey = pair.privateKey as CryptoKey;
  jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'EdDSA' };
  configureMurkio({ publishableKey: PK, apiUrl: 'https://api.example.com', fetch: fakeFetch });
});

const token = () =>
  new SignJWT({ sid: 's1', aid: 'app-1', roles: ['user'] })
    .setProtectedHeader({ alg: 'EdDSA', kid: 'k1' })
    .setSubject('user-1')
    .setIssuer('enterprise-auth')
    .setAudience('app-1')
    .setExpirationTime('15m')
    .sign(privateKey);

describe('server', () => {
  it('reads the session from the request headers', async () => {
    const headers = new Headers({ host: 'app.example.com', cookie: `__Host-murkio_session_${fnv1a32(PK)}=${await token()}` });
    const result = await authFromHeaders(headers);
    expect(result.session?.userId).toBe('user-1');
    expect((await authFromHeaders(new Headers({ host: 'app.example.com' }))).session).toBeNull();
  });

  it('protects routes in the middleware', async () => {
    const middleware = murkioMiddleware({ required: true, signInUrl: '/login' });
    const page = await middleware(new Request('https://app.example.com/dashboard', { headers: { accept: 'text/html' } }));
    expect(page?.status).toBe(302);
    expect(page?.headers.get('Location')).toBe('https://app.example.com/login?redirect=%2Fdashboard');

    const api = await middleware(new Request('https://app.example.com/api/me'));
    expect(api?.status).toBe(401);

    const allowed = await middleware(new Request('https://app.example.com/api/me', { headers: { Authorization: `Bearer ${await token()}` } }));
    expect(allowed).toBeUndefined();
  });

  it('inlines the bootstrap safely', async () => {
    const element = (await MurkioBootstrap()) as ReactElement<{ id: string; dangerouslySetInnerHTML: { __html: string } }>;
    expect(isValidElement(element)).toBe(true);
    expect(element.props.id).toBe('murkio-bootstrap');
    expect(element.props.dangerouslySetInnerHTML.__html).not.toContain('</script>');
    expect(JSON.parse(element.props.dangerouslySetInnerHTML.__html).canvas.version).toBe(2);
  });
});

describe('client provider', () => {
  it('takes the key from NEXT_PUBLIC_MURKIO_KEY', () => {
    process.env.NEXT_PUBLIC_MURKIO_KEY = 'pk_from_env';
    const element = MurkioProvider({}) as ReactElement<{ publishableKey: string }>;
    expect(element.props.publishableKey).toBe('pk_from_env');
    delete process.env.NEXT_PUBLIC_MURKIO_KEY;
    expect(() => MurkioProvider({})).toThrow(/NEXT_PUBLIC_MURKIO_KEY/);
  });
});
