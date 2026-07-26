import { Outlet, Link, useLocation } from "react-router-dom";
import { useOrg } from "@/contexts/OrgContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  LogOut,
  Plane,
} from "lucide-react";

const portalNav = [
  { title: "Dashboard", url: "/portal", icon: LayoutDashboard, end: true },
  { title: "Projects", url: "/portal/projects", icon: FolderKanban },
  { title: "Invoices", url: "/portal/invoices", icon: FileText },
];

export function PortalLayout() {
  const { currentOrg } = useOrg();
  const { signOut, user } = useAuth();
  const location = useLocation();

  const isActive = (url: string, end?: boolean) => {
    if (end) return location.pathname === url;
    return location.pathname.startsWith(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top navigation bar */}
      <header className="h-14 border-b border-border bg-card/50 flex items-center justify-between px-6">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-primary flex items-center justify-center">
              <Plane className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="font-mono text-xs font-semibold tracking-widest uppercase text-foreground">
              {currentOrg?.name || "PORTAL"}
            </span>
          </div>
          <nav className="flex items-center gap-1 ml-4">
            {portalNav.map((item) => (
              <Link
                key={item.url}
                to={item.url}
                className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-xs transition-colors ${
                  isActive(item.url, item.end)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className="w-3.5 h-3.5" />
                {item.title}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-[10px] px-2 py-0.5 border border-border text-muted-foreground uppercase tracking-wider">
            client
          </span>
          <span className="font-mono text-xs text-muted-foreground">
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
