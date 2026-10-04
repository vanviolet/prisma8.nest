export const user_role = {
  user: "USER",
  admin: "ADMIN",
} as const;

export type UserRole = (typeof user_role)[keyof typeof user_role];
