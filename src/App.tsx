import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { OrgProvider, useOrg } from "@/contexts/OrgContext";
import { AppLayout } from "@/components/AppLayout";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { logError } from "@/lib/errorLogger";

// Eagerly loaded (small, frequently accessed)
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Auth from "./pages/Auth";
import CreateOrg from "./pages/CreateOrg";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";

// Lazy loaded (heavy or infrequently accessed)
const Drones = lazy(() => import("./pages/Drones"));
const Skills = lazy(() => import("./pages/Skills"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const MapPage = lazy(() => import("./pages/MapPage"));
const Missions = lazy(() => import("./pages/Missions"));
const Admin = lazy(() => import("./pages/Admin"));
const Settings = lazy(() => import("./pages/Settings"));
const FlightLogs = lazy(() => import("./pages/FlightLogs"));
const FlightLogDetail = lazy(() => import("./pages/FlightLogDetail"));
const ClientProjectReport = lazy(() => import("./pages/ClientProjectReport"));
const FieldMode = lazy(() => import("./pages/FieldMode"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Guide = lazy(() => import("./pages/Guide"));
const DocumentView = lazy(() => import("./pages/DocumentView"));
const Legal = lazy(() => import("./pages/Legal"));

// Portal pages (client-facing)
const PortalDashboard = lazy(() => import("./pages/portal/PortalDashboard"));
const PortalProjects = lazy(() => import("./pages/portal/PortalProjects"));
const PortalProject = lazy(() => import("./pages/portal/PortalProject"));
const PortalInvoices = lazy(() => import("./pages/portal/PortalInvoices"));

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logError({
        errorType: "query",
        errorMessage: error.message,
        errorStack: (error as Error).stack,
        queryKey: JSON.stringify(query.queryKey).slice(0, 200),
        severity: "error",
        metadata: { queryHash: query.queryHash },
      });
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      logError({
        errorType: "query",
        errorMessage: error.message,
        errorStack: (error as Error).stack,
        queryKey: mutation.options.mutationKey
          ? JSON.stringify(mutation.options.mutationKey).slice(0, 200)
          : "mutation",
        severity: "error",
      });
    },
  }),
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-2 h-2 bg-primary animate-pulse-glow" />
    </div>
  );
}

function ProtectedRoutes() {
  const { user, loading: authLoading } = useAuth();
  const { currentOrg, loading: orgLoading, organizations } = useOrg();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-3 h-3 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (organizations.length === 0) return <Navigate to="/create-org" replace />;
  if (!currentOrg) return <Navigate to="/create-org" replace />;

  // Redirect viewers (clients) to the portal
  const isViewer = currentOrg.role === "viewer";
  if (isViewer && !window.location.pathname.startsWith("/portal")) {
    return <Navigate to="/portal" replace />;
  }

  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        {/* Client Portal routes */}
        <Route element={<PortalLayout />}>
          <Route path="/portal" element={<PortalDashboard />} />
          <Route path="/portal/projects" element={<PortalProjects />} />
          <Route path="/portal/projects/:id" element={<PortalProject />} />
          <Route path="/portal/invoices" element={<PortalInvoices />} />
        </Route>

        {/* Internal routes - only for non-viewer roles */}
        <Route path="/field" element={<FieldMode />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />
          <Route path="/projects/:id/report" element={<ClientProjectReport />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/clients/:id" element={<ClientDetail />} />
          <Route path="/drones" element={<Drones />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/invoices/:id" element={<InvoiceDetail />} />
          <Route path="/missions" element={<Missions />} />
          <Route path="/flight-logs" element={<FlightLogs />} />
          <Route path="/flight-logs/:id" element={<FlightLogDetail />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/guide" element={<Guide />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-3 h-3 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;
  return <Auth />;
}

function CreateOrgGate() {
  const { user, loading: authLoading } = useAuth();
  const { organizations, loading: orgLoading } = useOrg();

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-3 h-3 bg-primary animate-pulse-glow" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  if (organizations.length > 0) return <Navigate to="/" replace />;
  return <CreateOrg />;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <OrgProvider>
              <Routes>
                <Route path="/landing" element={<Landing />} />
                {/* Public: legal documents — must be reachable without an account */}
                <Route path="/privacy" element={<Suspense fallback={<LazyFallback />}><Legal /></Suspense>} />
                <Route path="/terms" element={<Suspense fallback={<LazyFallback />}><Legal /></Suspense>} />
                {/* Public: emailed document links (signed + expiring, no login) */}
                <Route
                  path="/doc"
                  element={
                    <Suspense fallback={<LazyFallback />}>
                      <DocumentView />
                    </Suspense>
                  }
                />
                <Route path="/auth" element={<AuthGate />} />
                <Route path="/create-org" element={<CreateOrgGate />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
            </OrgProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
