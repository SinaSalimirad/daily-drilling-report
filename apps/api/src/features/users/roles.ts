// Roles are ordered: every role can do everything the roles before it can.
// A permission check is always "at least <role>", never "exactly <role>".
export enum Role {
  Viewer = "viewer",
  Reporter = "reporter",
  Manager = "manager",
  Admin = "admin",
}

const roleRank: Record<Role, number> = {
  [Role.Viewer]: 0,
  [Role.Reporter]: 1,
  [Role.Manager]: 2,
  [Role.Admin]: 3,
};

export const hasRole = (userRole: Role, minimum: Role) => roleRank[userRole] >= roleRank[minimum];
