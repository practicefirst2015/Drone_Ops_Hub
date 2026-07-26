import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">Error</p>
        <h1 className="font-mono text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="font-mono text-sm text-muted-foreground mb-8">
          Route <code className="px-2 py-1 bg-secondary text-foreground">{location.pathname}</code> not found
        </p>
        <Link
          to="/"
          className="inline-block h-10 px-6 bg-primary text-primary-foreground font-mono text-sm tracking-wide leading-10 hover:opacity-90 transition-opacity"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
