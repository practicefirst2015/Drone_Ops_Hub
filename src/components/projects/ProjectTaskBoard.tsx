import { useProjectTasks } from "@/hooks/useProjectData";

const COLUMNS = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "in_review", label: "In Review" },
  { key: "done", label: "Done" },
];

const priorityColor = (p: string) => {
  switch (p) {
    case "critical": return "bg-destructive";
    case "high": return "bg-warning";
    case "medium": return "bg-primary";
    case "low": return "bg-muted-foreground";
    default: return "bg-muted-foreground";
  }
};

export function ProjectTaskBoard({ projectId }: { projectId: string }) {
  const { tasks, updateTask } = useProjectTasks(projectId);
  const allTasks = tasks.data || [];

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTask.mutate({ id: taskId, status: newStatus });
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {COLUMNS.map((col) => {
        const items = allTasks.filter((t: any) => t.status === col.key);
        return (
          <div key={col.key} className="min-h-[200px]">
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs tracking-widest uppercase text-muted-foreground">{col.label}</span>
              <span className="font-mono text-xs text-muted-foreground">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  columns={COLUMNS}
                />
              ))}
              {items.length === 0 && (
                <div className="border border-dashed border-border p-4 text-center">
                  <span className="font-mono text-xs text-muted-foreground">Empty</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onStatusChange,
  columns,
}: {
  task: any;
  onStatusChange: (id: string, status: string) => void;
  columns: typeof COLUMNS;
}) {
  return (
    <div className="surface border border-border p-4 hover:border-primary/30 transition-colors group">
      <div className="flex items-start gap-2 mb-2">
        <div className={`w-1.5 h-1.5 mt-1.5 shrink-0 ${priorityColor(task.priority)}`} />
        <p className="text-sm text-foreground leading-tight">{task.title}</p>
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 ml-3.5">{task.description}</p>
      )}

      <div className="flex items-center justify-between ml-3.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">{task.priority}</span>
          {task.due_date && (
            <span className="font-mono text-[10px] text-muted-foreground">{task.due_date}</span>
          )}
        </div>
        {task.profiles && (
          <span className="font-mono text-[10px] text-muted-foreground truncate max-w-[80px]">
            {task.profiles.full_name}
          </span>
        )}
      </div>

      {/* Quick status move buttons */}
      <div className="mt-3 ml-3.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {columns
          .filter((c) => c.key !== task.status)
          .map((c) => (
            <button
              key={c.key}
              onClick={() => onStatusChange(task.id, c.key)}
              className="font-mono text-[9px] px-1.5 py-0.5 border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
            >
              → {c.label}
            </button>
          ))}
      </div>
    </div>
  );
}
