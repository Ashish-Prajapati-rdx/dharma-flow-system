import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarHeart,
  CheckCircle2,
  ClipboardList,
  Leaf,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { PATIENTS, RECOVERY_TIMELINE, PATIENT_NOTIFICATIONS, getTherapy } from "@/lib/clinic-data";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/patient")({
  head: () => ({
    meta: [
      { title: "My Healing Journey — AyurSutra" },
      {
        name: "description",
        content:
          "Track your Panchakarma timeline, follow procedure precautions, and report symptoms daily.",
      },
    ],
  }),
  component: PatientDashboard,
});

function PatientDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "patient") navigate({ to: "/login/patient" });
  }, [navigate]);

  // Mock current patient
  const me = PATIENTS[0];
  const therapy = getTherapy(me.currentTherapy);
  const pct = Math.round((me.dayCurrent / me.programDays) * 100);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl bg-hero p-7 text-primary-foreground shadow-soft sm:p-10">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-saffron/30 blur-3xl" />
          <div className="relative grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">
                Day {me.dayCurrent} of {me.programDays}
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
                Your {me.programDays}-day {me.programDays === 7 ? "purification" : "deep detox"}{" "}
                cycle
              </h1>
              <p className="mt-3 max-w-xl text-white/85">
                Currently undergoing <strong>{therapy.name}</strong> ({therapy.sanskrit}).{" "}
                {therapy.description}
              </p>
              <div className="mt-6 max-w-md">
                <div className="mb-1.5 flex justify-between text-xs text-white/80">
                  <span>Progress</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div className="h-full bg-saffron" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/15 text-white">
                  <Leaf className="mr-1 h-3 w-3" /> Prakriti: {me.prakriti}
                </Badge>
                <Badge variant="secondary" className="bg-white/15 text-white">
                  <CalendarHeart className="mr-1 h-3 w-3" /> Next session: 08:00 tomorrow
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-widest text-white/70">Today's intention</p>
              <p className="mt-2 font-display text-xl">"Stillness is the first medicine."</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Mini label="Hydration" value="2.1L" icon={<Sun className="h-3 w-3" />} />
                <Mini label="Rest" value="8h" icon={<Sparkles className="h-3 w-3" />} />
                <Mini label="Walks" value="20m" icon={<Activity className="h-3 w-3" />} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Your dashboard</h2>
          <PatientNotifications />
        </div>

        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="timeline">
              <CalendarHeart className="mr-2 h-4 w-4" /> Timeline
            </TabsTrigger>
            <TabsTrigger value="precautions">
              <ShieldCheck className="mr-2 h-4 w-4" /> Precautions
            </TabsTrigger>
            <TabsTrigger value="report">
              <ClipboardList className="mr-2 h-4 w-4" /> Report symptoms
            </TabsTrigger>
            <TabsTrigger value="recovery">
              <Activity className="mr-2 h-4 w-4" /> Recovery
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <TimelineView totalDays={me.programDays} currentDay={me.dayCurrent} />
          </TabsContent>

          <TabsContent value="precautions">
            <PrecautionsView therapyId={me.currentTherapy} />
          </TabsContent>

          <TabsContent value="report">
            <SymptomForm patientName={me.name} />
          </TabsContent>

          <TabsContent value="recovery">
            <RecoveryView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function Mini({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white/10 px-2 py-2.5">
      <div className="mb-1 flex items-center justify-center text-white/70">{icon}</div>
      <p className="font-display text-base">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-white/65">{label}</p>
    </div>
  );
}

/* ---------- Timeline ---------- */

function TimelineView({ totalDays, currentDay }: { totalDays: number; currentDay: number }) {
  const phases =
    totalDays === 7
      ? [
          { range: [1, 2], name: "Purvakarma", desc: "Preparation — Snehana & Swedana" },
          { range: [3, 5], name: "Pradhanakarma", desc: "Main therapy — Virechana / Basti" },
          { range: [6, 7], name: "Paschatkarma", desc: "Restoration — diet & rest" },
        ]
      : [
          { range: [1, 5], name: "Purvakarma", desc: "Oleation & sudation prep" },
          { range: [6, 14], name: "Pradhanakarma", desc: "Core Panchakarma procedures" },
          { range: [15, 21], name: "Paschatkarma", desc: "Samsarjana Krama & rejuvenation" },
        ];
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-semibold">Your detox cycle</h2>
      <p className="text-sm text-muted-foreground">
        Visual progress across the three classical phases
      </p>

      <div className="relative mt-8">
        <div className="absolute inset-x-0 top-5 h-1.5 rounded-full bg-muted" />
        <div
          className="absolute left-0 top-5 h-1.5 rounded-full bg-leaf-grad"
          style={{ width: `${(currentDay / totalDays) * 100}%` }}
        />
        <div
          className="relative grid gap-4"
          style={{ gridTemplateColumns: `repeat(${totalDays}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const done = d < currentDay;
            const today = d === currentDay;
            return (
              <div key={d} className="flex flex-col items-center">
                <div
                  className={`grid h-10 w-10 place-items-center rounded-full border-2 text-xs font-semibold transition ${
                    today
                      ? "border-saffron bg-saffron text-saffron-foreground shadow-soft scale-110"
                      : done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : d}
                </div>
                <p
                  className={`mt-1.5 text-[10px] ${today ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                >
                  D{d}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {phases.map((p) => {
          const active = currentDay >= p.range[0] && currentDay <= p.range[1];
          return (
            <div
              key={p.name}
              className={`rounded-2xl border p-5 transition ${active ? "border-primary bg-primary/5 shadow-soft" : "border-border bg-card"}`}
            >
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                Day {p.range[0]}–{p.range[1]}
              </p>
              <p className="mt-1 font-display text-xl font-semibold">{p.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              {active && (
                <Badge className="mt-3 bg-saffron text-saffron-foreground hover:bg-saffron">
                  Current phase
                </Badge>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/* ---------- Precautions ---------- */

function PrecautionsView({ therapyId }: { therapyId: string }) {
  const t = getTherapy(therapyId);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-saffron/30 text-earth">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Pre-procedure</p>
            <h3 className="font-display text-xl font-semibold">Before {t.name}</h3>
          </div>
        </div>
        <ul className="space-y-3">
          {t.pre.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-saffron" />
              <span className="text-sm">{p}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-leaf/20 text-leaf-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Post-procedure
            </p>
            <h3 className="font-display text-xl font-semibold">After {t.name}</h3>
          </div>
        </div>
        <ul className="space-y-3">
          {t.post.map((p) => (
            <li
              key={p}
              className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <span className="text-sm">{p}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Symptom Form ---------- */

function SymptomForm({ patientName }: { patientName: string }) {
  const [energy, setEnergy] = useState([6]);
  const [sleep, setSleep] = useState([7]);
  const [digestion, setDigestion] = useState([6]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const allTags = [
    "Headache",
    "Nausea",
    "Fatigue",
    "Better sleep",
    "Calm mind",
    "Light body",
    "Dizziness",
    "Improved digestion",
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Daily report submitted to your practitioner");
    setNote("");
    setTags([]);
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold">
          How are you feeling today, {patientName.split(" ")[0]}?
        </h2>
        <p className="text-sm text-muted-foreground">Your honest report shapes tomorrow's care.</p>
      </div>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
        <SliderField label="Energy" value={energy} setValue={setEnergy} />
        <SliderField label="Sleep quality" value={sleep} setValue={setSleep} />
        <SliderField label="Digestion" value={digestion} setValue={setDigestion} />
        <div className="space-y-2 md:col-span-2">
          <Label>Symptoms / observations</Label>
          <div className="flex flex-wrap gap-2">
            {allTags.map((t) => {
              const active = tags.includes(t);
              return (
                <button
                  type="button"
                  key={t}
                  onClick={() =>
                    setTags((prev) => (active ? prev.filter((x) => x !== t) : [...prev, t]))
                  }
                  className={`rounded-full border px-3 py-1 text-xs transition ${active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40"}`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="note">Note for your practitioner</Label>
          <Textarea
            id="note"
            rows={4}
            placeholder="Anything else to share — dreams, cravings, mood..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" size="lg">
            Submit today's report
          </Button>
        </div>
      </form>
    </Card>
  );
}

function SliderField({
  label,
  value,
  setValue,
}: {
  label: string;
  value: number[];
  setValue: (v: number[]) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="font-display text-2xl font-semibold text-primary">
          {value[0]}
          <span className="text-sm text-muted-foreground">/10</span>
        </span>
      </div>
      <Slider min={0} max={10} step={1} value={value} onValueChange={setValue} />
    </div>
  );
}

/* ---------- Recovery ---------- */

function RecoveryView() {
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-semibold">Recovery milestones</h2>
      <p className="text-sm text-muted-foreground">
        Your self-reported scores trending across the program
      </p>
      <div className="mt-6 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={RECOVERY_TIMELINE}>
            <defs>
              <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-saffron)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-saffron)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-leaf)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--color-leaf)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="day" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
            <YAxis
              domain={[0, 10]}
              tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 12,
              }}
            />
            <Area
              type="monotone"
              dataKey="energy"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#g1)"
            />
            <Area
              type="monotone"
              dataKey="sleep"
              stroke="var(--color-saffron)"
              strokeWidth={2}
              fill="url(#g2)"
            />
            <Area
              type="monotone"
              dataKey="digestion"
              stroke="var(--color-leaf)"
              strokeWidth={2}
              fill="url(#g3)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <LegendDot color="var(--color-primary)" label="Energy" />
        <LegendDot color="var(--color-saffron)" label="Sleep" />
        <LegendDot color="var(--color-leaf)" label="Digestion" />
      </div>
    </Card>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

/* ---------- Notifications ---------- */

function PatientNotifications() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="relative">
          <Bell className="mr-2 h-4 w-4" /> Alerts
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-saffron" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">In-app notifications</p>
          <p className="text-xs text-muted-foreground">Sessions and dietary precautions</p>
        </div>
        <ScrollArea className="max-h-80">
          <ul className="divide-y divide-border">
            {PATIENT_NOTIFICATIONS.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`grid h-7 w-7 flex-shrink-0 place-items-center rounded-lg ${
                      n.type === "session"
                        ? "bg-primary/10 text-primary"
                        : n.type === "diet"
                          ? "bg-leaf/15 text-leaf-foreground"
                          : "bg-saffron/25 text-earth"
                    }`}
                  >
                    {n.type === "session" ? (
                      <CalendarHeart className="h-3.5 w-3.5" />
                    ) : n.type === "diet" ? (
                      <Leaf className="h-3.5 w-3.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {n.time}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
