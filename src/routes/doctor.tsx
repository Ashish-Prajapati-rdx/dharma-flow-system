import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CalendarDays, Clock, MapPin, MessageSquare, Plus, Search, Stethoscope, TrendingUp, Users } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { TODAY_APPOINTMENTS, PATIENTS, FEEDBACK, THERAPIES, DOCTOR_NOTIFICATIONS, getTherapy, type Appointment } from "@/lib/clinic-data";
import { getSession } from "@/lib/auth";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Practitioner Dashboard — AyurSutra" },
      { name: "description", content: "Daily Panchakarma schedule, patient management and live feedback for practitioners." },
    ],
  }),
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "doctor") navigate({ to: "/login/doctor" });
  }, [navigate]);

  const [appointments, setAppointments] = useState<Appointment[]>(TODAY_APPOINTMENTS);

  const stats = [
    { label: "Today's sessions", value: appointments.length.toString(), icon: CalendarDays, tone: "primary" },
    { label: "Active patients", value: PATIENTS.filter((p) => p.status !== "Completed").length.toString(), icon: Users, tone: "leaf" },
    { label: "Feedback in last 24h", value: FEEDBACK.length.toString(), icon: MessageSquare, tone: "saffron" },
    { label: "Needs review", value: PATIENTS.filter((p) => p.status === "Needs Review").length.toString(), icon: TrendingUp, tone: "earth" },
  ];

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Practitioner</p>
            <h1 className="mt-1 font-display text-4xl font-semibold">Today's Clinic</h1>
            <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <div className="flex gap-2">
            <NotificationsBell />
            <NewAppointmentDialog onCreate={(a) => setAppointments((prev) => [...prev, a].sort((x, y) => x.time.localeCompare(y.time)))} existing={appointments} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                  <p className="mt-1 font-display text-3xl font-semibold">{s.value}</p>
                </div>
                <div className={`grid h-10 w-10 place-items-center rounded-xl ${
                  s.tone === "primary" ? "bg-primary/10 text-primary"
                  : s.tone === "leaf" ? "bg-leaf/15 text-leaf-foreground"
                  : s.tone === "saffron" ? "bg-saffron/20 text-earth"
                  : "bg-earth/15 text-earth"
                }`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="schedule"><CalendarDays className="mr-2 h-4 w-4" /> Schedule</TabsTrigger>
            <TabsTrigger value="patients"><Users className="mr-2 h-4 w-4" /> Patients</TabsTrigger>
            <TabsTrigger value="feedback"><MessageSquare className="mr-2 h-4 w-4" /> Feedback</TabsTrigger>
            <TabsTrigger value="insights"><TrendingUp className="mr-2 h-4 w-4" /> Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleView appointments={appointments} onCancel={(id) => { setAppointments((p) => p.filter((a) => a.id !== id)); toast.success("Appointment cancelled"); }} />
          </TabsContent>

          <TabsContent value="patients">
            <PatientsView />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackView />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ---------- Schedule ---------- */

function ScheduleView({ appointments, onCancel }: { appointments: Appointment[]; onCancel: (id: string) => void }) {
  const hours = Array.from({ length: 11 }, (_, i) => 8 + i); // 8–18

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Daily timeline</h2>
          <Badge variant="secondary" className="bg-leaf/15 text-leaf-foreground">Auto-conflict guard ON</Badge>
        </div>
        <div className="relative grid grid-cols-[60px_1fr] gap-2">
          {hours.map((h) => {
            const slotApps = appointments.filter((a) => parseInt(a.time.split(":")[0], 10) === h);
            return (
              <div key={h} className="contents">
                <div className="border-t border-border pt-1.5 text-xs text-muted-foreground">{String(h).padStart(2, "0")}:00</div>
                <div className="min-h-14 border-t border-border pt-1.5">
                  <div className="space-y-1.5">
                    {slotApps.map((a) => (
                      <AppointmentRow key={a.id} app={a} onCancel={onCancel} />
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="font-display text-xl font-semibold">Room utilisation</h2>
        <p className="text-sm text-muted-foreground">Booked minutes per therapy room today</p>
        <div className="mt-5 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={roomUtilisation(appointments)}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="room" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <Tooltip cursor={{ fill: "var(--color-muted)" }} contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
              <Bar dataKey="minutes" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function AppointmentRow({ app, onCancel }: { app: Appointment; onCancel: (id: string) => void }) {
  const therapy = getTherapy(app.therapyId);
  return (
    <div className="group flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition hover:border-primary/40">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-leaf-grad text-leaf-foreground">
          <Stethoscope className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">{therapy.name} <span className="ml-1 text-xs font-normal text-muted-foreground">{therapy.sanskrit}</span></p>
          <p className="text-xs text-muted-foreground">
            {app.patientName} · <Clock className="mr-0.5 inline h-3 w-3" />{app.time} ({app.duration}m) · <MapPin className="mr-0.5 inline h-3 w-3" />{app.room}
          </p>
        </div>
      </div>
      <Button variant="ghost" size="sm" className="opacity-0 transition group-hover:opacity-100" onClick={() => onCancel(app.id)}>Cancel</Button>
    </div>
  );
}

function roomUtilisation(apps: Appointment[]) {
  const map = new Map<string, number>();
  apps.forEach((a) => map.set(a.room, (map.get(a.room) ?? 0) + a.duration));
  return Array.from(map.entries()).map(([room, minutes]) => ({ room: room.replace("Therapy Hall ", "Hall "), minutes }));
}

function NewAppointmentDialog({ onCreate, existing }: { onCreate: (a: Appointment) => void; existing: Appointment[] }) {
  const [open, setOpen] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [therapyId, setTherapyId] = useState("");
  const [time, setTime] = useState("10:00");
  const [room, setRoom] = useState("Therapy Hall A");
  const [duration, setDuration] = useState("60");

  const submit = () => {
    if (!patientId || !therapyId) return toast.error("Select patient and therapy");
    const dur = parseInt(duration, 10);
    const start = toMinutes(time);
    const conflict = existing.find((a) => a.room === room && overlap(start, start + dur, toMinutes(a.time), toMinutes(a.time) + a.duration));
    if (conflict) return toast.error(`Conflict with ${conflict.patientName} at ${conflict.time}`);
    const patient = PATIENTS.find((p) => p.id === patientId)!;
    onCreate({
      id: "a" + Math.random().toString(36).slice(2, 7),
      patientId, patientName: patient.name, therapyId, time, duration: dur, room,
    });
    toast.success("Session scheduled");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-1 h-4 w-4" /> New session</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Schedule a therapy session</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
              <SelectContent>
                {PATIENTS.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Therapy</Label>
            <Select value={therapyId} onValueChange={setTherapyId}>
              <SelectTrigger><SelectValue placeholder="Select therapy" /></SelectTrigger>
              <SelectContent>
                {THERAPIES.map((t) => <SelectItem key={t.id} value={t.id}>{t.name} ({t.sanskrit})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Duration (min)</Label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Room</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Therapy Hall A", "Therapy Hall B", "Nasya Room", "Purgation Suite"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function toMinutes(t: string) { const [h, m] = t.split(":").map(Number); return h * 60 + m; }
function overlap(a1: number, a2: number, b1: number, b2: number) { return a1 < b2 && b1 < a2; }

/* ---------- Patients ---------- */

function PatientsView() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => PATIENTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())), [q]);
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Patients under care</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-64 pl-9" placeholder="Search patients" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="pb-3 font-medium">Patient</th>
              <th className="pb-3 font-medium">Prakriti</th>
              <th className="pb-3 font-medium">Current therapy</th>
              <th className="pb-3 font-medium">Progress</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const therapy = getTherapy(p.currentTherapy);
              const pct = Math.round((p.dayCurrent / p.programDays) * 100);
              return (
                <tr key={p.id} className="border-b border-border/60 transition hover:bg-muted/40">
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9"><AvatarFallback className="bg-leaf/20 text-sm text-leaf-foreground">{initials(p.name)}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">Age {p.age}</p>
                      </div>
                    </div>
                  </td>
                  <td><Badge variant="outline">{p.prakriti}</Badge></td>
                  <td>{therapy.name}</td>
                  <td className="min-w-[140px]">
                    <div className="flex items-center gap-2">
                      <Progress value={pct} className="h-2" />
                      <span className="text-xs text-muted-foreground">D{p.dayCurrent}/{p.programDays}</span>
                    </div>
                  </td>
                  <td><StatusBadge status={p.status} /></td>
                  <td className="text-xs text-muted-foreground">{p.lastUpdate}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Track": "bg-leaf/20 text-leaf-foreground border-leaf/30",
    "Needs Review": "bg-saffron/25 text-earth border-saffron/40",
    "Completed": "bg-muted text-muted-foreground border-border",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>{status}</span>;
}

function initials(name: string) { return name.split(" ").map((n) => n[0]).slice(0, 2).join(""); }

/* ---------- Feedback ---------- */

function FeedbackView() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Live patient feedback</h2>
        <div className="space-y-3">
          {FEEDBACK.map((f) => (
            <div key={f.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9"><AvatarFallback className="bg-saffron/30 text-sm text-earth">{initials(f.patientName)}</AvatarFallback></Avatar>
                  <div>
                    <p className="font-medium">{f.patientName}</p>
                    <p className="text-xs text-muted-foreground">{f.submittedAt} · feeling {f.rating}/5</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {f.symptoms.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                </div>
              </div>
              <p className="mt-3 text-sm text-foreground/85">"{f.note}"</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <Metric label="Energy" value={f.energy} />
                <Metric label="Digestion" value={f.digestion} />
                <Metric label="Sleep" value={f.sleep} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-xl font-semibold">Cohort wellbeing</h2>
        <p className="text-sm text-muted-foreground">Average self-reported scores from active patients</p>
        <div className="mt-5 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cohortAverages()}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-leaf)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function cohortAverages() {
  const avg = (k: "energy" | "digestion" | "sleep") => +(FEEDBACK.reduce((s, f) => s + f[k], 0) / FEEDBACK.length).toFixed(1);
  return [
    { label: "Energy", value: avg("energy") },
    { label: "Digestion", value: avg("digestion") },
    { label: "Sleep", value: avg("sleep") },
  ];
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-muted/50 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}<span className="text-muted-foreground">/10</span></p>
    </div>
  );
}

/* ---------- Insights ---------- */

function InsightsView() {
  const data = [
    { week: "W1", recoveries: 6 },
    { week: "W2", recoveries: 9 },
    { week: "W3", recoveries: 12 },
    { week: "W4", recoveries: 11 },
    { week: "W5", recoveries: 14 },
    { week: "W6", recoveries: 17 },
  ];
  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-semibold">Completed cycles per week</h2>
      <p className="text-sm text-muted-foreground">Patients completing 7- or 21-day Panchakarma programs</p>
      <div className="mt-5 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12 }} />
            <Line type="monotone" dataKey="recoveries" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-saffron)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

/* ---------- Notifications ---------- */

function NotificationsBell() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-saffron" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          <p className="text-xs text-muted-foreground">Real-time clinic alerts</p>
        </div>
        <ScrollArea className="max-h-80">
          <ul className="divide-y divide-border">
            {DOCTOR_NOTIFICATIONS.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <p className="text-sm font-medium">{n.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{n.time}</p>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
