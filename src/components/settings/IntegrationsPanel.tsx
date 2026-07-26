import { useState } from "react";
import {
  Cloud, CloudRain, ShieldCheck, Radar, Map, Layers, Box,
  Radio, HardDrive, MessageSquare, ChevronDown, ChevronRight,
  ExternalLink, Plug, Settings, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  INTEGRATION_REGISTRY,
  INTEGRATION_CATEGORIES,
  getIntegrationsByCategory,
  type IntegrationDefinition,
  type IntegrationCategory,
} from "@/lib/integrationRegistry";
import { useIntegrations, type OrgIntegration } from "@/hooks/useIntegrations";

const ICON_MAP: Record<string, React.ElementType> = {
  Cloud, CloudRain, ShieldCheck, Radar, Map, Layers, Box,
  Radio, HardDrive, MessageSquare,
};

function StatusBadge({ status, defStatus }: { status?: string; defStatus: string }) {
  if (defStatus === "coming_soon") {
    return <span className="font-mono text-[9px] px-1.5 py-0.5 bg-muted text-muted-foreground uppercase tracking-wider">Coming Soon</span>;
  }
  if (defStatus === "beta") {
    return <span className="font-mono text-[9px] px-1.5 py-0.5 bg-warning/10 text-warning uppercase tracking-wider">Beta</span>;
  }
  if (status === "configured") {
    return <span className="font-mono text-[9px] px-1.5 py-0.5 bg-success/10 text-success uppercase tracking-wider">Configured</span>;
  }
  if (status === "not_configured") {
    return <span className="font-mono text-[9px] px-1.5 py-0.5 bg-secondary text-muted-foreground uppercase tracking-wider">Not Configured</span>;
  }
  return null;
}

function IntegrationCard({
  def,
  record,
  onSave,
  isSaving,
}: {
  def: IntegrationDefinition;
  record?: OrgIntegration;
  onSave: (data: { integrationKey: string; enabled?: boolean; config?: Record<string, any>; credentials?: Record<string, any> }) => void;
  isSaving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [localCreds, setLocalCreds] = useState<Record<string, string>>(
    () => (record?.credentials_encrypted as Record<string, string>) ?? {}
  );
  const [localConfig, setLocalConfig] = useState<Record<string, any>>(
    () => {
      const saved = (record?.config as Record<string, any>) ?? {};
      const defaults: Record<string, any> = {};
      for (const f of def.configFields) {
        defaults[f.key] = saved[f.key] ?? f.defaultValue ?? "";
      }
      return defaults;
    }
  );

  const isComingSoon = def.status === "coming_soon";
  const Icon = ICON_MAP[def.icon] || Plug;
  const enabled = record?.enabled ?? false;

  const handleToggle = (checked: boolean) => {
    if (isComingSoon) return;
    onSave({ integrationKey: def.key, enabled: checked });
  };

  const handleSaveConfig = () => {
    onSave({
      integrationKey: def.key,
      credentials: localCreds,
      config: localConfig,
    });
    setExpanded(false);
  };

  return (
    <div className={`border border-border transition-colors ${isComingSoon ? "opacity-60" : "hover:border-primary/30"}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs font-medium text-foreground truncate">{def.name}</p>
            <StatusBadge status={record?.status} defStatus={def.status} />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{def.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isComingSoon && (
            <>
              <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={isSaving}
              />
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1 hover:bg-secondary/50 transition-colors"
              >
                {expanded ? (
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                )}
              </button>
            </>
          )}
          {def.docsUrl && (
            <a
              href={def.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-secondary/50 transition-colors"
              title="View documentation"
            >
              <ExternalLink className="w-3 h-3 text-muted-foreground" />
            </a>
          )}
        </div>
      </div>

      {/* Expanded Config */}
      {expanded && !isComingSoon && (
        <div className="border-t border-border px-4 py-4 space-y-4 bg-secondary/20">
          {/* Credentials */}
          {def.credentialFields.length > 0 && (
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Credentials</p>
              {def.credentialFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="font-mono text-[10px] text-muted-foreground">
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <div className="flex gap-1">
                    <Input
                      type={field.type === "password" && !showSecrets[field.key] ? "password" : "text"}
                      placeholder={field.placeholder}
                      value={localCreds[field.key] ?? ""}
                      onChange={(e) => setLocalCreds((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="font-mono text-xs h-8"
                    />
                    {field.type === "password" && (
                      <button
                        onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                        className="px-2 hover:bg-secondary transition-colors border border-border"
                      >
                        {showSecrets[field.key] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex items-start gap-1.5 mt-2">
                <AlertTriangle className="w-3 h-3 text-warning shrink-0 mt-0.5" />
                <p className="font-mono text-[9px] text-muted-foreground leading-relaxed">
                  Credentials are stored in your organization's database. For production deployments, use backend functions to proxy API calls — never expose keys to the client.
                </p>
              </div>
            </div>
          )}

          {/* Config */}
          {def.configFields.length > 0 && (
            <div className="space-y-3">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Configuration</p>
              {def.configFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="font-mono text-[10px] text-muted-foreground">{field.label}</Label>
                  {field.type === "select" && field.options && (
                    <Select
                      value={localConfig[field.key] ?? ""}
                      onValueChange={(v) => setLocalConfig((prev) => ({ ...prev, [field.key]: v }))}
                    >
                      <SelectTrigger className="font-mono text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="font-mono text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {field.type === "toggle" && (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={localConfig[field.key] ?? false}
                        onCheckedChange={(v) => setLocalConfig((prev) => ({ ...prev, [field.key]: v }))}
                      />
                      {field.description && (
                        <span className="font-mono text-[10px] text-muted-foreground">{field.description}</span>
                      )}
                    </div>
                  )}
                  {field.type === "text" && (
                    <Input
                      value={localConfig[field.key] ?? ""}
                      onChange={(e) => setLocalConfig((prev) => ({ ...prev, [field.key]: e.target.value }))}
                      className="font-mono text-xs h-8"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Data Scope */}
          <div className="space-y-1">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Data Provided</p>
            <div className="flex flex-wrap gap-1">
              {def.dataScope.map((scope) => (
                <span key={scope} className="font-mono text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary">
                  {scope.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {/* Save */}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              onClick={handleSaveConfig}
              disabled={isSaving}
              className="font-mono text-xs"
            >
              <Settings className="w-3 h-3 mr-1.5" />
              Save Configuration
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function IntegrationsPanel() {
  const { integrations, isLoading, upsertIntegration } = useIntegrations();
  const grouped = getIntegrationsByCategory();

  const handleSave = (data: { integrationKey: string; enabled?: boolean; config?: Record<string, any>; credentials?: Record<string, any> }) => {
    upsertIntegration.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-secondary/30 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="surface border border-border p-4">
          <p className="stat-label">Total Integrations</p>
          <p className="text-2xl font-mono font-bold text-foreground">{INTEGRATION_REGISTRY.length}</p>
        </div>
        <div className="surface border border-border p-4">
          <p className="stat-label">Available Now</p>
          <p className="text-2xl font-mono font-bold text-foreground">
            {INTEGRATION_REGISTRY.filter((i) => i.status === "available" || i.status === "beta").length}
          </p>
        </div>
        <div className="surface border border-border p-4">
          <p className="stat-label">Enabled</p>
          <p className="text-2xl font-mono font-bold text-primary">
            {integrations.filter((i) => i.enabled).length}
          </p>
        </div>
      </div>

      {/* Architecture note */}
      <div className="px-4 py-3 bg-secondary/30 border border-border">
        <p className="font-mono text-[10px] text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Integration Architecture:</span> Each integration connects through a modular adapter pattern.
          Internal system data is never mixed with external sources — integration data is clearly tagged and isolated.
          All API credentials are stored per-organization and should be proxied through backend functions for production use.
        </p>
      </div>

      {/* Grouped integrations */}
      {(Object.entries(grouped) as [IntegrationCategory, IntegrationDefinition[]][]).map(([cat, defs]) => (
        <div key={cat}>
          <div className="mb-3">
            <p className="font-mono text-xs font-medium text-foreground">{INTEGRATION_CATEGORIES[cat].label}</p>
            <p className="font-mono text-[10px] text-muted-foreground">{INTEGRATION_CATEGORIES[cat].description}</p>
          </div>
          <div className="space-y-2">
            {defs.map((def) => (
              <IntegrationCard
                key={def.key}
                def={def}
                record={integrations.find((i) => i.integration_key === def.key)}
                onSave={handleSave}
                isSaving={upsertIntegration.isPending}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
