import { useState, useEffect } from "react";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Save } from "lucide-react";

const VISIBILITY_OPTIONS = [
  { key: "client_can_view_flight_logs", label: "Flight Logs", description: "Allow clients to see flight log details for their projects." },
  { key: "client_can_view_invoices", label: "Invoices", description: "Allow clients to view invoices linked to their account." },
  { key: "client_can_view_deliverables", label: "Deliverables", description: "Allow clients to see project deliverable statuses." },
  { key: "client_can_view_mission_status", label: "Mission Status", description: "Allow clients to see mission planning and status updates." },
] as const;

export function ClientVisibilityPanel() {
  const { settings, isLoading, updateSettings } = useOrgSettings();

  const [values, setValues] = useState<Record<string, boolean>>({
    client_can_view_flight_logs: false,
    client_can_view_invoices: true,
    client_can_view_deliverables: true,
    client_can_view_mission_status: false,
  });

  useEffect(() => {
    if (!settings) return;
    setValues({
      client_can_view_flight_logs: settings.client_can_view_flight_logs ?? false,
      client_can_view_invoices: settings.client_can_view_invoices ?? true,
      client_can_view_deliverables: settings.client_can_view_deliverables ?? true,
      client_can_view_mission_status: settings.client_can_view_mission_status ?? false,
    });
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(values);
  };

  if (isLoading) return <div className="font-mono text-xs text-muted-foreground">Loading…</div>;

  return (
    <div className="surface border border-border p-6 max-w-lg space-y-5">
      <h2 className="font-mono text-sm font-semibold tracking-wide uppercase mb-4">Client Visibility Rules</h2>
      <p className="text-xs text-muted-foreground font-mono">Control what information clients with viewer access can see.</p>

      <div className="space-y-4 pt-2">
        {VISIBILITY_OPTIONS.map((opt) => (
          <div key={opt.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div>
              <Label className="font-mono text-xs">{opt.label}</Label>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{opt.description}</p>
            </div>
            <Switch
              checked={values[opt.key] ?? false}
              onCheckedChange={(checked) => setValues((prev) => ({ ...prev, [opt.key]: checked }))}
            />
          </div>
        ))}
      </div>

      <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
        <Save className="w-3.5 h-3.5" />
        {updateSettings.isPending ? "Saving…" : "Save Rules"}
      </Button>
    </div>
  );
}
