import { Link } from "react-router-dom";
import { FileWarning, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useOrgUnresolvedIssues } from "@/hooks/usePostflightIssues";

const SEVERITY_STYLE: Record<string, string> = {
  critical: "text-destructive bg-destructive/10",
  high: "text-warning bg-warning/10",
  medium: "text-muted-foreground bg-muted",
  low: "text-muted-foreground bg-muted",
};

export function UnresolvedIssuesWidget() {
  const { data: issues = [], isLoading } = useOrgUnresolvedIssues();

  if (isLoading) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <FileWarning className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="section-title mb-0">Unresolved Issues</span>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="w-2 h-2 bg-primary animate-pulse-glow" />
        </div>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="surface border border-border">
        <div className="px-6 py-4 border-b border-border flex items-center gap-2">
          <FileWarning className="w-4 h-4 shrink-0 text-muted-foreground" />
          <span className="section-title mb-0">Unresolved Issues</span>
        </div>
        <div className="px-6 py-12 text-center">
          <FileWarning className="w-5 h-5 text-success/40 mx-auto mb-2" />
          <p className="font-mono text-xs text-muted-foreground">No unresolved issues. All clear.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <FileWarning className="w-4 h-4 shrink-0 text-warning" />
        <span className="section-title mb-0">Unresolved Issues</span>
        <span className="ml-auto font-mono text-[10px] text-warning bg-warning/10 px-2 py-0.5">
          {issues.length}
        </span>
      </div>
      <div className="divide-y divide-border">
        {(issues as any[]).slice(0, 6).map((issue) => (
          <Link
            key={issue.id}
            to={`/flight-logs/${issue.flight_log_id}`}
            className="px-6 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">{issue.title}</p>
              <div className="flex items-center gap-3 mt-0.5 font-mono text-[10px] text-muted-foreground">
                <span>{issue.category.replace("_", " ")}</span>
                {issue.profiles_pilot?.full_name && <span>{issue.profiles_pilot.full_name}</span>}
                <span>{formatDistanceToNow(new Date(issue.created_at), { addSuffix: true })}</span>
              </div>
            </div>
            <span className={`font-mono text-[10px] px-2 py-0.5 shrink-0 ${SEVERITY_STYLE[issue.severity] || SEVERITY_STYLE.medium}`}>
              {issue.severity}
            </span>
            <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
      </div>
    </div>
  );
}
