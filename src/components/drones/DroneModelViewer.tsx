import { lazy, Suspense, useState, Component, type ReactNode } from "react";
import { Box, Maximize2, Minimize2 } from "lucide-react";

const ThreeScene = lazy(() => import("./DroneModelViewerScene"));

interface Props {
  modelUrl: string;
  modelName: string;
}

class ViewerErrorBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

export default function DroneModelViewer({ modelUrl, modelName }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="surface border border-border p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground h-40">
        <Box className="w-5 h-5" />
        <p className="font-mono text-xs">3D preview unavailable</p>
      </div>
    );
  }

  return (
    <div className={`relative surface border border-border overflow-hidden transition-all ${expanded ? "h-[70vh]" : "h-64 md:h-80"}`}>
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          onClick={() => setExpanded(!expanded)}
          className="h-7 w-7 flex items-center justify-center bg-background/80 backdrop-blur border border-border text-muted-foreground hover:text-foreground transition-colors"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="absolute bottom-3 left-3 z-10">
        <span className="font-mono text-[10px] text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 border border-border">
          3D · {modelName}
        </span>
      </div>

      <Suspense
        fallback={
          <div className="w-full h-full flex items-center justify-center bg-muted/30">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Box className="w-5 h-5 animate-pulse" />
              <p className="font-mono text-xs">Loading 3D viewer…</p>
            </div>
          </div>
        }
      >
        <ViewerErrorBoundary onError={() => setError(true)}>
          <ThreeScene modelUrl={modelUrl} />
        </ViewerErrorBoundary>
      </Suspense>
    </div>
  );
}
