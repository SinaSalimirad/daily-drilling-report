import type { SessionResolver, SessionUser } from '../auth/session';

// Tests that are not about authentication sign in as this user: an admin may do everything.
export const admin: SessionUser = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Test admin',
  email: 'admin@example.test',
  role: 'admin',
};

export const asAdmin: SessionResolver = async () => admin;
