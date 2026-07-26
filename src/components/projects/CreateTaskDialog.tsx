import { useState } from "react";
import { useProjectTasks } from "@/hooks/useProjectData";
import { useOrgMembers } from "@/hooks/useProjectData";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  organizationId: string;
}

export function CreateTaskDialog({ open, onOpenChange, projectId, organizationId }: Props) {
  const { createTask } = useProjectTasks(projectId);
  const orgMembers = useOrgMembers();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await createTask.mutateAsync({
      title,
      description: description || undefined,
      priority,
      assigned_to: assignedTo || undefined,
      due_date: dueDate || undefined,
      project_id: projectId,
      organization_id: organizationId,
    });
    setTitle("");
    setDescription("");
    setPriority("medium");
    setAssignedTo("");
    setDueDate("");
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
      <div className="surface border border-border w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-mono text-sm font-medium text-foreground">New Task</h2>
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="stat-label block mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="Capture aerial survey data"
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
              placeholder="Task details..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="stat-label block mb-2">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div>
              <label className="stat-label block mb-2">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="stat-label block mb-2">Assign To</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary transition-colors"
            >
              <option value="">Unassigned</option>
              {(orgMembers.data || []).map((m: any) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profiles?.full_name || "Unnamed"}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  );
}
