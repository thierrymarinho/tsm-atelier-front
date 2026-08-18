import type { Role, UserResponseDTO } from "@/lib/types/api";

type WithRole = Pick<UserResponseDTO, "role"> | null | undefined;

export const ADMIN_ROLES: readonly Role[] = ["ADMIN", "ADMIN_VIEWER"];

export function canOpenAdmin(user: WithRole): boolean {
  return !!user && ADMIN_ROLES.includes(user.role);
}

export function canWrite(user: WithRole): boolean {
  return user?.role === "ADMIN";
}

export function canSeeOrders(user: WithRole): boolean {
  return user?.role === "ADMIN";
}
