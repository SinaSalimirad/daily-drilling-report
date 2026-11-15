import { adminClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

// better-auth client (docs/07): sign-in, sign-out and the current session. Web and API share
// one origin behind Nginx, so the client talks to `/api/auth` and the cookie is first-party.
const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;

export const authClient = createAuthClient({ baseURL: origin, plugins: [adminClient()] });
