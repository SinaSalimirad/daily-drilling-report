// Permission names (docs/07-authentication-and-authorization.md). Routes ask for a
// permission, never for a role. The role → permission map is added in v0.9.0.

export const PERMISSIONS = [
  'user:manage',
  'project:manage',
  'well:manage',
  'well:assign',
  'master:manage',
  'price:manage',
  'report:read',
  'report:write',
  'report:submit',
  'report:edit_submitted',
  'report:delete',
  'recap:read',
  'cost:read',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
