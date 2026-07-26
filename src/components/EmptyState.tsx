import { Link } from "react-router-dom";
import { Plus, ChevronRight } from "lucide-react";

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  /** Primary CTA */
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
  };
  /** Secondary hint links */
  hints?: Array<{ label: string; href: string }>;
}

export function EmptyState({ icon: Icon, title, description, action, hints }: EmptyStateProps) {
  return (
    <div className="surface border border-border p-12 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 border border-border flex items-center justify-center mx-auto mb-4">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <p className="font-mono text-sm text-foreground mb-2">{title}</p>
      <p className="font-mono text-xs text-muted-foreground leading-relaxed mb-6">{description}</p>
      {action && (
        action.href ? (
          <Link
            to={action.href}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 h-9 px-4 bg-primary text-primary-foreground font-mono text-xs tracking-wide hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5" />
            {action.label}
          </button>
        )
      )}
      {hints && hints.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          {hints.map((h) => (
            <Link
              key={h.href}
              to={h.href}
              className="inline-flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-primary transition-colors"
            >
              {h.label}
              <ChevronRight className="w-3 h-3" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
