import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Plane,
  Award,
  FileText,
  Map,
  Settings,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  ClipboardList,
  SlidersHorizontal,
  Radio,
  BarChart3,
  BookOpen,
  X,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useOrgRole } from "@/hooks/useOrgRole";

const mainNav = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, viewerVisible: true },
  { title: "Projects", url: "/projects", icon: FolderKanban, viewerVisible: true },
  { title: "Missions", url: "/missions", icon: Crosshair, viewerVisible: false },
  { title: "Flight Logs", url: "/flight-logs", icon: ClipboardList, viewerVisible: false },
  { title: "Clients", url: "/clients", icon: Users, viewerVisible: false },
  { title: "Drones", url: "/drones", icon: Plane, viewerVisible: false },
  { title: "Skills", url: "/skills", icon: Award, viewerVisible: false },
  { title: "Invoices", url: "/invoices", icon: FileText, viewerVisible: true },
  { title: "Airspace", url: "/map", icon: Map, viewerVisible: false },
  { title: "Analytics", url: "/analytics", icon: BarChart3, viewerVisible: false },
  { title: "Field Mode", url: "/field", icon: Radio, viewerVisible: true },
  { title: "Guide", url: "/guide", icon: BookOpen, viewerVisible: true },
];

const adminNav = [
  { title: "Admin", url: "/admin", icon: Settings },
  { title: "Settings", url: "/settings", icon: SlidersHorizontal },
];

interface AppSidebarProps {
  /** Desktop-only icon-rail mode. Ignored on mobile, where the drawer is full width. */
  collapsed: boolean;
  onToggle: () => void;
  /** Mobile drawer visibility. */
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function AppSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: AppSidebarProps) {
  const { isAdmin, isViewer } = useOrgRole();
  const visibleNav = isViewer ? mainNav.filter((item) => item.viewerVisible) : mainNav;

  // On mobile the sidebar is an overlay drawer; labels always show there, so
  // `collapsed` (the desktop icon rail) must not hide them.
  const hideLabels = collapsed;

  return (
    <>
      {/* Mobile scrim */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-background/80 z-40 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={`fixed top-0 left-0 h-screen bg-sidebar border-r border-border flex flex-col z-50
          transition-transform duration-300 w-[280px] max-w-[85vw]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0 md:transition-all
          ${collapsed ? "md:w-[72px]" : "md:w-[240px]"}`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-primary flex items-center justify-center shrink-0">
              <Plane className="w-4 h-4 text-primary" />
            </div>
            <span
              className={`font-mono text-sm font-semibold tracking-widest uppercase text-foreground ${
                hideLabels ? "md:hidden" : ""
              }`}
            >
              AIRFRAME
            </span>
          </div>
          {/* Close (mobile only) */}
          <button
            onClick={onMobileClose}
            className="md:hidden h-11 w-11 -mr-2 flex items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <div className="px-3 mb-2">
            <p className={`section-title mb-2 px-3 ${hideLabels ? "md:hidden" : ""}`}>Operations</p>
          </div>
          {visibleNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              end={item.url === "/"}
              onClick={onMobileClose}
              className="nav-item mx-2 mb-0.5 min-h-[44px] md:min-h-0"
              activeClassName="nav-item-active"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className={hideLabels ? "md:hidden" : ""}>{item.title}</span>
            </NavLink>
          ))}

          <div className="my-4 mx-5 border-t border-border" />

          <div className="px-3 mb-2">
            <p className={`section-title mb-2 px-3 ${hideLabels ? "md:hidden" : ""}`}>System</p>
          </div>
          {isAdmin && adminNav.map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={onMobileClose}
              className="nav-item mx-2 mb-0.5 min-h-[44px] md:min-h-0"
              activeClassName="nav-item-active"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className={hideLabels ? "md:hidden" : ""}>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* Collapse toggle — desktop only; mobile uses the drawer close button */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="hidden md:flex h-12 items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </aside>
    </>
  );
}
