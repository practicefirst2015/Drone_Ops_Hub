import { useState } from "react";
import { Building2, Users, FolderKanban, FileText, Bell, Eye, Lock, Plug, BarChart3 } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { OrgProfilePanel } from "@/components/settings/OrgProfilePanel";
import { TeamMembersPanel } from "@/components/settings/TeamMembersPanel";
import { ProjectCategoriesPanel } from "@/components/settings/ProjectCategoriesPanel";
import { InvoiceDefaultsPanel } from "@/components/settings/InvoiceDefaultsPanel";
import { AlertPreferencesPanel } from "@/components/settings/AlertPreferencesPanel";
import { ClientVisibilityPanel } from "@/components/settings/ClientVisibilityPanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { DataInsightsOptIn } from "@/components/settings/DataInsightsOptIn";

type SettingsTab = "profile" | "team" | "categories" | "invoices" | "alerts" | "visibility" | "integrations" | "insights";

const tabs: { key: SettingsTab; label: string; icon: React.ElementType }[] = [
  { key: "profile", label: "Organization", icon: Building2 },
  { key: "team", label: "Team", icon: Users },
  { key: "categories", label: "Categories", icon: FolderKanban },
  { key: "invoices", label: "Invoice Defaults", icon: FileText },
  { key: "alerts", label: "Alerts", icon: Bell },
  { key: "visibility", label: "Client Visibility", icon: Eye },
  { key: "integrations", label: "Integrations", icon: Plug },
  { key: "insights", label: "Data Insights", icon: BarChart3 },
];

const Settings = () => {
  const { isAdmin } = useOrgRole();
  const [tab, setTab] = useState<SettingsTab>("profile");

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
        <p className="stat-label mb-1">Organization</p>
        <h1 className="page-title">Settings</h1>
      </div>

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

      {tab === "profile" && <OrgProfilePanel />}
      {tab === "team" && <TeamMembersPanel />}
      {tab === "categories" && <ProjectCategoriesPanel />}
      {tab === "invoices" && <InvoiceDefaultsPanel />}
      {tab === "alerts" && <AlertPreferencesPanel />}
      {tab === "visibility" && <ClientVisibilityPanel />}
      {tab === "integrations" && <IntegrationsPanel />}
      {tab === "insights" && <DataInsightsOptIn />}
    </div>
  );
};

export default Settings;
