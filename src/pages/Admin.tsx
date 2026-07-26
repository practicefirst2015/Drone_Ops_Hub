import { useState } from "react";
import { Users, Shield, Database, Key, Lock, Plane, BookOpen, Award, FolderKanban, Layers } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { SeedDataPanel } from "@/components/admin/SeedDataPanel";
import { ManufacturersPanel } from "@/components/admin/ManufacturersPanel";
import { SkillsTaxonomyPanel } from "@/components/admin/SkillsTaxonomyPanel";
import { DroneModelsPanel } from "@/components/admin/DroneModelsPanel";
import { ProjectTemplatesPanel } from "@/components/admin/ProjectTemplatesPanel";
import { TeamMembersPanel } from "@/components/settings/TeamMembersPanel";
import { InviteMemberPanel } from "@/components/admin/InviteMemberPanel";

type AdminTab = "users" | "seed" | "manufacturers" | "models" | "skills" | "templates";

const tabs: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: "users", label: "Users", icon: Users },
  { key: "seed", label: "Seed Data", icon: Database },
  { key: "manufacturers", label: "Manufacturers", icon: Plane },
  { key: "models", label: "Drone Models", icon: Layers },
  { key: "skills", label: "Skills", icon: BookOpen },
  { key: "templates", label: "Templates", icon: FolderKanban },
];

const Admin = () => {
  const { isAdmin } = useOrgRole();
  const [tab, setTab] = useState<AdminTab>("users");

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="surface border border-border p-12 text-center">
          <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-mono text-sm text-muted-foreground">Access restricted to organization administrators.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="stat-label mb-1">System</p>
        <h1 className="page-title">Administration</h1>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6 flex gap-0 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 font-mono text-xs tracking-wide transition-colors border-b-2 -mb-px flex items-center gap-2 whitespace-nowrap ${
              tab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "users" && (
        <div className="space-y-4">
          <InviteMemberPanel />
          <TeamMembersPanel />
        </div>
      )}
      {tab === "seed" && <SeedDataPanel />}
      {tab === "manufacturers" && <ManufacturersPanel />}
      {tab === "models" && <DroneModelsPanel />}
      {tab === "skills" && <SkillsTaxonomyPanel />}
      {tab === "templates" && <ProjectTemplatesPanel />}
    </div>
  );
};

export default Admin;
