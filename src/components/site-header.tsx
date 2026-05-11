import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Leaf, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSession, clearSession } from "@/lib/auth";

export function SiteHeader() {
  const session = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-leaf-grad text-primary-foreground shadow-soft">
            <Leaf className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-semibold text-foreground">AyurSutra</p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Panchakarma OS</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm md:flex">
          <Link to="/" className="text-muted-foreground transition hover:text-foreground" activeOptions={{ exact: true }} activeProps={{ className: "text-foreground" }}>Home</Link>
          {session?.role === "doctor" && (
            <Link to="/doctor" className="text-muted-foreground transition hover:text-foreground" activeProps={{ className: "text-foreground" }}>Doctor Dashboard</Link>
          )}
          {session?.role === "patient" && (
            <Link to="/patient" className="text-muted-foreground transition hover:text-foreground" activeProps={{ className: "text-foreground" }}>My Journey</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {session ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {session.role === "doctor" ? "Dr." : ""} {session.name}
              </span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : path === "/" ? null : (
            <Button asChild size="sm" variant="ghost">
              <Link to="/">Back home</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
