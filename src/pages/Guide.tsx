import {
  Users,
  FolderKanban,
  Crosshair,
  Radio,
  ClipboardList,
  FileText,
  BarChart3,
  Plane,
  Award,
  SlidersHorizontal,
  Map,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { Link } from "react-router-dom";

const lifecycle = [
  { icon: Users, label: "Client", to: "/clients" },
  { icon: FolderKanban, label: "Project", to: "/projects" },
  { icon: Crosshair, label: "Mission", to: "/missions" },
  { icon: Radio, label: "Fly", to: "/field" },
  { icon: ClipboardList, label: "Flight Log", to: "/flight-logs" },
  { icon: FileText, label: "Invoice", to: "/invoices" },
  { icon: BarChart3, label: "Analytics", to: "/analytics" },
];

const setupSteps = [
  { page: "Settings → Organization", text: "Set your company profile, default tax rate, payment terms, and invoice notes so every invoice starts pre-filled." },
  { page: "Settings → Team", text: "Invite teammates and assign roles: owner/admin run the business, managers plan work, pilots fly and log, viewers are client-portal accounts." },
  { page: "Drones → Model Catalog", text: "Your catalog ships pre-loaded with 22 commercial aircraft (specs + 3D preview). Add your actual aircraft under Fleet, linked to a catalog model, so utilization and maintenance track per airframe." },
  { page: "Drones → Batteries", text: "Register batteries with capacity and cycle counts — health tracking flags packs that need retirement." },
  { page: "Skills & Certifications", text: "Define the skills your operations need (Part 107, thermal, mapping…) and record each pilot's certs with expiry dates. Alerts warn before anything lapses." },
  { page: "Settings → Categories & Alerts", text: "Create project categories for reporting, and tune alert thresholds (cert expiry days, maintenance %, stale issues)." },
  { page: "Settings → Integrations", text: "Add your OpenWeather API key for live flight-weather checks. Email sending for invoices is already configured server-side." },
];

const coreFlow = [
  {
    n: 1, title: "Add the client", icon: Users, to: "/clients",
    text: "Every engagement starts with a client record — name, contact, email. The contact email is where invoices get sent, and it's what links a client-portal login to their data.",
  },
  {
    n: 2, title: "Create the project", icon: FolderKanban, to: "/projects",
    text: "A project is the container for one engagement: link the client, set budget, dates, and priority. Use the address search to drop the site location — that powers the map pin, flight-zone radius, and weather.",
    tip: "One project per site or contract. Multiple visits to the same site = multiple missions inside one project.",
  },
  {
    n: 3, title: "Plan the mission", icon: Crosshair, to: "/missions",
    text: "Inside the project, create a mission for each flight day: objective, date, launch location, assigned operators, drones from your fleet, and required skills. Run the preflight checklist, check live weather, and set the Go/No-Go status.",
    tip: "Generate the Mission Brief before flight day — it snapshots the plan, checklist state, and crew into a shareable document.",
  },
  {
    n: 4, title: "Fly with Field Mode", icon: Radio, to: "/field",
    text: "On site, open Field Mode on your phone — a stripped-down, glove-friendly view with the checklist, weather, and mission details. It works offline and syncs when you're back on signal.",
  },
  {
    n: 5, title: "Log the flight", icon: ClipboardList, to: "/flight-logs",
    text: "Right after landing (or back at the office), create the flight log: duration, outcome, crew, weather actually encountered, any incidents or issues, and which deliverables were captured. Then generate the Post-Flight Report.",
    tip: "Log issues honestly — the issue tracker feeds maintenance and the analytics that make you better over time.",
  },
  {
    n: 6, title: "Deliver and invoice", icon: FileText, to: "/invoices",
    text: "Attach deliverables (imagery, reports, maps) to the project, then create the invoice: line items, tax and discounts auto-calculate from your defaults. Generate the PDF and hit Send — it emails the client directly and flips the status from draft to issued.",
    tip: "First send moves a draft to issued automatically and stamps the issue date.",
  },
  {
    n: 7, title: "Review in Analytics", icon: BarChart3, to: "/analytics",
    text: "Flight hours, mission success rate, fleet utilization, revenue — check monthly to spot which work pays and which aircraft earn their keep.",
  },
];

const housekeeping = [
  { icon: Plane, title: "Maintenance", text: "Set service intervals per aircraft (hours or missions). The dashboard warns as drones approach service; log each maintenance event to reset the clock." },
  { icon: Award, title: "Certifications", text: "Watch for expiry alerts — a lapsed Part 107 grounds a pilot. Renewals take a minute to record." },
  { icon: Map, title: "Airspace map", text: "The map shows every project site and mission in one view — use it to plan routing and spot geographic clusters worth batching into one trip." },
  { icon: SlidersHorizontal, title: "Client visibility", text: "In Settings → Client Visibility choose what portal clients can see: invoices and deliverables (default on), flight logs and mission status (default off)." },
];

export default function Guide() {
  return (
    <div className="p-6 md:p-8 max-w-5xl">
      <p className="stat-label mb-1">Playbook</p>
      <h1 className="text-2xl font-semibold tracking-tight mb-2">How to Use This App</h1>
      <p className="text-sm text-muted-foreground mb-8 max-w-3xl">
        Airframe runs your drone operation end to end. This page is the recommended way to work —
        follow the loop below and nothing falls through the cracks.
      </p>

      {/* Lifecycle */}
      <p className="section-title mb-3">The Operating Loop</p>
      <div className="surface border border-border p-4 mb-10 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {lifecycle.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <Link to={s.to} className="flex flex-col items-center gap-1.5 px-3 py-2 border border-border hover:border-foreground/40 transition-colors">
                <s.icon className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-[11px]">{s.label}</span>
              </Link>
              {i < lifecycle.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* One-time setup */}
      <p className="section-title mb-3">One-Time Setup (do this first)</p>
      <div className="surface border border-border divide-y divide-border mb-10">
        {setupSteps.map((s) => (
          <div key={s.page} className="p-4 flex gap-3">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-mono text-xs text-foreground mb-1">{s.page}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Core workflow */}
      <p className="section-title mb-3">The Core Workflow — Client to Cash</p>
      <div className="space-y-3 mb-10">
        {coreFlow.map((s) => (
          <div key={s.n} className="surface border border-border p-4">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 shrink-0 border border-border flex items-center justify-center font-mono text-sm text-muted-foreground">
                {s.n}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5">
                  <s.icon className="w-4 h-4 text-muted-foreground" />
                  <Link to={s.to} className="font-mono text-sm text-foreground hover:underline">{s.title}</Link>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
                {s.tip && (
                  <div className="flex gap-2 mt-2 p-2 bg-muted/40 border-l-2 border-border">
                    <Lightbulb className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{s.tip}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Housekeeping */}
      <p className="section-title mb-3">Keep It Healthy — Weekly Habits</p>
      <div className="grid md:grid-cols-2 gap-3 mb-10">
        {housekeeping.map((h) => (
          <div key={h.title} className="surface border border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <h.icon className="w-4 h-4 text-muted-foreground" />
              <p className="font-mono text-xs text-foreground">{h.title}</p>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{h.text}</p>
          </div>
        ))}
      </div>

      {/* Roles */}
      <p className="section-title mb-3">Who Does What</p>
      <div className="surface border border-border mb-10 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Role</th>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Best for</th>
              <th className="text-left p-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Can</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-muted-foreground">
            <tr><td className="p-3 font-mono text-foreground">Owner / Admin</td><td className="p-3">You</td><td className="p-3">Everything — settings, team, billing, deletes</td></tr>
            <tr><td className="p-3 font-mono text-foreground">Manager</td><td className="p-3">Ops lead</td><td className="p-3">Clients, projects, missions, invoices, fleet</td></tr>
            <tr><td className="p-3 font-mono text-foreground">Pilot</td><td className="p-3">Flight crew</td><td className="p-3">Assigned tasks, own flight logs, own skills/certs, checklists</td></tr>
            <tr><td className="p-3 font-mono text-foreground">Viewer</td><td className="p-3">Clients</td><td className="p-3">Client portal only — their own projects, invoices, deliverables</td></tr>
          </tbody>
        </table>
      </div>

      {/* Golden rules */}
      <p className="section-title mb-3">Golden Rules</p>
      <div className="surface border border-border p-4 mb-8">
        <ul className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <li className="flex gap-2"><span className="font-mono text-foreground shrink-0">01</span> Never fly without a mission — if it's not planned here, weather, checklists, and reporting can't protect you.</li>
          <li className="flex gap-2"><span className="font-mono text-foreground shrink-0">02</span> Log the flight the same day — memory fades, and the log feeds maintenance, billing, and analytics.</li>
          <li className="flex gap-2"><span className="font-mono text-foreground shrink-0">03</span> Catalog specs are curated approximations — always verify against the manufacturer datasheet before flight planning.</li>
          <li className="flex gap-2"><span className="font-mono text-foreground shrink-0">04</span> Send invoices from the app, not your inbox — status tracking, PDFs, and history only work when it happens here.</li>
          <li className="flex gap-2"><span className="font-mono text-foreground shrink-0">05</span> Check the dashboard alerts weekly — certs, maintenance, and stale issues surface there before they become problems.</li>
        </ul>
      </div>
    </div>
  );
}
