import { useState } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function ProjectCategoriesPanel() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["project-categories", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("project_categories")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const addCategory = useMutation({
    mutationFn: async () => {
      if (!orgId || !newName.trim()) return;
      const { error } = await supabase
        .from("project_categories")
        .insert({ organization_id: orgId, name: newName.trim(), color: newColor, sort_order: categories.length });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-categories", orgId] });
      setNewName("");
      setNewColor("#6366f1");
      toast.success("Category added");
    },
    onError: () => toast.error("Failed to add category"),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("project_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-categories", orgId] });
      toast.success("Category removed");
    },
    onError: () => toast.error("Failed to remove category"),
  });

  return (
    <div className="space-y-6 max-w-lg">
      <div className="surface border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-mono text-sm font-semibold tracking-wide uppercase">Project Categories</h2>
          <p className="text-xs text-muted-foreground font-mono mt-1">Custom taxonomy for organizing projects.</p>
        </div>

        <div className="p-4 border-b border-border flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Category name"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && addCategory.mutate()}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="w-10 h-10 border border-border cursor-pointer bg-transparent"
          />
          <Button onClick={() => addCategory.mutate()} disabled={!newName.trim()} size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs w-10">Color</TableHead>
              <TableHead className="font-mono text-xs">Name</TableHead>
              <TableHead className="font-mono text-xs w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground font-mono text-xs py-8">Loading…</TableCell></TableRow>
            ) : categories.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground font-mono text-xs py-8">No categories yet.</TableCell></TableRow>
            ) : categories.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell>
                  <div className="w-5 h-5 border border-border" style={{ backgroundColor: c.color }} />
                </TableCell>
                <TableCell className="font-mono text-xs">{c.name}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteCategory.mutate(c.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
