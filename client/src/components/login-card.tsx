import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import axios from "axios";
import { Stethoscope, User, ArrowRight, Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSession, type Role } from "@/lib/auth";
import toast from "react-hot-toast";

interface AuthUserResponse {
  _id: string;
  name: string;
  email: string;
  role: Role;
}

interface LoginResponse {
  token: string;
  user?: AuthUserResponse;
  userId?: string;
  role: Role;
  name: string;
  email: string;
}

export function LoginCard({ role }: { role: Role }) {
  const navigate = useNavigate();
  const isDoctor = role === "doctor";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (mode === "signup" && !name)) {
      toast.error("Please fill in all fields");
      return;
    }
    try {
      if (mode === "signup") {
        await axios.post("/api/auth/register", { name, email, password, role });
        toast.success("Registration successful! Please sign in.");
        setMode("signin");
        return;
      } else {
        const { data } = await axios.post<LoginResponse>("/api/auth/login", { email, password });
        if (data.role !== role) {
          throw new Error(`Please use the ${data.role} portal for this account.`);
        }

        setSession({
          id: data.user?._id ?? data.userId,
          role: data.role,
          name: data.user?.name ?? data.name ?? name,
          email: data.user?.email ?? data.email ?? email,
          token: data.token,
        });
        toast.success(
          `Welcome${isDoctor ? ", Dr." : ","} ${data.name ? data.name.split(" ")[0] : email}`,
        );
        navigate({ to: isDoctor ? "/doctor" : "/patient" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-hero opacity-95" />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_20%,rgba(255,255,255,0.18),transparent_55%)]" />

      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-12">
        <div className="grid w-full gap-10 md:grid-cols-2">
          <div className="hidden flex-col justify-between text-primary-foreground md:flex">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-white/15 backdrop-blur">
                <Leaf className="h-4 w-4" />
              </span>
              <span className="font-display text-xl">AyurSutra</span>
            </Link>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                {isDoctor ? "Practitioner Portal" : "Patient Portal"}
              </p>
              <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05]">
                {isDoctor
                  ? "Run your clinic with classical clarity."
                  : "Walk your healing path with daily guidance."}
              </h1>
              <p className="mt-4 max-w-md text-white/80">
                {isDoctor
                  ? "Schedules, dosha-aware therapies and patient feedback — synthesised."
                  : "Know what to eat, what to avoid, and how your body is responding — every day."}
              </p>
            </div>
            <Link
              to={isDoctor ? "/login/patient" : "/login/doctor"}
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white"
            >
              I'm actually a {isDoctor ? "patient" : "practitioner"}{" "}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Card className="p-7 shadow-soft sm:p-9">
            <div className="mb-6 flex items-center gap-3">
              <div
                className={`grid h-11 w-11 place-items-center rounded-xl ${isDoctor ? "bg-leaf text-leaf-foreground" : "bg-saffron text-saffron-foreground"}`}
              >
                {isDoctor ? <Stethoscope className="h-5 w-5" /> : <User className="h-5 w-5" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  {isDoctor ? "Practitioner" : "Patient"}{" "}
                  {mode === "signin" ? "Sign in" : "Sign up"}
                </p>
                <h2 className="font-display text-2xl font-semibold">
                  {mode === "signin" ? "Welcome back" : "Create your account"}
                </h2>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" size="lg">
                {mode === "signin" ? "Sign in" : "Create account"}{" "}
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {mode === "signin" ? "New to AyurSutra?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
                  className="font-medium text-primary hover:underline"
                >
                  {mode === "signin" ? "Create one" : "Sign in"}
                </button>
              </p>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
