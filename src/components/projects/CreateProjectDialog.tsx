import { useState, useEffect } from "react";
import { useProjects } from "@/hooks/useProjectData";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { X, FileText, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoryLabel = (c: string) => c.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

export function CreateProjectDialog({ open, onOpenChange }: Props) {
  const { createProject } = useProjects();
  const { currentOrg } = useOrg();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("draft");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTemplates, setShowTemplates] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", currentOrg!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && open,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["project_templates", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_templates")
        .select("*")
        .eq("organization_id", currentOrg!.id)
        .order("category");
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && open,
  });

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onOpenChange]);

  if (!open) return null;

  const applyTemplate = (t: any) => {
    setSelectedTemplate(t);
    setName(t.name);
    setDescription(t.description || "");
    if (t.estimated_budget_min) setBudget(t.estimated_budget_min.toString());
    setShowTemplates(false);
  };

  const clearTemplate = () => {
    setSelectedTemplate(null);
    setName("");
    setDescription("");
    setBudget("");
    setShowTemplates(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createProject.mutateAsync({
        name,
        description: description || undefined,
        client_id: clientId || undefined,
        status,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        budget: budget ? parseFloat(budget) : undefined,
      });
      setName(""); setDescription(""); setClientId(""); setStatus("draft");
      setStartDate(""); setEndDate(""); setBudget("");
      setSelectedTemplate(null); setShowTemplates(true);
      setLoading(false);
      onOpenChange(false);
    } catch {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => onOpenChange(false)}>
      <div className="surface border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">New Project</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Template picker */}
        {templates.length > 0 && showTemplates && !selectedTemplate && (
          <div className="px-6 py-4 border-b border-border">
            <p className="stat-label mb-3">Start from a template</p>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {templates.map((t: any) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="text-left border border-border p-3 hover:border-primary/40 hover:bg-secondary/30 transition-colors group"
                >
                  <div className="flex items-start justify-between">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary mt-0.5 shrink-0" />
                    <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-foreground font-medium mt-1.5 leading-tight">{t.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground mt-1">{categoryLabel(t.category)}</p>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => setShowTemplates(false)} className="mt-2 font-mono text-xs text-muted-foreground hover:text-foreground">
              or start blank →
            </button>
          </div>
        )}

        {/* Template badge */}
        {selectedTemplate && (
          <div className="px-6 py-3 border-b border-border flex items-center justify-between bg-primary/5">
            <div className="flex items-center gap-2">
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span className="font-mono text-xs text-primary">Template: {selectedTemplate.name}</span>
            </div>
            <button type="button" onClick={clearTemplate} className="font-mono text-[10px] text-muted-foreground hover:text-foreground">Clear</button>
          </div>
        )}

        {/* Template details */}
        {selectedTemplate && (
          <div className="px-6 py-3 border-b border-border space-y-2">
            {selectedTemplate.required_skills?.length > 0 && (
              <div>
                <p className="stat-label mb-1">Required Skills</p>
                <div className="flex flex-wrap gap-1">
                  {selectedTemplate.required_skills.map((s: string) => (
                    <span key={s} className="font-mono text-[10px] px-1.5 py-0.5 border border-primary/30 bg-primary/5 text-primary">{s}</span>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-4">
              {selectedTemplate.estimated_budget_min && (
                <div>
                  <p className="stat-label mb-0.5">Budget Range</p>
                  <p className="font-mono text-xs text-foreground">${selectedTemplate.estimated_budget_min?.toLocaleString()} – ${selectedTemplate.estimated_budget_max?.toLocaleString()}</p>
                </div>
              )}
              {selectedTemplate.estimated_duration_days && (
                <div>
                  <p className="stat-label mb-0.5">Duration</p>
                  <p className="font-mono text-xs text-foreground">{selectedTemplate.estimated_duration_days} days</p>
                </div>
              )}
            </div>
            {selectedTemplate.risk_notes && (
              <div>
                <p className="stat-label mb-0.5">Risk Notes</p>
                <p className="font-mono text-[10px] text-warning">{selectedTemplate.risk_notes}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="stat-label block mb-2">Project Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Solar Farm Inspection"
              required
            />
          </div>

          <div>
            <label className="stat-label block mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors resize-none"
              placeholder="Project details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="stat-label block mb-2">Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="">None</option>
                {clients.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="stat-label block mb-2">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="stat-label block mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
            <div>
              <label className="stat-label block mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="stat-label block mb-2">Budget ($)</label>
            <input
              type="number"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="0.00"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>
    </div>
  );
}
