import { useMemo } from "react";
import { useProjectSkills, useProjectMembers } from "@/hooks/useProjectData";
import { useOrg } from "@/contexts/OrgContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Users, Award, TrendingUp } from "lucide-react";

interface SkillGapAnalysisProps {
  projectId: string;
}

export function SkillGapAnalysis({ projectId }: SkillGapAnalysisProps) {
  const { currentOrg } = useOrg();
  const { skills: projectSkills } = useProjectSkills(projectId);
  const { members: projectMembers } = useProjectMembers(projectId);

  const memberIds = useMemo(
    () => (projectMembers.data || []).map((m: any) => m.user_id),
    [projectMembers.data]
  );

  // Fetch user_skills for all project members
  const { data: memberSkills = [] } = useQuery({
    queryKey: ["member_skills_for_gap", projectId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("user_skills")
        .select("*, skills(id, name)")
        .eq("organization_id", currentOrg!.id)
        .in("user_id", memberIds);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && memberIds.length > 0,
  });

  // Fetch certifications for all project members
  const { data: memberCerts = [] } = useQuery({
    queryKey: ["member_certs_for_gap", projectId, memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("certifications")
        .select("*, skills(id, name), profiles:user_id(full_name)")
        .eq("organization_id", currentOrg!.id)
        .in("user_id", memberIds);
      if (error) throw error;
      return data;
    },
    enabled: !!currentOrg && memberIds.length > 0,
  });

  // Fetch profiles for member names
  const { data: memberProfiles = [] } = useQuery({
    queryKey: ["member_profiles_gap", memberIds],
    queryFn: async () => {
      if (memberIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", memberIds);
      if (error) throw error;
      return data;
    },
    enabled: memberIds.length > 0,
  });

  const analysis = useMemo(() => {
    const requiredSkills = (projectSkills.data || []).map((ps: any) => ({
      id: ps.skill_id,
      name: ps.skills?.name || "Unknown",
    }));

    const profileMap = Object.fromEntries(
      (memberProfiles as any[]).map((p) => [p.id, p.full_name || "Unknown"])
    );

    // Map: skill_id → list of members who have it
    const skillCoverage: Record<string, { userId: string; name: string; level: string; verified: boolean }[]> = {};
    for (const us of memberSkills as any[]) {
      const sid = us.skill_id;
      if (!skillCoverage[sid]) skillCoverage[sid] = [];
      skillCoverage[sid].push({
        userId: us.user_id,
        name: profileMap[us.user_id] || "Unknown",
        level: us.proficiency_level,
        verified: us.is_verified,
      });
    }

    // Map: skill_id → list of members with certs
    const certCoverage: Record<string, { userId: string; name: string; status: string; expiry: string | null }[]> = {};
    for (const c of memberCerts as any[]) {
      const sid = c.skill_id;
      if (!certCoverage[sid]) certCoverage[sid] = [];
      const now = new Date();
      const exp = c.expiry_date ? new Date(c.expiry_date) : null;
      const status = !exp ? "no_expiry" : exp < now ? "expired" : "valid";
      certCoverage[sid].push({
        userId: c.user_id,
        name: (c.profiles as any)?.full_name || profileMap[c.user_id] || "Unknown",
        status,
        expiry: c.expiry_date,
      });
    }

    const skillAnalysis = requiredSkills.map((skill) => {
      const covered = skillCoverage[skill.id] || [];
      const certs = certCoverage[skill.id] || [];
      const hasSkill = covered.length > 0;
      const hasVerified = covered.some((c) => c.verified);
      const hasCert = certs.some((c) => c.status === "valid" || c.status === "no_expiry");
      const hasExpiredCert = certs.some((c) => c.status === "expired");

      let readiness: "ready" | "partial" | "missing" = "missing";
      if (hasSkill && (hasCert || certs.length === 0)) readiness = "ready";
      else if (hasSkill || hasCert) readiness = "partial";

      return {
        ...skill,
        readiness,
        coveredBy: covered,
        certifiedBy: certs,
        hasVerified,
        hasExpiredCert: hasExpiredCert && !hasCert,
      };
    });

    const totalRequired = skillAnalysis.length;
    const readyCount = skillAnalysis.filter((s) => s.readiness === "ready").length;
    const partialCount = skillAnalysis.filter((s) => s.readiness === "partial").length;
    const missingCount = skillAnalysis.filter((s) => s.readiness === "missing").length;
    const readinessPercent = totalRequired > 0 ? Math.round((readyCount / totalRequired) * 100) : 0;

    return { skillAnalysis, totalRequired, readyCount, partialCount, missingCount, readinessPercent, memberCount: memberIds.length };
  }, [projectSkills.data, memberSkills, memberCerts, memberProfiles, memberIds]);

  const readinessColor = analysis.readinessPercent === 100
    ? "text-success"
    : analysis.readinessPercent >= 50
    ? "text-warning"
    : "text-destructive";

  const statusIcon = (readiness: string) => {
    switch (readiness) {
      case "ready": return <CheckCircle2 className="w-4 h-4 text-success" />;
      case "partial": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "missing": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  const levelBadge = (level: string) => {
    const colors: Record<string, string> = {
      beginner: "text-muted-foreground bg-muted",
      intermediate: "text-primary bg-primary/10",
      advanced: "text-success bg-success/10",
      expert: "text-warning bg-warning/10",
    };
    return colors[level] || "text-muted-foreground bg-muted";
  };

  if (analysis.totalRequired === 0 && analysis.memberCount === 0) {
    return (
      <div className="surface border border-border p-8 text-center">
        <TrendingUp className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
        <p className="font-mono text-sm text-muted-foreground">Add required skills and team members to see readiness analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Readiness Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-border">
        <div className="surface p-5">
          <p className="stat-label">Readiness</p>
          <p className={`stat-value mt-1 ${readinessColor}`}>{analysis.readinessPercent}%</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Required</p>
          <p className="stat-value mt-1">{analysis.totalRequired}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Covered</p>
          <p className="stat-value mt-1 text-success">{analysis.readyCount}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Partial</p>
          <p className="stat-value mt-1 text-warning">{analysis.partialCount}</p>
        </div>
        <div className="surface p-5">
          <p className="stat-label">Missing</p>
          <p className="stat-value mt-1 text-destructive">{analysis.missingCount}</p>
        </div>
      </div>

      {/* Readiness Bar */}
      {analysis.totalRequired > 0 && (
        <div className="surface border border-border p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Skill Coverage</p>
            <p className="font-mono text-xs text-muted-foreground">{analysis.readyCount}/{analysis.totalRequired} skills covered</p>
          </div>
          <div className="h-2 bg-muted overflow-hidden flex">
            {analysis.readyCount > 0 && (
              <div className="bg-success h-full transition-all" style={{ width: `${(analysis.readyCount / analysis.totalRequired) * 100}%` }} />
            )}
            {analysis.partialCount > 0 && (
              <div className="bg-warning h-full transition-all" style={{ width: `${(analysis.partialCount / analysis.totalRequired) * 100}%` }} />
            )}
            {analysis.missingCount > 0 && (
              <div className="bg-destructive/30 h-full transition-all" style={{ width: `${(analysis.missingCount / analysis.totalRequired) * 100}%` }} />
            )}
          </div>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><span className="w-2 h-2 bg-success inline-block" /> Covered</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><span className="w-2 h-2 bg-warning inline-block" /> Partial</span>
            <span className="flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"><span className="w-2 h-2 bg-destructive/30 inline-block" /> Missing</span>
          </div>
        </div>
      )}

      {/* Detailed Breakdown */}
      <div>
        <p className="section-title">Skill-by-Skill Analysis</p>
        <div className="surface border border-border divide-y divide-border">
          {analysis.skillAnalysis.length === 0 ? (
            <p className="px-6 py-8 text-center font-mono text-sm text-muted-foreground">No required skills defined for this project.</p>
          ) : (
            analysis.skillAnalysis.map((skill) => (
              <div key={skill.id} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {statusIcon(skill.readiness)}
                    <span className="font-mono text-sm font-medium text-foreground">{skill.name}</span>
                  </div>
                  <span className={`font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider ${
                    skill.readiness === "ready" ? "text-success bg-success/10" :
                    skill.readiness === "partial" ? "text-warning bg-warning/10" :
                    "text-destructive bg-destructive/10"
                  }`}>
                    {skill.readiness}
                  </span>
                </div>

                {/* Team members with this skill */}
                {skill.coveredBy.length > 0 ? (
                  <div className="ml-6 space-y-1">
                    {skill.coveredBy.map((member, i) => (
                      <div key={i} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span className="text-foreground">{member.name}</span>
                        <span className={`px-1.5 py-0.5 ${levelBadge(member.level)}`}>{member.level}</span>
                        {member.verified && <ShieldCheck className="w-3 h-3 text-success" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="ml-6 font-mono text-xs text-destructive/70">No team member has this skill</p>
                )}

                {/* Certification status */}
                {skill.certifiedBy.length > 0 && (
                  <div className="ml-6 mt-1.5 space-y-1">
                    {skill.certifiedBy.map((cert, i) => (
                      <div key={i} className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                        <Award className="w-3 h-3" />
                        <span className="text-foreground">{cert.name}</span>
                        <span className={`px-1.5 py-0.5 ${
                          cert.status === "expired" ? "text-destructive bg-destructive/10" : "text-success bg-success/10"
                        }`}>
                          {cert.status === "expired" ? "Expired" : "Certified"}
                        </span>
                        {cert.expiry && (
                          <span className="text-muted-foreground">exp. {cert.expiry}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {skill.hasExpiredCert && (
                  <p className="ml-6 mt-1 font-mono text-xs text-destructive/70 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Certification expired — renewal needed
                  </p>
                )}

                {skill.coveredBy.length === 0 && skill.certifiedBy.length === 0 && (
                  <p className="ml-6 mt-1 font-mono text-xs text-muted-foreground italic">
                    → Assign a qualified team member to resolve this gap
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recommendations placeholder */}
      <div className="surface border border-border border-dashed p-6">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <p className="font-mono text-sm font-medium text-muted-foreground">Assignment Recommendations</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Automated skill-matching recommendations will suggest the best-qualified team members to fill identified gaps based on proficiency levels, certifications, and availability.
        </p>
      </div>
    </div>
  );
}
