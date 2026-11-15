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

// --- roles (docs/07) -------------------------------------------------------------------

export const ROLES = ['admin', 'coordinator', 'engineer', 'client'] as const;
export type Role = (typeof ROLES)[number];

const ALL = [...PERMISSIONS] as Permission[];

/**
 * Role → permissions (docs/07 matrix). "Own wells" limits are not part of the map: they
 * come from `well_members` and are checked where the well of the record is known.
 */
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  admin: ALL,
  coordinator: [
    'project:manage',
    'well:manage',
    'well:assign',
    'master:manage',
    'price:manage',
    'report:read',
    'report:edit_submitted',
    'recap:read',
    'cost:read',
    'audit:read',
  ],
  engineer: [
    'master:manage',
    'report:read',
    'report:write',
    'report:submit',
    'report:edit_submitted',
    'report:delete',
    'recap:read',
    'cost:read',
  ],
  client: ['report:read', 'recap:read', 'cost:read'],
};

export const isRole = (value: unknown): value is Role =>
  typeof value === 'string' && (ROLES as readonly string[]).includes(value);

/** True when the role has the permission. */
export const can = (role: Role, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(permission);
