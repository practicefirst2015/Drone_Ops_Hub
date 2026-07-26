import { Switch } from "@/components/ui/switch";
import { useOrgSettings } from "@/hooks/useOrgSettings";
import { BarChart3, Shield, Eye } from "lucide-react";

export function DataInsightsOptIn() {
  const { settings, isLoading, updateSettings } = useOrgSettings();

  const optedIn = settings?.data_insights_opt_in ?? false;

  return (
    <div className="surface border border-border">
      <div className="px-5 py-3 border-b border-border flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <span className="section-title">Industry Data Insights</span>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-sm text-muted-foreground">
          Contribute anonymized operational data to generate industry-wide benchmarks.
          Your organization's identity and specific data are never exposed.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-2 p-3 bg-secondary/50 border border-border">
            <Shield className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-mono text-xs font-medium text-foreground">Privacy First</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                All data is aggregated across 3+ organizations. No individual org data is ever exposed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 bg-secondary/50 border border-border">
            <Eye className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-mono text-xs font-medium text-foreground">What's Shared</p>
              <p className="font-mono text-[10px] text-muted-foreground mt-0.5">
                Mission counts, flight durations, drone models, issue categories — all anonymized.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div>
            <p className="font-mono text-xs text-foreground">
              {optedIn ? "Contributing anonymized data" : "Not contributing data"}
            </p>
          </div>
          <Switch
            checked={optedIn}
            disabled={isLoading || updateSettings.isPending}
            onCheckedChange={(checked) =>
              updateSettings.mutate({ data_insights_opt_in: checked })
            }
          />
        </div>
      </div>
    </div>
  );
}
