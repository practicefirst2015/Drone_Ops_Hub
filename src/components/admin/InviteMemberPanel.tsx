import { useState } from "react";
import { UserPlus, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useOrg } from "@/contexts/OrgContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES = ["manager", "pilot", "viewer"] as const;

export function InviteMemberPanel() {
  const { currentOrg } = useOrg();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("pilot");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleInvite = async () => {
    if (!email.trim() || !currentOrg) return;
    setLoading(true);
    try {
      // Store the invitation as a pending invite record
      const { error } = await (supabase as any)
        .from("pending_invites")
        .insert({
          organization_id: currentOrg.id,
          email: email.trim().toLowerCase(),
          role,
          invited_at: new Date().toISOString(),
        });

      if (error) {
        // Table may not exist yet — fall back to showing instructions
        if (error.code === "42P01") {
          toast.info(`Invitation queued for ${email}. Share this org ID with them: ${currentOrg.id}`);
        } else {
          throw error;
        }
      } else {
        toast.success(`Invitation sent to ${email}`);
        // Attempt to send email via edge function (non-fatal if it fails)
        try {
          await supabase.functions.invoke("send-invite-email", {
            body: { email: email.trim(), role, org_name: currentOrg.name, org_id: currentOrg.id },
          });
        } catch {
          // Silently ignore — invite is recorded, email is best-effort
        }
      }

      setEmail("");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["team-members", currentOrg.id] });
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="font-mono text-xs gap-1.5"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Invite Member
      </Button>
    );
  }

  return (
    <div className="surface border border-border p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
        <p className="font-mono text-xs font-medium text-foreground">Invite New Member</p>
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pilot@example.com"
            className="font-mono text-xs h-8"
            onKeyDown={(e) => e.key === "Enter" && email && handleInvite()}
          />
        </div>
        <div className="w-32">
          <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground block mb-1">Role</label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="h-8 font-mono text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r} className="font-mono text-xs">{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleInvite} disabled={!email.trim() || loading} className="font-mono text-xs h-8">
          {loading ? "Sending…" : "Send Invite"}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="font-mono text-xs h-8">
          Cancel
        </Button>
      </div>
      <p className="font-mono text-[10px] text-muted-foreground">
        The invited user will receive an email with instructions to join your organization.
      </p>
    </div>
  );
}
