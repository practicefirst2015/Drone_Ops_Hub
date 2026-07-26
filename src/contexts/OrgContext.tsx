import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  loading: boolean;
  createOrganization: (name: string, slug: string) => Promise<string | null>;
}

const OrgContext = createContext<OrgContextType>({
  organizations: [],
  currentOrg: null,
  setCurrentOrg: () => {},
  loading: true,
  createOrganization: async () => null,
});

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    const fetchOrgs = async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("role, organization_id, organizations(id, name, slug)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching orgs:", error);
        setLoading(false);
        return;
      }

      const orgs: Organization[] = (data || []).map((m: any) => ({
        id: m.organizations.id,
        name: m.organizations.name,
        slug: m.organizations.slug,
        role: m.role,
      }));

      setOrganizations(orgs);

      // Restore last selected org or pick first
      const savedOrgId = localStorage.getItem("currentOrgId");
      const saved = orgs.find((o) => o.id === savedOrgId);
      setCurrentOrg(saved || orgs[0] || null);
      setLoading(false);
    };

    fetchOrgs();
  }, [user]);

  const handleSetCurrentOrg = (org: Organization) => {
    setCurrentOrg(org);
    localStorage.setItem("currentOrgId", org.id);
  };

  const createOrganization = async (name: string, slug: string): Promise<string | null> => {
    const { data, error } = await supabase.rpc("create_organization", {
      _name: name,
      _slug: slug,
    });

    if (error) {
      console.error("Error creating org:", error);
      return null;
    }

    const orgId = data as string;
    const newOrg: Organization = { id: orgId, name, slug, role: "owner" };
    setOrganizations((prev) => [...prev, newOrg]);
    handleSetCurrentOrg(newOrg);
    return orgId;
  };

  return (
    <OrgContext.Provider
      value={{ organizations, currentOrg, setCurrentOrg: handleSetCurrentOrg, loading, createOrganization }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export const useOrg = () => useContext(OrgContext);
