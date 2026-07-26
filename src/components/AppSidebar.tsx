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
];

const adminNav = [
  { title: "Admin", url: "/admin", icon: Settings },
  { title: "Settings", url: "/settings", icon: SlidersHorizontal },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function AppSidebar({ collapsed, onToggle }: AppSidebarProps) {
  const { isAdmin, isViewer } = useOrgRole();
  const visibleNav = isViewer ? mainNav.filter((item) => item.viewerVisible) : mainNav;

  return (
    <aside
      className={`fixed top-0 left-0 h-screen bg-sidebar border-r border-border flex flex-col z-50 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border border-primary flex items-center justify-center">
            <Plane className="w-4 h-4 text-primary" />
          </div>
          {!collapsed && (
            <span className="font-mono text-sm font-semibold tracking-widest uppercase text-foreground">
              AIRFRAME
            </span>
          )}
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <div className="px-3 mb-2">
          {!collapsed && <p className="section-title mb-2 px-3">Operations</p>}
        </div>
        {visibleNav.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === "/"}
            className="nav-item mx-2 mb-0.5"
            activeClassName="nav-item-active"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}

        <div className="my-4 mx-5 border-t border-border" />

        <div className="px-3 mb-2">
          {!collapsed && <p className="section-title mb-2 px-3">System</p>}
        </div>
        {isAdmin && adminNav.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            className="nav-item mx-2 mb-0.5"
            activeClassName="nav-item-active"
          >
            <item.icon className="w-4 h-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="h-12 flex items-center justify-center border-t border-border text-muted-foreground hover:text-foreground transition-colors"
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  );
}
