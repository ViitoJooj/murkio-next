import { MurkioProvider as ReactProvider, type MurkioProviderProps as ReactProviderProps } from '@murkio/react';
import { createElement } from 'react';

export {
  MurkioError,
  MurkioIdentityCanvas,
  MurkioIdentityEmailInput,
  MurkioIdentityError,
  MurkioIdentityKeepLogged,
  MurkioIdentityLoginButton,
  MurkioIdentityPasswordInput,
  MurkioIdentityRegisterButton,
  SignedIn,
  SignedOut,
  translate,
  useAuth,
  useMurkio,
  useUser,
} from '@murkio/react';
export type { AccessClaims, AuthState, ButtonProps, CanvasProps, InputProps, KeepLoggedProps, Me, UserState } from '@murkio/react';

export interface MurkioProviderProps extends Omit<ReactProviderProps, 'publishableKey' | 'apiUrl'> {
  /** Defaults to NEXT_PUBLIC_MURKIO_KEY. */
  publishableKey?: string;
  /** Defaults to NEXT_PUBLIC_MURKIO_API_URL. */
  apiUrl?: string;
}

/**
 * The React provider with the Next.js environment variables as defaults. The
 * NEXT_PUBLIC_* references stay literal in the build so Next inlines them in
 * the client bundle.
 */
export function MurkioProvider({ publishableKey, apiUrl, ...props }: MurkioProviderProps) {
  const key = publishableKey ?? process.env.NEXT_PUBLIC_MURKIO_KEY;
  if (!key) throw new Error('[murkio] set NEXT_PUBLIC_MURKIO_KEY or pass publishableKey to <MurkioProvider>.');
  return createElement(ReactProvider, { ...props, publishableKey: key, apiUrl: apiUrl ?? process.env.NEXT_PUBLIC_MURKIO_API_URL });
}
