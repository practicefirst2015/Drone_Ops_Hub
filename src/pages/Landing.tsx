import { Link } from "react-router-dom";
import {
  Plane,
  FolderKanban,
  Shield,
  FileText,
  Receipt,
  MapPin,
  ClipboardCheck,
  Wrench,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const features = [
  {
    icon: FolderKanban,
    title: "Projects & Tasks",
    desc: "Organize drone operations into structured projects with task boards, team assignments, and milestone tracking.",
  },
  {
    icon: Shield,
    title: "Mission Readiness",
    desc: "Preflight checklists, go/no-go decisions, airspace advisories, and crew certification verification — all in one view.",
  },
  {
    icon: FileText,
    title: "Flight Logging",
    desc: "Capture every sortie with structured logs, postflight debrief, incident reporting, and crew records.",
  },
  {
    icon: ClipboardCheck,
    title: "Deliverables Tracking",
    desc: "Track orthomosaics, LiDAR scans, thermal reports, and video deliverables from capture through client handoff.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Billing",
    desc: "Generate professional invoices tied to projects and clients with line items, tax, discounts, and PDF export.",
  },
  {
    icon: Wrench,
    title: "Fleet Management",
    desc: "Catalog drone models, track maintenance intervals, monitor flight hours, and compare platform capabilities.",
  },
  {
    icon: MapPin,
    title: "Geospatial Map View",
    desc: "Visualize mission locations, flight zones, and project sites on an interactive map with advisory overlays.",
  },
  {
    icon: CheckCircle2,
    title: "Compliance & Currency",
    desc: "Monitor pilot certifications, skill expirations, and regulatory compliance across your entire organization.",
  },
];

const workflow = [
  { step: 1, label: "Plan", desc: "Define projects, assign teams, set deliverables" },
  { step: 2, label: "Prepare", desc: "Run preflight checks, verify readiness, brief crew" },
  { step: 3, label: "Fly", desc: "Execute missions, log flights, capture data" },
  { step: 4, label: "Deliver", desc: "Process deliverables, invoice clients, close out" },
];

const metrics = [
  { value: "∞", label: "Projects" },
  { value: "∞", label: "Missions" },
  { value: "∞", label: "Flight Logs" },
  { value: "∞", label: "Deliverables" },
  { value: "∞", label: "Invoices" },
];

const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/landing" className="flex items-center gap-3">
            <div className="w-8 h-8 border border-primary flex items-center justify-center">
              <Plane className="w-4 h-4 text-primary" />
            </div>
            <span className="font-mono text-sm font-semibold tracking-widest uppercase">
              Airframe
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href="#features">Features</a>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <a href="#workflow">Workflow</a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative py-28 md:py-40 px-6">
        {/* Grid background */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Scan line */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-x-0 h-px bg-primary/20 animate-scan-line" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary mb-6">
            Drone Operations Intelligence
          </p>
          <h1 className="font-mono text-4xl md:text-6xl font-light tracking-tight leading-[1.1] mb-6">
            Command Every
            <br />
            <span className="glow-text-cyan text-primary">Mission</span> with
            Precision
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Plan projects, verify readiness, log flights, track deliverables,
            invoice clients, and stay compliant — all from a single operational
            hub built for professional drone teams.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Button size="lg" asChild>
              <a href="#demo">
                Request Demo <ArrowRight className="ml-1 w-4 h-4" />
              </a>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Metrics bar */}
      <section className="border-y border-border bg-card">
        <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-5">
          {metrics.map((m, i) => (
            <div
              key={i}
              className={`px-6 py-8 text-center ${i > 0 ? "border-l border-border" : ""}`}
            >
              <p className="stat-value text-2xl">{m.value}</p>
              <p className="stat-label mt-1">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="section-title text-center">Capabilities</p>
          <h2 className="font-mono text-3xl md:text-4xl font-light tracking-tight text-center mb-16">
            Everything Your Operation Needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-border">
            {features.map((f) => (
              <div
                key={f.title}
                className="surface p-6 group hover:border-glow transition-all duration-300"
              >
                <f.icon className="w-5 h-5 text-primary mb-4" />
                <h3 className="font-mono text-sm font-medium tracking-wide mb-2">
                  {f.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section id="workflow" className="py-24 px-6 border-y border-border bg-card">
        <div className="max-w-4xl mx-auto">
          <p className="section-title text-center">Operational Lifecycle</p>
          <h2 className="font-mono text-3xl md:text-4xl font-light tracking-tight text-center mb-16">
            From Planning to Delivery
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-0">
            {workflow.map((w, i) => (
              <div key={w.step} className="relative text-center px-4">
                {/* Connector line */}
                {i < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-5 left-[60%] w-[80%] h-px bg-border" />
                )}
                <div className="w-10 h-10 border border-primary flex items-center justify-center mx-auto mb-4 relative z-10 bg-card">
                  <span className="font-mono text-sm text-primary">{w.step}</span>
                </div>
                <h3 className="font-mono text-sm font-medium tracking-wide mb-1">
                  {w.label}
                </h3>
                <p className="text-xs text-muted-foreground">{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section id="demo" className="py-24 px-6">
        <div className="max-w-lg mx-auto text-center">
          <div className="surface border border-border p-10 glow-cyan">
            <h2 className="font-mono text-2xl font-light tracking-tight mb-2">
              See Airframe in Action
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              Enter your email to request a demo or create a free account to
              explore the platform.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = "/auth";
              }}
            >
              <Input
                type="email"
                placeholder="you@company.com"
                className="flex-1 font-mono text-sm"
              />
              <Button type="submit">Request Access</Button>
            </form>
            <p className="text-xs text-muted-foreground mt-6">
              Or{" "}
              <Link to="/auth" className="text-primary hover:underline">
                sign in
              </Link>{" "}
              if you already have an account.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Plane className="w-3 h-3 text-primary" />
            <span className="font-mono tracking-widest uppercase">Airframe</span>
          </div>
          <span>© {new Date().getFullYear()} All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
