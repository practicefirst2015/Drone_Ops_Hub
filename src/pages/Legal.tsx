import { Link, useLocation } from "react-router-dom";
import { Plane, ArrowLeft } from "lucide-react";

/**
 * Privacy Policy and Terms of Service.
 *
 * IMPORTANT: this is a good-faith starting draft written to cover the data
 * flows this application actually has (see the subprocessor list below). It is
 * not legal advice and has not been reviewed by a lawyer. Have counsel review
 * it before taking payment from customers, particularly if you serve EU/UK
 * users or handle any regulated inspection data.
 */

const COMPANY = "Airframe";
const CONTACT_EMAIL = "support@example.com"; // TODO: replace with a real monitored inbox
const EFFECTIVE = "28 July 2026";

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 border border-primary flex items-center justify-center shrink-0">
              <Plane className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-widest uppercase truncate">{COMPANY}</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10">
        <h1 className="text-2xl font-semibold tracking-tight mb-1">{title}</h1>
        <p className="font-mono text-xs text-muted-foreground mb-8">Effective {EFFECTIVE}</p>
        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed [&_h2]:text-foreground [&_h2]:font-mono [&_h2]:text-sm [&_h2]:mt-8 [&_h2]:mb-2 [&_strong]:text-foreground [&_a]:underline">
          {children}
        </div>
        <p className="mt-12 pt-6 border-t border-border text-xs text-muted-foreground">
          Questions? <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>
          {" · "}
          <Link to={title.startsWith("Privacy") ? "/terms" : "/privacy"} className="underline">
            {title.startsWith("Privacy") ? "Terms of Service" : "Privacy Policy"}
          </Link>
        </p>
      </main>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <Shell title="Privacy Policy">
      <p>
        {COMPANY} ("we") provides drone operations management software. This policy explains what we
        collect, why, and what control you have. We sell nothing to advertisers and run no ad tracking.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>Account data:</strong> your name, email address, and password (stored hashed — we never
        see it). <strong>Operational data you enter:</strong> clients, projects, missions, flight logs,
        aircraft, certifications, invoices, and any files you upload.{" "}
        <strong>Voice recordings:</strong> if you use dictation, audio is sent for transcription and is
        not retained by us afterward. <strong>Technical data:</strong> error reports and usage counters
        used to keep the service running and to enforce fair-use limits.
      </p>

      <h2>Why we process it</h2>
      <p>
        To provide the service you signed up for (contract), to keep it secure and prevent abuse
        (legitimate interest), and to meet legal obligations. We do not sell personal information, and
        we do not use your operational data to train AI models.
      </p>

      <h2>Who else processes your data</h2>
      <p>Our subprocessors, each acting on our instructions:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Supabase</strong> — database, authentication, file storage (United States)</li>
        <li><strong>Vercel</strong> — application hosting and delivery</li>
        <li><strong>OpenAI</strong> — voice transcription and form-filling, when you use dictation. Sent audio and text are not used to train their models under their API terms.</li>
        <li><strong>Resend</strong> — delivery of invoice emails you choose to send</li>
        <li><strong>OpenWeather</strong> — weather for flight locations you enter</li>
        <li><strong>OpenStreetMap (Nominatim)</strong> — converting addresses you type into coordinates</li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        Your data stays while your account is active. When you delete your account we remove your
        profile, memberships, and any organisation where you were the only member, together with that
        organisation's records and files. Backups roll off within 30 days. Error logs and usage
        counters are pruned within 7 days.
      </p>

      <h2>Your rights</h2>
      <p>
        You can <strong>export</strong> all of your data as JSON and <strong>delete</strong> your
        account at any time from <strong>Settings → Account</strong> — no email required, no waiting.
        Depending on where you live you may also have rights to correction, restriction, objection, or
        to complain to a supervisory authority. Contact us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>Shared organisation data</h2>
      <p>
        This is collaborative software. Records you create inside an organisation are visible to other
        members of that organisation according to their role, and remain with the organisation if you
        leave. Client-portal users see only their own client's projects, and only the categories the
        organisation has enabled.
      </p>

      <h2>Security</h2>
      <p>
        All traffic is encrypted in transit. Data access is enforced at the database level by
        row-level security, not just in the interface. Files are stored privately and served through
        short-lived signed links. No system is perfectly secure, but we treat access control as the
        foundation rather than an afterthought.
      </p>

      <h2>Children</h2>
      <p>The service is for business use and is not directed at anyone under 16.</p>

      <h2>Changes</h2>
      <p>
        We'll update the effective date above for minor changes and notify account owners by email for
        material ones.
      </p>
    </Shell>
  );
}

export function TermsOfService() {
  return (
    <Shell title="Terms of Service">
      <p>
        These terms govern your use of {COMPANY}. By creating an account you agree to them. If you're
        agreeing on behalf of a company, you confirm you have authority to do so.
      </p>

      <h2>The service</h2>
      <p>
        {COMPANY} is software for planning drone missions and recording flight operations. We provide
        the tool; you remain responsible for how you operate.
      </p>

      <h2 className="text-destructive">Operational responsibility — read this one</h2>
      <p>
        <strong>
          {COMPANY} is a record-keeping and planning aid, not an authority on flight safety or
          regulatory compliance.
        </strong>{" "}
        Weather data, airspace notes, go/no-go indicators, aircraft specifications, and checklists are
        provided for convenience and may be incomplete, delayed, or wrong. Aircraft specifications in
        the catalog are curated approximations — always verify against the manufacturer's datasheet.
        You are solely responsible for complying with all applicable aviation regulations (including
        FAA Part 107 or your local equivalent), for verifying airspace authorisation, and for the safe
        conduct of every flight. Never make a flight decision on the basis of this software alone.
      </p>

      <h2>Your account</h2>
      <p>
        Keep your credentials secure and tell us promptly about unauthorised access. You're responsible
        for activity under your account and for the accuracy of what you record — particularly where
        those records serve a compliance purpose.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don't break the law, infringe others' rights, upload malware, attempt to breach access
        controls, scrape the service, resell it without permission, or abuse automated features to
        generate disproportionate cost. We apply fair-use limits to AI features and may adjust them.
      </p>

      <h2>Your data</h2>
      <p>
        You own what you put in. You grant us only the licence needed to host and display it back to
        you and your organisation. We may use aggregated, anonymised statistics to improve the
        service — industry benchmarking is opt-in per organisation and off by default.
      </p>

      <h2>Availability</h2>
      <p>
        We aim for high availability but do not currently offer a contractual uptime guarantee. The
        service is provided "as is" without warranties of any kind. Maintenance and third-party
        outages can interrupt access.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, {COMPANY} is not liable for indirect, incidental, or
        consequential damages, for lost profits, or for any loss arising from flight operations,
        equipment damage, injury, or regulatory action. Our total liability is limited to the amount
        you paid us in the twelve months before the claim.
      </p>

      <h2>Termination</h2>
      <p>
        You can stop and delete your account at any time from Settings → Account. We may suspend
        accounts that violate these terms, and will give notice where practical.
      </p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </Shell>
  );
}

/** Route wrapper so both documents can share one lazy chunk. */
export default function Legal() {
  const { pathname } = useLocation();
  return pathname.startsWith("/terms") ? <TermsOfService /> : <PrivacyPolicy />;
}
