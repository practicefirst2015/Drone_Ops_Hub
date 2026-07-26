import { useState, useEffect } from "react";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Save } from "lucide-react";

export function OrgProfilePanel() {
  const { currentOrg, setCurrentOrg, organizations } = useOrg();
  const { role } = useOrgRole();
  const isOwner = role === "owner";

  const [name, setName] = useState(currentOrg?.name || "");
  const [slug, setSlug] = useState(currentOrg?.slug || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(currentOrg?.name || "");
    setSlug(currentOrg?.slug || "");
  }, [currentOrg]);

  const handleSave = async () => {
    if (!currentOrg) return;
    setSaving(true);
    const { error } = await supabase
      .from("organizations")
      .update({ name, slug })
      .eq("id", currentOrg.id);

    if (error) {
      toast.error("Failed to update organization");
    } else {
      toast.success("Organization updated");
      setCurrentOrg({ ...currentOrg, name, slug });
    }
    setSaving(false);
  };

  return (
    <div className="surface border border-border p-6 max-w-lg">
      <h2 className="font-mono text-sm font-semibold tracking-wide uppercase mb-6">Organization Profile</h2>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="font-mono text-xs">Organization Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner}
            placeholder="My Organization"
          />
        </div>

        <div className="space-y-2">
          <Label className="font-mono text-xs">Slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            disabled={!isOwner}
            placeholder="my-org"
          />
          <p className="text-xs text-muted-foreground font-mono">Lowercase letters, numbers, and hyphens only.</p>
        </div>

        {isOwner ? (
          <Button onClick={handleSave} disabled={saving || !name.trim() || !slug.trim()} className="gap-2">
            <Save className="w-3.5 h-3.5" />
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground font-mono">Only the organization owner can edit these fields.</p>
        )}
      </div>
    </div>
  );
}
