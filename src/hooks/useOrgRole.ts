import { useOrg } from "@/contexts/OrgContext";

export type MembershipRole = "owner" | "admin" | "manager" | "pilot" | "viewer";

const ROLE_RANK: Record<MembershipRole, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  pilot: 2,
  viewer: 1,
};

export function useOrgRole() {
  const { currentOrg } = useOrg();
  const role = (currentOrg?.role as MembershipRole) || "viewer";
  const rank = ROLE_RANK[role] ?? 0;

  return {
    role,
    /** owner or admin */
    isAdmin: rank >= 4,
    /** owner, admin, or manager */
    canManage: rank >= 3,
    /** owner, admin, manager, or pilot */
    canContribute: rank >= 2,
    /** read-only viewer */
    isViewer: rank <= 1,
  };
}
