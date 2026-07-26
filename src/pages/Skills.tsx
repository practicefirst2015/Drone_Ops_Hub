import { useOrgSkills } from "@/hooks/useProjectData";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo, useEffect, useCallback } from "react";
import { Plus, X, Trash2, Pencil, AlertCircle, Award, ShieldCheck, Users, BookOpen, AlertTriangle, CheckCircle2, Clock, Activity, Shield } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { logActivity } from "@/lib/activityLogger";
import { usePilotUtilization } from "@/hooks/useUtilization";
import { PilotCurrencyPanel } from "@/components/pilots/PilotCurrencyPanel";
import { ConfirmDialog, useConfirm } from "@/components/ui/confirm-dialog";

type Tab = "skills" | "certifications" | "assignments" | "currency" | "alerts" | "utilization";

const PROFICIENCY_LEVELS = ["beginner", "intermediate", "advanced", "expert"] as const;

const proficiencyColor: Record<string, string> = {
  beginner: "text-muted-foreground bg-muted",
  intermediate: "text-primary bg-primary/10",
  advanced: "text-success bg-success/10",
  expert: "text-warning bg-warning/10",
};

const Skills = () => {
  const { data: skills = [], isLoading, error: skillsError } = useOrgSkills();
  const { currentOrg } = useOrg();
  const { canManage } = useOrgRole();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tab, setTab] = useState<Tab>("skills");
  const { confirm, ConfirmationDialog } = useConfirm();

  // ── Certifications ──
  const [certFormOpen, setCertFormOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<any>(null);
  const [certForm, setCertForm] = useState({ skill_id: "", certification_number: "", issued_date: "", expiry_date: "", notes: "" });
  const [certUserId, setCertUserId] = useState("");

  // ── User Skill Assignments ──
  const [assignFormOpen, setAssignFormOpen] = useState(false);
  const [editingAssign, setEditingAssign] = useState<any>(null);
  const [assignForm, setAssignForm] = useState({ user_id: "", skill_id: "", proficiency_level: "beginner", notes: "" });

  // ── Escape key handler for all modals ──
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (formOpen) { setFormOpen(false); setEditing(null); }
        if (certFormOpen) { setCertFormOpen(false); setEditingCert(null); }
        if (assignFormOpen) { setAssignFormOpen(false); setEditingAssign(null); }
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [formOpen, certFormOpen, assignFormOpen]);

  // ── Data Queries ──
  const { data: certifications = [], isLoading: certsLoading } = useQuery({
    queryKey: ["certifications", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certifications")
        .select("*, skills(name), profiles:user_id(full_name)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: orgMembers = [] } = useQuery({
    queryKey: ["org_members_list", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("memberships")
        .select("user_id, profiles:user_id(full_name)")
        .eq("organization_id", currentOrg!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: userSkills = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["user_skills", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_skills")
        .select("*, skills(name), profiles:user_id(full_name), verifier:verified_by(full_name)")
        .eq("organization_id", currentOrg!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  const { data: projectSkills = [] } = useQuery({
    queryKey: ["all_project_skills", currentOrg?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_skills")
        .select("*, skills(name), projects!inner(name, organization_id, status)")
        .eq("projects.organization_id", currentOrg!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg,
  });

  // ── Alerts ──
  const expiringCerts = useMemo(() => {
    const now = new Date();
    return certifications.filter((c: any) => {
      if (!c.expiry_date) return false;
      const exp = new Date(c.expiry_date);
      const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return days < 60;
    }).sort((a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());
  }, [certifications]);

  // ── Skill Mutations ──
  const upsertSkill = useMutation({
    mutationFn: async () => {
      if (editing) {
        const { error } = await supabase.from("skills").update({ name, description: description || null }).eq("id", editing.id);
        if (error) throw error;
        return { id: editing.id, isEdit: true };
      } else {
        const { data, error } = await supabase.from("skills").insert({ name, description: description || null, organization_id: currentOrg!.id }).select("id").single();
        if (error) throw error;
        return { id: data.id, isEdit: false };
      }
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["org_skills"] });
      closeForm();
      toast.success(result.isEdit ? "Skill updated" : "Skill created");
      logActivity({ organizationId: currentOrg!.id, action: result.isEdit ? "updated" : "created", entityType: "skill", entityId: result.id, entityName: name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteSkill = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("skills").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["org_skills"] });
      qc.invalidateQueries({ queryKey: ["user_skills"] });
      qc.invalidateQueries({ queryKey: ["certifications"] });
      toast.success("Skill deleted");
      logActivity({ organizationId: currentOrg!.id, action: "deleted", entityType: "skill", entityId: result.id, entityName: result.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Certification Mutations ──
  const invalidateCertRelated = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["certifications"] });
    qc.invalidateQueries({ queryKey: ["member_certs_for_gap"] });
    qc.invalidateQueries({ queryKey: ["pilot_currency"] });
  }, [qc]);

  const createCertification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("certifications").insert({
        organization_id: currentOrg!.id,
        user_id: certUserId,
        skill_id: certForm.skill_id,
        certification_number: certForm.certification_number || null,
        issued_date: certForm.issued_date || null,
        expiry_date: certForm.expiry_date || null,
        notes: certForm.notes || null,
      }).select("id").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateCertRelated();
      setCertFormOpen(false);
      const certName = certForm.certification_number || "certification";
      toast.success("Certification added");
      logActivity({ organizationId: currentOrg!.id, action: "created", entityType: "certification", entityId: data.id, entityName: certName });
      setCertForm({ skill_id: "", certification_number: "", issued_date: "", expiry_date: "", notes: "" });
      setCertUserId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateCertification = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("certifications").update({
        skill_id: certForm.skill_id,
        certification_number: certForm.certification_number || null,
        issued_date: certForm.issued_date || null,
        expiry_date: certForm.expiry_date || null,
        notes: certForm.notes || null,
        user_id: certUserId,
      }).eq("id", editingCert.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateCertRelated();
      setCertFormOpen(false);
      toast.success("Certification updated");
      logActivity({ organizationId: currentOrg!.id, action: "updated", entityType: "certification", entityId: editingCert.id, entityName: certForm.certification_number || "certification" });
      setEditingCert(null);
      setCertForm({ skill_id: "", certification_number: "", issued_date: "", expiry_date: "", notes: "" });
      setCertUserId("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteCertification = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase.from("certifications").delete().eq("id", id);
      if (error) throw error;
      return { id, name };
    },
    onSuccess: (result) => {
      invalidateCertRelated();
      toast.success("Certification removed");
      logActivity({ organizationId: currentOrg!.id, action: "deleted", entityType: "certification", entityId: result.id, entityName: result.name });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // ── User Skill Assignment Mutations ──
  const upsertAssignment = useMutation({
    mutationFn: async () => {
      if (editingAssign) {
        const { error } = await supabase.from("user_skills").update({
          proficiency_level: assignForm.proficiency_level,
          notes: assignForm.notes || null,
        }).eq("id", editingAssign.id);
        if (error) throw error;
      } else {
        // Duplicate check
        const exists = userSkills.some(
          (us: any) => us.user_id === assignForm.user_id && us.skill_id === assignForm.skill_id
        );
        if (exists) {
          throw new Error("This skill is already assigned to that team member.");
        }
        const { error } = await supabase.from("user_skills").insert({
          user_id: assignForm.user_id,
          skill_id: assignForm.skill_id,
          organization_id: currentOrg!.id,
          proficiency_level: assignForm.proficiency_level,
          notes: assignForm.notes || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_skills"] });
      setAssignFormOpen(false);
      setEditingAssign(null);
      setAssignForm({ user_id: "", skill_id: "", proficiency_level: "beginner", notes: "" });
      toast.success(editingAssign ? "Assignment updated" : "Skill assigned");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const verifyAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_skills").update({
        is_verified: true,
        verified_by: user!.id,
        verified_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_skills"] });
      toast.success("Skill verified");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_skills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["user_skills"] }); toast.success("Assignment removed"); },
    onError: (err: any) => toast.error(err.message),
  });

  // ── Helpers ──
  const openCreate = () => { setEditing(null); setName(""); setDescription(""); setFormOpen(true); };
  const openEdit = (s: any) => { setEditing(s); setName(s.name); setDescription(s.description || ""); setFormOpen(true); };
  const closeForm = () => { setFormOpen(false); setEditing(null); };

  const certStatusColor = (c: any) => {
    if (!c.expiry_date) return "text-muted-foreground bg-muted";
    const exp = new Date(c.expiry_date);
    const now = new Date();
    const days = (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (days < 0) return "text-destructive bg-destructive/10";
    if (days < 30) return "text-warning bg-warning/10";
    if (days < 60) return "text-primary bg-primary/10";
    return "text-success bg-success/10";
  };

  const certStatusLabel = (c: any) => {
    if (!c.expiry_date) return "No Expiry";
    const exp = new Date(c.expiry_date);
    const now = new Date();
    const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) return "Expired";
    if (days < 30) return `${days}d left`;
    if (days < 60) return `${days}d left`;
    return "Valid";
  };

  // Count skills used in active projects
  const skillProjectCount = useMemo(() => {
    const counts: Record<string, number> = {};
    projectSkills.forEach((ps: any) => {
      counts[ps.skill_id] = (counts[ps.skill_id] || 0) + 1;
    });
    return counts;
  }, [projectSkills]);

  // Count assigned users per skill
  const skillAssigneeCount = useMemo(() => {
    const counts: Record<string, number> = {};
    userSkills.forEach((us: any) => {
      counts[us.skill_id] = (counts[us.skill_id] || 0) + 1;
    });
    return counts;
  }, [userSkills]);

  // Count certifications per skill
  const skillCertCount = useMemo(() => {
    const counts: Record<string, number> = {};
    certifications.forEach((c: any) => {
      counts[c.skill_id] = (counts[c.skill_id] || 0) + 1;
    });
    return counts;
  }, [certifications]);

  const handleDeleteSkill = (s: any) => {
    const assignees = skillAssigneeCount[s.id] || 0;
    const projects = skillProjectCount[s.id] || 0;
    const certs = skillCertCount[s.id] || 0;
    const parts: string[] = [];
    if (assignees > 0) parts.push(`${assignees} member${assignees > 1 ? "s" : ""}`);
    if (certs > 0) parts.push(`${certs} certification${certs > 1 ? "s" : ""}`);
    if (projects > 0) parts.push(`${projects} project${projects > 1 ? "s" : ""}`);
    const depMsg = parts.length > 0
      ? ` This skill is linked to ${parts.join(", ")}. Related records may also be removed.`
      : "";
    confirm({
      title: `Delete "${s.name}"?`,
      description: `This action cannot be undone.${depMsg}`,
      confirmLabel: "Delete",
      variant: "destructive",
      onConfirm: async () => { await deleteSkill.mutateAsync({ id: s.id, name: s.name }); },
    });
  };

  const tabs: { key: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { key: "skills", label: "Skills", icon: BookOpen },
    { key: "assignments", label: "Assignments", icon: Users, count: userSkills.length },
    { key: "certifications", label: "Certifications", icon: Award, count: certifications.length },
    { key: "currency", label: "Currency", icon: Shield },
    { key: "utilization", label: "Utilization", icon: Activity },
    { key: "alerts", label: "Alerts", icon: AlertTriangle, count: expiringCerts.length },
  ];

  const addButtonConfig: Record<Tab, { label: string; action: () => void } | null> = {
    skills: { label: "Add Skill", action: openCreate },
    assignments: {
      label: "Assign Skill",
      action: () => {
        setEditingAssign(null);
        setAssignForm({ user_id: "", skill_id: "", proficiency_level: "beginner", notes: "" });
        setAssignFormOpen(true);
      },
    },
    certifications: {
      label: "Add Certification",
      action: () => {
        setEditingCert(null);
        setCertUserId("");
        setCertForm({ skill_id: "", certification_number: "", issued_date: "", expiry_date: "", notes: "" });
        setCertFormOpen(true);
      },
    },
    currency: null,
    utilization: null,
    alerts: null,
  };

  const addBtn = addButtonConfig[tab];

  const loadingIndicator = (
    <div className="p-8 text-center"><div className="w-2 h-2 bg-primary animate-pulse mx-auto" /></div>
  );

  return (
    <div className="p-8">
      <ConfirmationDialog />

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="stat-label mb-1">Personnel</p>
          <h1 className="page-title">Skills & Certifications</h1>
        </div>
        {canManage && addBtn && (
          <button onClick={addBtn.action} className="h-10 px-4 bg-primary text-primary-foreground font-mono text-sm tracking-wide flex items-center gap-2 hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> {addBtn.label}
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-8">
        <div className="surface p-5">
          <p className="stat-label">Total Skills</p>
          <p className="stat-value mt-1">{skills.length}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Assigned</p>
          <p className="stat-value mt-1">{userSkills.length}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Certifications</p>
          <p className="stat-value mt-1">{certifications.length}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Expiring Soon</p>
          <p className={`stat-value mt-1 ${expiringCerts.length > 0 ? "text-warning" : ""}`}>{expiringCerts.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border mb-6 flex gap-0">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-3 font-mono text-xs tracking-wide transition-colors border-b-2 -mb-px flex items-center gap-2 ${tab === t.key ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="font-mono text-[10px] px-1.5 py-0.5 bg-secondary text-secondary-foreground">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ MODALS ═══ */}

      {/* Skill Form Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={closeForm}>
          <div className="surface border border-border w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">{editing ? "Edit Skill" : "Add Skill"}</h2>
              <button onClick={closeForm} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); upsertSkill.mutate(); }} className="p-6 space-y-4">
              <div>
                <label className="stat-label block mb-2">Skill Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="Part 107" />
              </div>
              <div>
                <label className="stat-label block mb-2">Description</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="FAA Part 107 certification" />
              </div>
              <button type="submit" disabled={upsertSkill.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                {upsertSkill.isPending ? "Saving..." : editing ? "Update Skill" : "Add Skill"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Certification Form Modal */}
      {certFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => { setCertFormOpen(false); setEditingCert(null); }}>
          <div className="surface border border-border w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">{editingCert ? "Edit Certification" : "Add Certification"}</h2>
              <button onClick={() => { setCertFormOpen(false); setEditingCert(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editingCert ? updateCertification.mutate() : createCertification.mutate(); }} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="stat-label block mb-2">Team Member *</label>
                  <select value={certUserId} onChange={(e) => setCertUserId(e.target.value)} required
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                    <option value="">Select...</option>
                    {orgMembers.map((m: any) => <option key={m.user_id} value={m.user_id}>{(m.profiles as any)?.full_name || "Unnamed"}</option>)}
                  </select>
                </div>
                <div>
                  <label className="stat-label block mb-2">Skill *</label>
                  <select value={certForm.skill_id} onChange={(e) => setCertForm({ ...certForm, skill_id: e.target.value })} required
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                    <option value="">Select...</option>
                    {skills.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="stat-label block mb-2">Certification #</label>
                <input type="text" value={certForm.certification_number} onChange={(e) => setCertForm({ ...certForm, certification_number: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="CERT-12345" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="stat-label block mb-2">Issued Date</label>
                  <input type="date" value={certForm.issued_date} onChange={(e) => setCertForm({ ...certForm, issued_date: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="stat-label block mb-2">Expiry Date</label>
                  <input type="date" value={certForm.expiry_date} onChange={(e) => setCertForm({ ...certForm, expiry_date: e.target.value })}
                    className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" />
                </div>
              </div>
              <div>
                <label className="stat-label block mb-2">Notes</label>
                <input type="text" value={certForm.notes} onChange={(e) => setCertForm({ ...certForm, notes: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="Optional notes..." />
              </div>
              <button type="submit" disabled={createCertification.isPending || updateCertification.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                {(createCertification.isPending || updateCertification.isPending) ? "Saving..." : editingCert ? "Update" : "Add Certification"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Assignment Form Modal */}
      {assignFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80" onClick={() => { setAssignFormOpen(false); setEditingAssign(null); }}>
          <div className="surface border border-border w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h2 className="font-mono text-sm font-medium text-foreground">{editingAssign ? "Edit Assignment" : "Assign Skill"}</h2>
              <button onClick={() => { setAssignFormOpen(false); setEditingAssign(null); }} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); upsertAssignment.mutate(); }} className="p-6 space-y-4">
              {!editingAssign && (
                <>
                  <div>
                    <label className="stat-label block mb-2">Team Member *</label>
                    <select value={assignForm.user_id} onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })} required
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                      <option value="">Select...</option>
                      {orgMembers.map((m: any) => <option key={m.user_id} value={m.user_id}>{(m.profiles as any)?.full_name || "Unnamed"}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="stat-label block mb-2">Skill *</label>
                    <select value={assignForm.skill_id} onChange={(e) => setAssignForm({ ...assignForm, skill_id: e.target.value })} required
                      className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                      <option value="">Select...</option>
                      {skills.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className="stat-label block mb-2">Proficiency Level</label>
                <select value={assignForm.proficiency_level} onChange={(e) => setAssignForm({ ...assignForm, proficiency_level: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary">
                  {PROFICIENCY_LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="stat-label block mb-2">Notes</label>
                <input type="text" value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                  className="w-full bg-background border border-border px-3 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary" placeholder="Optional notes..." />
              </div>
              <button type="submit" disabled={upsertAssignment.isPending}
                className="w-full h-10 bg-primary text-primary-foreground font-mono text-sm tracking-wide hover:opacity-90 disabled:opacity-50">
                {upsertAssignment.isPending ? "Saving..." : editingAssign ? "Update" : "Assign Skill"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Error state */}
      {skillsError && (
        <div className="surface border border-destructive/30 p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <p className="font-mono text-xs text-destructive">Failed to load data.</p>
        </div>
      )}

      {/* ═══ TAB CONTENT ═══ */}

      {/* Skills Tab */}
      {tab === "skills" && (
        isLoading ? loadingIndicator : skills.length === 0 ? (
          <div className="surface border border-border p-8 text-center font-mono text-sm text-muted-foreground">
            No skills defined yet. Add skills to assign them to team members and projects.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border">
            {skills.map((s: any) => (
              <div key={s.id} className="surface p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-mono text-sm font-medium text-foreground">{s.name}</h3>
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(s)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteSkill(s)}
                        className="text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                {s.description && <p className="text-xs text-muted-foreground mb-3">{s.description}</p>}
                <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {skillAssigneeCount[s.id] || 0} assigned
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {skillProjectCount[s.id] || 0} projects
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Assignments Tab */}
      {tab === "assignments" && (
        assignmentsLoading ? loadingIndicator : userSkills.length === 0 ? (
          <div className="surface border border-border p-8 text-center">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-mono text-sm text-muted-foreground">No skill assignments yet. Assign skills to team members to track proficiency.</p>
          </div>
        ) : (
          <div className="surface border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left stat-label">Member</th>
                  <th className="px-6 py-3 text-left stat-label">Skill</th>
                  <th className="px-6 py-3 text-left stat-label">Proficiency</th>
                  <th className="px-6 py-3 text-left stat-label">Verified</th>
                  <th className="px-6 py-3 text-left stat-label">Notes</th>
                  <th className="px-6 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {userSkills.map((us: any) => (
                  <tr key={us.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{(us.profiles as any)?.full_name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{us.skills?.name || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs px-2 py-1 capitalize ${proficiencyColor[us.proficiency_level] || "text-muted-foreground bg-muted"}`}>
                        {us.proficiency_level}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {us.is_verified ? (
                        <span className="inline-flex items-center gap-1 font-mono text-xs text-success">
                          <CheckCircle2 className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-muted-foreground">Unverified</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground max-w-[200px] truncate">{us.notes || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canManage && !us.is_verified && (
                          <button onClick={() => verifyAssignment.mutate(us.id)} title="Verify skill"
                            className="text-muted-foreground hover:text-success transition-colors">
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => {
                            setEditingAssign(us);
                            setAssignForm({
                              user_id: us.user_id,
                              skill_id: us.skill_id,
                              proficiency_level: us.proficiency_level,
                              notes: us.notes || "",
                            });
                            setAssignFormOpen(true);
                          }} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => {
                            confirm({
                              title: "Remove assignment?",
                              description: "This will remove the skill assignment from this team member.",
                              confirmLabel: "Remove",
                              variant: "destructive",
                              onConfirm: () => deleteAssignment.mutateAsync(us.id),
                            });
                          }}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Certifications Tab */}
      {tab === "certifications" && (
        certsLoading ? loadingIndicator : certifications.length === 0 ? (
          <div className="surface border border-border p-8 text-center">
            <Award className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="font-mono text-sm text-muted-foreground">No certifications recorded yet.</p>
          </div>
        ) : (
          <div className="surface border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-6 py-3 text-left stat-label">Member</th>
                  <th className="px-6 py-3 text-left stat-label">Skill</th>
                  <th className="px-6 py-3 text-left stat-label">Cert #</th>
                  <th className="px-6 py-3 text-left stat-label">Issued</th>
                  <th className="px-6 py-3 text-left stat-label">Expiry</th>
                  <th className="px-6 py-3 text-left stat-label">Status</th>
                  <th className="px-6 py-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {certifications.map((c: any) => (
                  <tr key={c.id} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground">{(c.profiles as any)?.full_name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-foreground">{c.skills?.name || "—"}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.certification_number || "—"}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.issued_date || "—"}</td>
                    <td className="px-6 py-4 font-mono text-xs text-muted-foreground">{c.expiry_date || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`font-mono text-xs px-2 py-1 ${certStatusColor(c)}`}>
                        {certStatusLabel(c)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <button onClick={() => {
                            setEditingCert(c);
                            setCertUserId(c.user_id);
                            setCertForm({
                              skill_id: c.skill_id, certification_number: c.certification_number || "",
                              issued_date: c.issued_date || "", expiry_date: c.expiry_date || "", notes: c.notes || "",
                            });
                            setCertFormOpen(true);
                          }} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && (
                          <button onClick={() => {
                            confirm({
                              title: "Remove certification?",
                              description: "This will permanently delete this certification record.",
                              confirmLabel: "Remove",
                              variant: "destructive",
                              onConfirm: async () => { await deleteCertification.mutateAsync({ id: c.id, name: c.certification_number || "cert" }); },
                            });
                          }}
                            className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Currency Tab */}
      {tab === "currency" && <PilotCurrencyPanel />}

      {/* Utilization Tab */}
      {tab === "utilization" && <PilotUtilizationTab orgMembers={orgMembers} />}

      {/* Alerts Tab */}
      {tab === "alerts" && (
        expiringCerts.length === 0 ? (
          <div className="surface border border-border p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-success mx-auto mb-3" />
            <p className="font-mono text-sm text-muted-foreground">All certifications are up to date. No alerts.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {expiringCerts.map((c: any) => {
              const exp = new Date(c.expiry_date);
              const now = new Date();
              const days = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              const isExpired = days < 0;
              return (
                <div key={c.id} className={`surface border-l-2 p-5 flex items-center justify-between ${isExpired ? "border-l-destructive" : "border-l-warning"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 flex items-center justify-center ${isExpired ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                      {isExpired ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-mono text-sm text-foreground">
                        {(c.profiles as any)?.full_name || "Unknown"} — {c.skills?.name || "Unknown Skill"}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground mt-0.5">
                        {c.certification_number ? `#${c.certification_number} · ` : ""}
                        {isExpired ? `Expired ${Math.abs(days)} days ago` : `Expires in ${days} days`}
                        {" · "}{c.expiry_date}
                      </p>
                    </div>
                  </div>
                  <span className={`font-mono text-xs px-2 py-1 ${isExpired ? "text-destructive bg-destructive/10" : "text-warning bg-warning/10"}`}>
                    {isExpired ? "EXPIRED" : "EXPIRING"}
                  </span>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
};

export default Skills;

function PilotUtilizationTab({ orgMembers }: { orgMembers: any[] }) {
  const { pilots, hasData } = usePilotUtilization();

  const getName = (userId: string) => {
    const member = orgMembers.find((m: any) => m.user_id === userId);
    return (member?.profiles as any)?.full_name || "Unknown";
  };

  if (!hasData) {
    return (
      <div className="surface border border-border p-8 text-center">
        <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
        <p className="font-mono text-sm text-muted-foreground">No flight log data available yet.</p>
        <p className="font-mono text-xs text-muted-foreground mt-1">Pilot utilization will appear here once flight logs are recorded.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border mb-6">
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Active Pilots</p>
          <p className="font-mono text-lg text-foreground">{pilots.length}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Flight Hours</p>
          <p className="font-mono text-lg text-foreground">{pilots.reduce((s, p) => s + p.totalFlightHours, 0).toFixed(1)}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">30d Flights</p>
          <p className="font-mono text-lg text-primary">{pilots.reduce((s, p) => s + p.last30DaysFlights, 0)}</p>
        </div>
        <div className="bg-card p-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-1">30d Hours</p>
          <p className="font-mono text-lg text-primary">{pilots.reduce((s, p) => s + p.last30DaysHours, 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Pilot table */}
      <div className="surface border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Pilot</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Flights</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Hours</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Missions</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Completed</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-primary">30d Flights</th>
              <th className="px-4 py-3 text-right font-mono text-[10px] uppercase tracking-widest text-primary">30d Hours</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pilots.map(p => (
              <tr key={p.userId} className="hover:bg-secondary/30 transition-colors">
                <td className="px-4 py-3 font-mono text-sm text-foreground">{getName(p.userId)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-foreground">{p.totalFlights}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-foreground">{p.totalFlightHours.toFixed(1)}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-muted-foreground">{p.missionsFlown}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-success">{p.completedFlights}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-primary">{p.last30DaysFlights}</td>
                <td className="px-4 py-3 text-right font-mono text-xs text-primary">{p.last30DaysHours.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
