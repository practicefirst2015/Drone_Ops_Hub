import { useState, useEffect } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const ROLES = ["owner", "admin", "manager", "pilot", "viewer"] as const;

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  full_name: string | null;
  client_id: string | null;
}

export function TeamMembersPanel() {
  const { currentOrg } = useOrg();
  const { role } = useOrgRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = currentOrg?.id;

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("memberships")
        .select("id, user_id, role, created_at, client_id, profiles(full_name)")
        .eq("organization_id", orgId)
        .order("created_at");

      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        created_at: m.created_at,
        full_name: m.profiles?.full_name || null,
        client_id: m.client_id ?? null,
      })) as Member[];
    },
    enabled: !!orgId,
  });

  // Clients for linking portal (viewer) members to the client they represent.
  const { data: clients = [] } = useQuery({
    queryKey: ["org-clients-lite", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("id, name")
        .eq("organization_id", orgId)
        .order("name");
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
    enabled: !!orgId,
  });

  const updateClientLink = useMutation({
    mutationFn: async ({ membershipId, clientId }: { membershipId: string; clientId: string | null }) => {
      const { error } = await supabase
        .from("memberships")
        .update({ client_id: clientId })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
      toast.success("Client link updated");
    },
    onError: () => toast.error("Failed to update client link"),
  });

  const updateRole = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: string }) => {
      const { error } = await supabase
        .from("memberships")
        .update({ role: newRole as any })
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
      toast.success("Role updated");
    },
    onError: () => toast.error("Failed to update role"),
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from("memberships")
        .delete()
        .eq("id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members", orgId] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const ownerCount = members.filter((m) => m.role === "owner").length;

  return (
    <div className="space-y-6">
      <div className="surface border border-border">
        <div className="p-4 border-b border-border">
          <h2 className="font-mono text-sm font-semibold tracking-wide uppercase">Team Members</h2>
          <p className="text-xs text-muted-foreground font-mono mt-1">{members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-mono text-xs">Name</TableHead>
              <TableHead className="font-mono text-xs">Role</TableHead>
              <TableHead className="font-mono text-xs">Portal Client</TableHead>
              <TableHead className="font-mono text-xs">Joined</TableHead>
              <TableHead className="font-mono text-xs w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground font-mono text-xs py-8">Loading…</TableCell></TableRow>
            ) : members.map((m) => {
              const isOwnerRow = m.role === "owner";
              const isSelf = m.user_id === user?.id;
              const canEdit = !isOwnerRow && !isSelf;
              const canRemove = canEdit && !(isOwnerRow && ownerCount <= 1);

              return (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.full_name || "—"}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <Select value={m.role} onValueChange={(v) => updateRole.mutate({ membershipId: m.id, newRole: v })}>
                        <SelectTrigger className="h-7 w-28 font-mono text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.filter((r) => r !== "owner").map((r) => (
                            <SelectItem key={r} value={r} className="font-mono text-xs">{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground uppercase">{m.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.role === "viewer" ? (
                      <Select
                        value={m.client_id ?? "__none__"}
                        onValueChange={(v) =>
                          updateClientLink.mutate({ membershipId: m.id, clientId: v === "__none__" ? null : v })
                        }
                      >
                        <SelectTrigger className="h-7 w-40 font-mono text-xs">
                          <SelectValue placeholder="Link client…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" className="font-mono text-xs text-muted-foreground">
                            No client (sees nothing)
                          </SelectItem>
                          {clients.map((c) => (
                            <SelectItem key={c.id} value={c.id} className="font-mono text-xs">{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {new Date(m.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeMember.mutate(m.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
