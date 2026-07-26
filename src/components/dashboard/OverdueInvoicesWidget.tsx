import { Link } from "react-router-dom";
import { FileText, ChevronRight } from "lucide-react";
import { format, isBefore } from "date-fns";
import { useDashboardInvoices } from "@/hooks/useDashboardData";

export function OverdueInvoicesWidget() {
  const { data: invoices = [], isLoading } = useDashboardInvoices();
  const now = new Date();
  const overdue = (invoices as any[]).filter((i) => i.due_date && isBefore(new Date(i.due_date), now));
  const pending = (invoices as any[]).filter((i) => !i.due_date || !isBefore(new Date(i.due_date), now));

  if (isLoading || invoices.length === 0) return null;

  const total = (invoices as any[]).reduce((s, i) => s + Number(i.amount || 0), 0);

  return (
    <div className="surface border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <FileText className="w-4 h-4 shrink-0 text-warning" />
        <span className="section-title mb-0">Outstanding Invoices</span>
        <span className="ml-auto font-mono text-[10px] text-foreground">${total.toLocaleString()}</span>
      </div>
      {overdue.length > 0 && (
        <div className="px-6 py-2 border-b border-border bg-destructive/5">
          <span className="font-mono text-[10px] text-destructive">{overdue.length} overdue</span>
        </div>
      )}
      <div className="divide-y divide-border">
        {[...overdue, ...pending].slice(0, 6).map((inv: any) => {
          const isOverdue = inv.due_date && isBefore(new Date(inv.due_date), now);
          return (
            <Link
              key={inv.id}
              to={`/invoices/${inv.id}`}
              className="px-6 py-3 flex items-center gap-3 hover:bg-secondary/30 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-mono text-xs text-foreground truncate group-hover:text-primary transition-colors">
                  {inv.invoice_number}
                </p>
                <div className="flex items-center gap-3 mt-0.5 font-mono text-[10px] text-muted-foreground">
                  {inv.clients?.name && <span>{inv.clients.name}</span>}
                  {inv.due_date && <span>Due {format(new Date(inv.due_date), "MMM d")}</span>}
                </div>
              </div>
              <span className={`font-mono text-xs shrink-0 ${isOverdue ? "text-destructive" : "text-foreground"}`}>
                ${Number(inv.amount).toLocaleString()}
              </span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
