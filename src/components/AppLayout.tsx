import { Outlet } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { useOrg } from "@/contexts/OrgContext";
import { useOrgRole } from "@/hooks/useOrgRole";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, ChevronDown, Search } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { CommandPalette } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";

export function AppLayout() {
  const { currentOrg, organizations, setCurrentOrg } = useOrg();
  const { role } = useOrgRole();
  const { signOut, user } = useAuth();
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
      <AppSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className={`${collapsed ? "ml-[72px]" : "ml-[240px]"} min-h-screen transition-all duration-300 flex flex-col`}>
        {/* Top bar */}
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50">
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setOrgMenuOpen(!orgMenuOpen)}
              className="flex items-center gap-2 font-mono text-sm text-foreground hover:text-primary transition-colors"
            >
              {currentOrg?.name || "Select Organization"}
              <ChevronDown className="w-3 h-3" />
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

          <div className="flex items-center gap-4">
            <button
              onClick={() => setCmdOpen(true)}
              className="flex items-center gap-2 h-8 px-3 border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="font-mono text-xs hidden sm:inline">Search…</span>
              <kbd className="font-mono text-[10px] px-1.5 py-0.5 border border-border bg-secondary hidden sm:inline">⌘K</kbd>
            </button>
            <NotificationCenter />
            <span className="font-mono text-[10px] px-2 py-0.5 border border-border text-muted-foreground uppercase tracking-wider">
              {role}
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

        <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
