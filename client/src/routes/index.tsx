import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Calendar,
  HeartPulse,
  Leaf,
  ShieldCheck,
  Stethoscope,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AyurSutra — Panchakarma Management for Modern Ayurvedic Clinics" },
      {
        name: "description",
        content:
          "Schedule therapies, track patient detox cycles, deliver pre and post procedure care, and monitor recovery — all in one Ayurvedic clinic OS.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-hero opacity-[0.96]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-28">
          <div className="text-primary-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" /> Ayurvedic Clinic OS
            </span>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.05] text-balance sm:text-6xl md:text-7xl">
              Panchakarma, orchestrated with the precision of modern medicine.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-white/85">
              AyurSutra brings together scheduling, treatment timelines, dosha-aware precautions and
              recovery telemetry — so practitioners heal more, and patients always know what comes
              next.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <RoleCard
                href="/login/doctor"
                icon={<Stethoscope className="h-5 w-5" />}
                title="I'm a Practitioner"
                desc="Manage schedules, patients & feedback"
                tone="leaf"
              />
              <RoleCard
                href="/login/patient"
                icon={<User className="h-5 w-5" />}
                title="I'm a Patient"
                desc="Track my detox cycle & precautions"
                tone="saffron"
              />
            </div>
          </div>

          <div className="relative hidden md:block">
            <div className="absolute -left-6 top-10 h-72 w-72 rounded-full bg-[oklch(0.72_0.16_60)] opacity-30 blur-3xl" />
            <Card className="relative ml-auto w-full max-w-md rotate-1 border-white/20 bg-white/95 p-6 shadow-soft">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                  Today's Snapshot
                </p>
                <Leaf className="h-4 w-4 text-primary" />
              </div>
              <div className="mt-4 space-y-3">
                <Stat label="Active patients" value="42" tone="primary" />
                <Stat label="Therapies scheduled" value="18" tone="leaf" />
                <Stat label="Reviews flagged" value="3" tone="saffron" />
              </div>
              <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">Snehapana — Hall A</p>
                <p className="text-xs text-muted-foreground">Aarav Sharma · Day 9 of 21 · 08:00</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border">
                  <div className="h-full w-[42%] bg-leaf-grad" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
            Built for both sides of the table
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-foreground">
            Two dashboards. One healing journey.
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <Feature
            icon={<Calendar />}
            title="Smart Scheduling"
            desc="Calendar-driven therapy bookings with automatic conflict and room detection."
          />
          <Feature
            icon={<HeartPulse />}
            title="Recovery Telemetry"
            desc="Patients log daily symptoms; practitioners see trendlines in real time."
          />
          <Feature
            icon={<ShieldCheck />}
            title="Dosha-aware Care"
            desc="Pre & post-procedure precautions surface automatically based on the active therapy."
          />
        </div>
      </section>

      <footer className="border-t border-border/60 bg-background/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>
            © {new Date().getFullYear()} AyurSutra · Crafted for classical Panchakarma practice.
          </p>
          <p className="text-xs uppercase tracking-[0.2em]">सर्वे भवन्तु सुखिनः</p>
        </div>
      </footer>
    </div>
  );
}

function RoleCard({
  href,
  icon,
  title,
  desc,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tone: "leaf" | "saffron";
}) {
  return (
    <Link
      to={href}
      className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur transition hover:bg-white/15"
    >
      <div
        className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${tone === "leaf" ? "bg-leaf text-leaf-foreground" : "bg-saffron text-saffron-foreground"}`}
      >
        {icon}
      </div>
      <p className="font-display text-xl font-semibold text-white">{title}</p>
      <p className="mt-1 text-sm text-white/75">{desc}</p>
      <ArrowRight className="absolute right-4 top-4 h-5 w-5 text-white/60 transition group-hover:translate-x-1 group-hover:text-white" />
    </Link>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "primary" | "leaf" | "saffron";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary"
      : tone === "leaf"
        ? "bg-leaf/15 text-leaf-foreground"
        : "bg-saffron/20 text-earth";
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-sm font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="group p-6 transition hover:-translate-y-0.5 hover:shadow-soft">
      <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}

function Index() {
  return <Landing />;
}
void Index;
