import { useState, useEffect } from "react";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

export function AlertPreferencesPanel() {
  const { settings, isLoading, updateSettings } = useOrgSettings();

  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [certDays, setCertDays] = useState("14");
  const [maintThreshold, setMaintThreshold] = useState("90");
  const [issueAge, setIssueAge] = useState("7");

  useEffect(() => {
    if (!settings) return;
    setAlertsEnabled(settings.alerts_enabled ?? true);
    setCertDays(String(settings.alert_cert_expiry_days ?? 14));
    setMaintThreshold(String(settings.alert_maintenance_threshold ?? 90));
    setIssueAge(String(settings.alert_issue_age_days ?? 7));
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      alerts_enabled: alertsEnabled,
      alert_cert_expiry_days: parseInt(certDays) || 14,
      alert_maintenance_threshold: parseFloat(maintThreshold) || 90,
      alert_issue_age_days: parseInt(issueAge) || 7,
    });
  };

  if (isLoading) return <div className="font-mono text-xs text-muted-foreground">Loading…</div>;

  return (
    <div className="surface border border-border p-6 max-w-lg space-y-5">
      <h2 className="font-mono text-sm font-semibold tracking-wide uppercase mb-4">Alert Preferences</h2>

      <div className="flex items-center justify-between">
        <div>
          <Label className="font-mono text-xs">Alerts Enabled</Label>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">Master toggle for operational alerts.</p>
        </div>
        <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
      </div>

      <div className="border-t border-border pt-4 space-y-4">
        <div className="space-y-2">
          <Label className="font-mono text-xs">Certification Expiry Warning (days)</Label>
          <Input type="number" min="1" value={certDays} onChange={(e) => setCertDays(e.target.value)} />
          <p className="text-xs text-muted-foreground font-mono">Alert when certifications expire within this many days.</p>
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs">Maintenance Threshold (%)</Label>
          <Input type="number" min="0" max="100" value={maintThreshold} onChange={(e) => setMaintThreshold(e.target.value)} />
          <p className="text-xs text-muted-foreground font-mono">Alert when drones reach this percentage of maintenance interval.</p>
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs">Issue Age Threshold (days)</Label>
          <Input type="number" min="1" value={issueAge} onChange={(e) => setIssueAge(e.target.value)} />
          <p className="text-xs text-muted-foreground font-mono">Alert for unresolved issues older than this many days.</p>
        </div>
      </div>

      <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
        <Save className="w-3.5 h-3.5" />
        {updateSettings.isPending ? "Saving…" : "Save Preferences"}
      </Button>
    </div>
  );
}
