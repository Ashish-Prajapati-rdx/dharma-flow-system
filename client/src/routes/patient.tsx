import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarHeart,
  CheckCircle2,
  ClipboardList,
  Leaf,
  Loader2,
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
import { getSession, type SessionUser } from "@/lib/auth";

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

type TreatmentStatus = "scheduled" | "ongoing" | "completed" | "missed";

interface HealthMetrics {
  digestion?: number;
  sleepQuality?: number;
  energyLevel?: number;
  lastUpdatedAt?: string;
}

interface TreatmentProfile {
  currentDayNumber?: number;
  cycleLength?: number;
  lastProgressAt?: string;
}

interface MongoUser {
  _id: string;
  name: string;
  email: string;
  role: "doctor" | "patient";
  assignedDoctor?: string;
  healthMetrics?: HealthMetrics;
  treatmentProfile?: TreatmentProfile;
}

interface PatientAppointment {
  _id: string;
  patientId: string | MongoUser;
  doctorId: string | MongoUser;
  therapyName: string;
  appointmentDate: string;
  timeSlot: string;
  time: string;
  duration: number;
  room: string;
  treatmentStatus: TreatmentStatus;
  status?: "Scheduled" | "Completed";
  currentDayNumber: number;
  progressTracking?: {
    cycleLength?: number;
    dailyMetrics?: Array<{
      dayNumber: number;
      appointmentDate: string;
      digestion: number;
      sleepQuality: number;
      energyLevel: number;
      notes?: string;
      recordedAt?: string;
    }>;
    lastCheckedAt?: string;
  };
}

interface DetoxPlan {
  patientName: string;
  currentTherapyName: string;
  nextAppointment: PatientAppointment;
  totalSessions: number;
  completedSessions: number;
  totalMinutes: number;
  rooms: string[];
  progress: number;
  currentDayNumber: number;
  cycleLength: number;
}

interface RecoveryPoint {
  day: string;
  energy: number;
  sleep: number;
  digestion: number;
}

interface PatientNotification {
  _id: string;
  title: string;
  body: string;
  time: string;
  type: "session" | "diet" | "alert";
}

function PatientDashboard() {
  const navigate = useNavigate();
  const [patientSession, setPatientSession] = useState<SessionUser | null>(null);
  const [appointments, setAppointments] = useState<PatientAppointment[]>([]);
  const [notifications] = useState<PatientNotification[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "patient") {
      navigate({ to: "/login/patient" });
      return;
    }
    setPatientSession(s);

    if (!s.id) {
      setIsLoadingAppointments(false);
      setAppointmentsError("Please sign in again so your patient profile can be loaded.");
      toast.error("Please sign in again to load your sessions.");
      return;
    }

    let ignore = false;
    setIsLoadingAppointments(true);
    setAppointmentsError(null);

    axios
      .get<PatientAppointment[]>(
        `${import.meta.env.VITE_API_BASE_URL}/api/appointments/patient/${s.id}`,
        {
          headers: authHeaders(s),
        },
      )
      .then(({ data }) => {
        if (ignore) return;
        setAppointments(data.sort(comparePatientAppointments));
      })
      .catch((error) => {
        if (ignore) return;
        const message = getApiErrorMessage(error, "Unable to load your sessions.");
        setAppointmentsError(message);
        toast.error(message);
      })
      .finally(() => {
        if (!ignore) setIsLoadingAppointments(false);
      });

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const activePlan = useMemo(
    () => buildDetoxPlan(patientSession, appointments),
    [patientSession, appointments],
  );
  const recoveryTimeline = useMemo(() => buildRecoveryTimeline(appointments), [appointments]);
  const patientName = patientSession?.name ?? "Patient";
  const nextSessionDisplay = activePlan
    ? `${activePlan.nextAppointment.timeSlot} - ${activePlan.nextAppointment.therapyName}`
    : "No active sessions today";

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
                {isLoadingAppointments
                  ? "Loading care plan"
                  : activePlan
                    ? `Day ${activePlan.currentDayNumber} of ${activePlan.cycleLength}`
                    : "No active detox plan"}
              </p>
              <h1 className="mt-2 font-display text-4xl font-semibold sm:text-5xl">
                {activePlan
                  ? "Your 21-day Panchakarma timeline"
                  : "Your care plan is ready when sessions are scheduled"}
              </h1>
              <p className="mt-3 max-w-xl text-white/85">
                {isLoadingAppointments ? (
                  "Loading your active sessions from Atlas..."
                ) : activePlan ? (
                  <>
                    Currently scheduled for <strong>{activePlan.currentTherapyName}</strong>. Your
                    practitioner can update the next steps as your plan changes.
                  </>
                ) : (
                  "No active sessions today. New appointments from your practitioner will appear here."
                )}
              </p>
              <div className="mt-6 max-w-md">
                <div className="mb-1.5 flex justify-between text-xs text-white/80">
                  <span>Progress</span>
                  <span>{activePlan?.progress ?? 0}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/20">
                  <div
                    className="h-full bg-saffron"
                    style={{ width: `${activePlan?.progress ?? 0}%` }}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-white/15 text-white">
                  <Leaf className="mr-1 h-3 w-3" /> Patient: {patientName}
                </Badge>
                <Badge variant="secondary" className="bg-white/15 text-white">
                  <CalendarHeart className="mr-1 h-3 w-3" /> Next session: {nextSessionDisplay}
                </Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
              <p className="text-xs uppercase tracking-widest text-white/70">Today's intention</p>
              <p className="mt-2 font-display text-xl">"Stillness is the first medicine."</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <Mini
                  label="Sessions"
                  value={`${activePlan?.totalSessions ?? 0}`}
                  icon={<Sun className="h-3 w-3" />}
                />
                <Mini
                  label="Minutes"
                  value={`${activePlan?.totalMinutes ?? 0}m`}
                  icon={<Sparkles className="h-3 w-3" />}
                />
                <Mini
                  label="Rooms"
                  value={`${activePlan?.rooms.length ?? 0}`}
                  icon={<Activity className="h-3 w-3" />}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl font-semibold">Your dashboard</h2>
          <PatientNotifications notifications={notifications} />
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
            <TimelineView
              appointments={appointments}
              isLoading={isLoadingAppointments}
              error={appointmentsError}
              currentDayNumber={activePlan?.currentDayNumber ?? 1}
            />
          </TabsContent>

          <TabsContent value="precautions">
            <PrecautionsView therapyName={activePlan?.currentTherapyName} />
          </TabsContent>

          <TabsContent value="report">
            <SymptomForm
              patientName={patientName}
              appointment={activePlan?.nextAppointment ?? null}
              patientSession={patientSession}
              onProgressSaved={(updatedAppointment) =>
                setAppointments((prev) =>
                  prev
                    .map((appointment) =>
                      appointment._id === updatedAppointment._id ? updatedAppointment : appointment,
                    )
                    .sort(comparePatientAppointments),
                )
              }
            />
          </TabsContent>

          <TabsContent value="recovery">
            <RecoveryView recoveryTimeline={recoveryTimeline} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function authHeaders(session: SessionUser | null): Record<string, string> | undefined {
  return session?.token ? { Authorization: `Bearer ${session.token}` } : undefined;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  return error instanceof Error ? error.message : fallback;
}

function getUserName(ref: string | MongoUser, fallback: string) {
  return typeof ref === "object" && ref !== null ? ref.name : fallback;
}

function getAppointmentId(appointment: PatientAppointment) {
  return appointment._id;
}

function timeSlotToMinutes(timeSlot: string) {
  const normalized = timeSlot.trim().toUpperCase();
  const twelveHour = /^(\d{1,2}):([0-5]\d)\s?(AM|PM)$/.exec(normalized);
  if (twelveHour) {
    const [, rawHour, rawMinutes, period] = twelveHour;
    let hour = Number(rawHour);
    if (period === "AM" && hour === 12) hour = 0;
    if (period === "PM" && hour !== 12) hour += 12;
    return hour * 60 + Number(rawMinutes);
  }

  const twentyFourHour = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(normalized);
  if (!twentyFourHour) return Number.POSITIVE_INFINITY;
  return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
}

function comparePatientAppointments(a: PatientAppointment, b: PatientAppointment) {
  if (a.currentDayNumber !== b.currentDayNumber) {
    return a.currentDayNumber - b.currentDayNumber;
  }

  if (a.appointmentDate !== b.appointmentDate) {
    return a.appointmentDate.localeCompare(b.appointmentDate);
  }

  return timeSlotToMinutes(a.timeSlot ?? a.time) - timeSlotToMinutes(b.timeSlot ?? b.time);
}

function buildDetoxPlan(
  patientSession: SessionUser | null,
  appointments: PatientAppointment[],
): DetoxPlan | null {
  if (appointments.length === 0) return null;

  const completedSessions = appointments.filter((a) => a.treatmentStatus === "completed").length;
  const nextAppointment =
    appointments.find(
      (a) => a.treatmentStatus === "scheduled" || a.treatmentStatus === "ongoing",
    ) ?? appointments[0];
  const rooms = Array.from(new Set(appointments.map((a) => a.room).filter(Boolean)));
  const totalMinutes = appointments.reduce((sum, a) => sum + a.duration, 0);
  const patientRef = nextAppointment.patientId;
  const profile =
    typeof patientRef === "object" && patientRef !== null ? patientRef.treatmentProfile : undefined;
  const currentDayNumber = Math.min(
    Math.max(profile?.currentDayNumber ?? nextAppointment.currentDayNumber ?? 1, 1),
    21,
  );
  const cycleLength = profile?.cycleLength ?? 21;

  return {
    patientName: patientSession?.name ?? getUserName(nextAppointment.patientId, "Patient"),
    currentTherapyName: nextAppointment.therapyName,
    nextAppointment,
    totalSessions: appointments.length,
    completedSessions,
    totalMinutes,
    rooms,
    progress: Math.round((currentDayNumber / cycleLength) * 100),
    currentDayNumber,
    cycleLength,
  };
}

function buildRecoveryTimeline(appointments: PatientAppointment[]): RecoveryPoint[] {
  return appointments
    .flatMap((appointment) => appointment.progressTracking?.dailyMetrics ?? [])
    .sort((a, b) => a.dayNumber - b.dayNumber)
    .map((metric) => ({
      day: `Day ${metric.dayNumber}`,
      energy: metric.energyLevel,
      sleep: metric.sleepQuality,
      digestion: metric.digestion,
    }));
}

function getTreatmentInstructions(therapyName: string) {
  const normalized = therapyName.toLowerCase();
  const fallback = {
    pre: [
      "Arrive 15 minutes early and avoid rushing before the procedure.",
      "Keep meals light unless your practitioner has given a specific diet plan.",
      "Share sleep, digestion, appetite, and energy observations with the team.",
    ],
    post: [
      "Rest quietly after the session and avoid cold drinks or heavy exertion.",
      "Follow the diet and bathing timing advised by your practitioner.",
      "Report unusual discomfort, dizziness, nausea, or fatigue promptly.",
    ],
  };

  if (normalized.includes("nasya")) {
    return {
      pre: [
        "Avoid heavy meals for at least 2 hours before therapy.",
        "Keep the head, neck, and shoulders relaxed before arrival.",
        "Avoid strong fragrances, nasal sprays, or cold compresses unless prescribed.",
      ],
      post: [
        "Avoid dust, wind, cold air, and loud speaking immediately after therapy.",
        "Sip warm water and rest with the head protected.",
        "Report headache, irritation, or excess nasal discharge.",
      ],
    };
  }

  if (normalized.includes("basti")) {
    return {
      pre: [
        "Follow the meal timing given by your doctor.",
        "Avoid strenuous exercise before arrival.",
        "Report constipation, loose stools, abdominal pain, or appetite changes.",
      ],
      post: [
        "Stay available until your practitioner confirms the response is stable.",
        "Prefer warm, simple food and avoid raw, cold, or heavy items.",
        "Track bowel response and abdominal comfort in the daily report.",
      ],
    };
  }

  return fallback;
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

function TimelineView({
  appointments,
  isLoading,
  error,
  currentDayNumber,
}: {
  appointments: PatientAppointment[];
  isLoading: boolean;
  error: string | null;
  currentDayNumber: number;
}) {
  const completedPct = Math.round((currentDayNumber / 21) * 100);
  const appointmentsByDay = new Map(
    appointments.map((appointment) => [appointment.currentDayNumber, appointment]),
  );

  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-semibold">Your detox schedule</h2>
      <p className="text-sm text-muted-foreground">
        Live appointments assigned by your practitioner
      </p>

      {isLoading ? (
        <div className="mt-6 grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your sessions...
          </span>
        </div>
      ) : error ? (
        <div className="mt-6 grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : appointments.length === 0 ? (
        <div className="mt-6 grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          No active sessions today.
        </div>
      ) : (
        <>
          <div className="mt-8">
            <div className="mb-2 flex justify-between text-xs text-muted-foreground">
              <span>21-day treatment cycle</span>
              <span>{completedPct}%</span>
            </div>
            <Progress value={completedPct} className="h-2" />
            <div className="mt-5 grid grid-cols-7 gap-2 sm:grid-cols-[repeat(21,minmax(0,1fr))]">
              {Array.from({ length: 21 }, (_, index) => {
                const dayNumber = index + 1;
                const appointment = appointmentsByDay.get(dayNumber);
                const done =
                  appointment?.treatmentStatus === "completed" || dayNumber < currentDayNumber;
                const current = dayNumber === currentDayNumber;
                return (
                  <div key={dayNumber} className="flex flex-col items-center">
                    <div
                      className={`grid h-9 w-9 place-items-center rounded-full border-2 text-xs font-semibold transition ${
                        current
                          ? "border-saffron bg-saffron text-saffron-foreground shadow-soft scale-110"
                          : done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground"
                      }`}
                    >
                      {done ? <CheckCircle2 className="h-4 w-4" /> : dayNumber}
                    </div>
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      {appointment?.timeSlot ?? `D${dayNumber}`}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {appointments.map((appointment) => (
              <div
                key={getAppointmentId(appointment)}
                className={`rounded-2xl border p-5 transition ${
                  appointment.treatmentStatus === "scheduled" ||
                  appointment.treatmentStatus === "ongoing"
                    ? "border-primary bg-primary/5 shadow-soft"
                    : "border-border bg-card"
                }`}
              >
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  Day {appointment.currentDayNumber} · {appointment.appointmentDate} ·{" "}
                  {appointment.timeSlot} · {appointment.duration}m
                </p>
                <p className="mt-1 font-display text-xl font-semibold">{appointment.therapyName}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {appointment.room} with {getUserName(appointment.doctorId, "your practitioner")}
                </p>
                {(appointment.treatmentStatus === "scheduled" ||
                  appointment.treatmentStatus === "ongoing") && (
                  <Badge className="mt-3 bg-saffron text-saffron-foreground hover:bg-saffron">
                    {appointment.treatmentStatus}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

/* ---------- Precautions ---------- */

function PrecautionsView({ therapyName }: { therapyName?: string }) {
  const displayName = therapyName ?? "your next therapy";
  const instructions = getTreatmentInstructions(displayName);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <Card className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-saffron/30 text-earth">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Pre-procedure</p>
            <h3 className="font-display text-xl font-semibold">Before {displayName}</h3>
          </div>
        </div>
        <ul className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          {instructions.pre.map((item) => (
            <li key={item}>{item}</li>
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
            <h3 className="font-display text-xl font-semibold">After {displayName}</h3>
          </div>
        </div>
        <ul className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          {instructions.post.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

/* ---------- Symptom Form ---------- */

function SymptomForm({
  patientName,
  appointment,
  patientSession,
  onProgressSaved,
}: {
  patientName: string;
  appointment: PatientAppointment | null;
  patientSession: SessionUser | null;
  onProgressSaved: (appointment: PatientAppointment) => void;
}) {
  const [energy, setEnergy] = useState([3]);
  const [sleep, setSleep] = useState([3]);
  const [digestion, setDigestion] = useState([3]);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [availableTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appointment) {
      toast.error("No active appointment is available for today's report.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data } = await axios.post<PatientAppointment>(
        `${import.meta.env.VITE_API_BASE_URL}/api/appointments/${appointment._id}/progress`,
        {
          energyLevel: energy[0],
          sleepQuality: sleep[0],
          digestion: digestion[0],
          notes: [note, ...tags].filter(Boolean).join(" | "),
        },
        { headers: authHeaders(patientSession) },
      );

      onProgressSaved(data);
      toast.success("Daily report submitted to your practitioner");
      setNote("");
      setTags([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Unable to submit today's report."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-5">
        <h2 className="font-display text-xl font-semibold">
          How are you feeling today, {patientName.split(" ")[0]}?
        </h2>
        <p className="text-sm text-muted-foreground">
          {appointment
            ? `Day ${appointment.currentDayNumber}/21 report for ${appointment.therapyName}`
            : "Your honest report shapes tomorrow's care."}
        </p>
      </div>
      <form onSubmit={submit} className="grid gap-6 md:grid-cols-2">
        <SliderField label="Energy" value={energy} setValue={setEnergy} />
        <SliderField label="Sleep quality" value={sleep} setValue={setSleep} />
        <SliderField label="Digestion" value={digestion} setValue={setDigestion} />
        <div className="space-y-2 md:col-span-2">
          <Label>Symptoms / observations</Label>
          {availableTags.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Symptom tags will appear here when configured by the clinic.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTags.map((t) => {
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
          )}
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
          <Button type="submit" size="lg" disabled={isSubmitting || !appointment}>
            {isSubmitting ? "Submitting..." : "Submit today's report"}
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
          <span className="text-sm text-muted-foreground">/5</span>
        </span>
      </div>
      <Slider min={1} max={5} step={1} value={value} onValueChange={setValue} />
    </div>
  );
}

/* ---------- Recovery ---------- */

function RecoveryView({ recoveryTimeline }: { recoveryTimeline: RecoveryPoint[] }) {
  return (
    <Card className="p-6">
      <h2 className="font-display text-xl font-semibold">Recovery milestones</h2>
      <p className="text-sm text-muted-foreground">
        Your self-reported scores trending across the program
      </p>
      <div className="mt-6 h-80">
        {recoveryTimeline.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            Recovery charts will appear after symptom reports are stored.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={recoveryTimeline}>
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
                domain={[1, 5]}
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
        )}
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

function PatientNotifications({ notifications }: { notifications: PatientNotification[] }) {
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
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No patient alerts.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n._id} className="px-4 py-3">
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
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
