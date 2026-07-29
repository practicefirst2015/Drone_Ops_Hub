import { useState } from "react";
import { Building2, Users, FolderKanban, FileText, Bell, Eye, Plug, BarChart3, UserCog } from "lucide-react";
import { useOrgRole } from "@/hooks/useOrgRole";
import { OrgProfilePanel } from "@/components/settings/OrgProfilePanel";
import { TeamMembersPanel } from "@/components/settings/TeamMembersPanel";
import { ProjectCategoriesPanel } from "@/components/settings/ProjectCategoriesPanel";
import { InvoiceDefaultsPanel } from "@/components/settings/InvoiceDefaultsPanel";
import { AlertPreferencesPanel } from "@/components/settings/AlertPreferencesPanel";
import { ClientVisibilityPanel } from "@/components/settings/ClientVisibilityPanel";
import { IntegrationsPanel } from "@/components/settings/IntegrationsPanel";
import { AccountPanel } from "@/components/settings/AccountPanel";
import { DataInsightsOptIn } from "@/components/settings/DataInsightsOptIn";

type SettingsTab = "profile" | "team" | "categories" | "invoices" | "alerts" | "visibility" | "integrations" | "insights" | "account";

/** `account` is available to every signed-in user — data export and deletion
 *  are individual rights and must not sit behind an admin gate. */
const tabs: { key: SettingsTab; label: string; icon: React.ElementType; adminOnly: boolean }[] = [
  { key: "profile", label: "Organization", icon: Building2, adminOnly: true },
  { key: "team", label: "Team", icon: Users, adminOnly: true },
  { key: "categories", label: "Categories", icon: FolderKanban, adminOnly: true },
  { key: "invoices", label: "Invoice Defaults", icon: FileText, adminOnly: true },
  { key: "alerts", label: "Alerts", icon: Bell, adminOnly: true },
  { key: "visibility", label: "Client Visibility", icon: Eye, adminOnly: true },
  { key: "integrations", label: "Integrations", icon: Plug, adminOnly: true },
  { key: "insights", label: "Data Insights", icon: BarChart3, adminOnly: true },
  { key: "account", label: "Account", icon: UserCog, adminOnly: false },
];

const Settings = () => {
  const { isAdmin } = useOrgRole();
  const visibleTabs = isAdmin ? tabs : tabs.filter((t) => !t.adminOnly);
  const [tab, setTab] = useState<SettingsTab>(isAdmin ? "profile" : "account");

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <p className="stat-label mb-1">Organization</p>
        <h1 className="page-title">Settings</h1>
      </div>

      <div className="border-b border-border mb-6 flex gap-0 overflow-x-auto">
        {visibleTabs.map((t) => (
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
      {tab === "account" && <AccountPanel />}
      {tab === "insights" && <DataInsightsOptIn />}
    </div>
  );
};

export default Settings;
