import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronDown, Search, Menu } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";

export function AppLayout() {
  const { currentOrg, organizations, setCurrentOrg } = useOrg();
  const { role } = useOrgRole();
  const { signOut, user } = useAuth();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Close the mobile drawer on navigation and lock body scroll while it's open.
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOrgMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      {/* Sidebar is an overlay drawer below md, so no left margin on mobile. */}
      <div className={`${collapsed ? "md:ml-[72px]" : "md:ml-[240px]"} min-h-screen transition-all duration-300 flex flex-col`}>
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between gap-2 px-3 md:px-6 bg-card/50">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden h-11 w-11 -ml-2 flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative min-w-0" ref={menuRef}>
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="flex items-center gap-2 font-mono text-sm text-foreground hover:text-primary transition-colors min-w-0"
            >
              <span className="truncate">{currentOrg?.name || "Select Organization"}</span>
              <ChevronDown className="w-3 h-3 shrink-0" />
            </button>
            {orgMenuOpen && organizations.length > 1 && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-card border border-border z-50">
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => { setCurrentOrg(org); setOrgMenuOpen(false); }}
                    className={`w-full text-left px-4 py-2 font-mono text-xs transition-colors ${
                      org.id === currentOrg?.id
                        ? "text-primary bg-secondary"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {org.name}
                    <span className="ml-2 text-muted-foreground">({org.role})</span>
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            <button
              onClick={() => setCmdOpen(true)}
              aria-label="Search"
              className="flex items-center gap-2 h-11 md:h-8 px-3 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="font-mono text-xs hidden sm:inline">Search…</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 border border-border bg-secondary hidden lg:inline">⌘K</kbd>
            </button>
            <NotificationCenter />
            <span className="font-mono text-[10px] px-2 py-0.5 border border-border text-muted-foreground uppercase tracking-wider hidden sm:inline">
              {role}
            </span>
            <span className="font-mono text-xs text-muted-foreground hidden lg:inline max-w-[200px] truncate">
              {user?.email}
            </span>
            <button
              onClick={signOut}
              className="h-11 w-11 md:h-auto md:w-auto flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
