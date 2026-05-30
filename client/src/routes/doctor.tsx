import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import {
  Bell,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SiteHeader } from "@/components/site-header";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import toast from "react-hot-toast";
import { getSession, type SessionUser } from "@/lib/auth";

// Use relative paths - works both in dev and production
const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL}/api`;
const APPOINTMENTS_API_URL = `${API_BASE_URL}/appointments`;
const DEFAULT_TIMELINE_HOURS = Array.from({ length: 11 }, (_, i) => 8 + i);
const TIMELINE_SKELETON_ROWS = Array.from({ length: 6 }, (_, i) => i);
const UNSCHEDULED_TIMELINE_SLOT = "unscheduled";

export const Route = createFileRoute("/doctor")({
  head: () => ({
    meta: [
      { title: "Practitioner Dashboard — AyurSutra" },
      {
        name: "description",
        content:
          "Daily Panchakarma schedule, patient management and live feedback for practitioners.",
      },
    ],
  }),
  component: DoctorDashboard,
});

type UserRole = "doctor" | "patient";
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
  role: UserRole;
  assignedDoctor?: string;
  emailVerified?: boolean;
  healthMetrics?: HealthMetrics;
  treatmentProfile?: TreatmentProfile;
}

type UserReference = string | MongoUser;

interface Appointment {
  _id: string;
  patientId: UserReference;
  doctorId: UserReference;
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

interface FeedbackEntry {
  _id: string;
  patientId?: UserReference;
  patientName: string;
  rating: number;
  symptoms: string[];
  note: string;
  submittedAt: string;
  energy: number;
  digestion: number;
  sleep: number;
}

interface NotificationItem {
  _id: string;
  title: string;
  body: string;
  time: string;
  type: "session" | "diet" | "alert";
}

interface TimelineSlot {
  key: string;
  label: string;
}

type StoredSessionShape = Partial<SessionUser> & {
  _id?: string;
  userId?: string;
  user?: Partial<SessionUser> & {
    _id?: string;
  };
};

function readDoctorSessionFromStorage(): SessionUser | null {
  if (typeof window === "undefined") return null;

  const saved =
    localStorage.getItem("doctor_session") ||
    localStorage.getItem("auth_token") ||
    localStorage.getItem("ayursutra_session");

  if (!saved) return getSession();

  try {
    return normalizeStoredSession(JSON.parse(saved)) ?? getSession();
  } catch {
    return getSession();
  }
}

function normalizeStoredSession(value: unknown): SessionUser | null {
  if (!value || typeof value !== "object") return null;

  const stored = value as StoredSessionShape;
  const role = stored.role ?? stored.user?.role;

  if (role !== "doctor" && role !== "patient") return null;

  return {
    id: stored.id ?? stored.userId ?? stored._id ?? stored.user?.id ?? stored.user?._id,
    role,
    name: stored.name ?? stored.user?.name ?? "",
    email: stored.email ?? stored.user?.email ?? "",
    token: stored.token,
  };
}

function DoctorDashboard() {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionUser | null>(() => readDoctorSessionFromStorage());
  const [hasCheckedStoredSession, setHasCheckedStoredSession] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<MongoUser[]>([]);
  const [feedbackEntries] = useState<FeedbackEntry[]>([]);
  const [notifications] = useState<NotificationItem[]>([]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isPatientsLoading, setIsPatientsLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  useEffect(() => {
    const syncSession = () => {
      setSession(readDoctorSessionFromStorage());
      setHasCheckedStoredSession(true);
    };

    syncSession();
    window.addEventListener("ayursutra:session", syncSession);
    window.addEventListener("storage", syncSession);

    return () => {
      window.removeEventListener("ayursutra:session", syncSession);
      window.removeEventListener("storage", syncSession);
    };
  }, []);

  useEffect(() => {
    if (!hasCheckedStoredSession || session) return;
    navigate({ to: "/login/doctor" });
  }, [hasCheckedStoredSession, navigate, session]);

  useEffect(() => {
    let ignore = false;
    let loadingToast: string | undefined;

    if (!session) {
      setIsHydrating(true);
      setIsFetchingData(true);
      return () => {
        ignore = true;
      };
    }

    if (session.role !== "doctor") {
      navigate({ to: "/login/doctor" });
      return () => {
        ignore = true;
      };
    }

    if (!session.id || !session.token) {
      setIsFetchingData(false);
      setIsPatientsLoading(false);
      setIsHydrating(false);
      setScheduleError("Please sign in again so your doctor profile can be loaded.");
      setPatientsError("Please sign in again so your assigned patients can be loaded.");
      toast.error("Please sign in again to load your schedule.");
      return () => {
        ignore = true;
      };
    }

    const loadClinic = async () => {
      if (!session || !session.id || !session.token) return;

      loadingToast = toast.loading("Loading today's clinic...");
      setIsHydrating(false);
      setIsFetchingData(true);
      setIsPatientsLoading(true);
      setScheduleError(null);
      setPatientsError(null);

      const headers = authHeaders(session);

      const loadAppointments = async () => {
        try {
          const response = await axios.get<Appointment[]>(
            `${APPOINTMENTS_API_URL}/doctor/${session.id}/today`,
            { headers },
          );

          if (ignore) return;

          if (response.status !== 200 || !Array.isArray(response.data)) {
            throw new Error("Unable to verify today's schedule response.");
          }

          const nextAppointments = [...response.data].sort(compareAppointmentsByTime);
          setAppointments(nextAppointments);
        } catch (error) {
          if (ignore) return;
          const message = getApiErrorMessage(error, "Unable to load therapy schedule.");
          setScheduleError(message);
          toast.error(message);
        } finally {
          if (!ignore) setIsFetchingData(false);
        }
      };

      const loadPatients = async () => {
        try {
          const response = await axios.get<MongoUser[]>(`${API_BASE_URL}/users/patients`, {
            params: { doctorId: session.id },
            headers,
          });

          if (ignore) return;

          if (response.status !== 200 || !Array.isArray(response.data)) {
            throw new Error("Unable to verify assigned patient response.");
          }

          setPatients(response.data);
        } catch (error) {
          if (ignore) return;
          const message = getApiErrorMessage(error, "Unable to load active patients.");
          setPatientsError(message);
          toast.error(message);
        } finally {
          if (!ignore) setIsPatientsLoading(false);
        }
      };

      await Promise.allSettled([loadAppointments(), loadPatients()]);

      if (ignore) return;

      setIsHydrating(false);
      if (loadingToast) toast.dismiss(loadingToast);
    };

    loadClinic().catch((error) => {
      if (ignore) return;
      const message = getApiErrorMessage(error, "Unable to load today's clinic.");
      setScheduleError(message);
      setPatientsError(message);
      setIsFetchingData(false);
      setIsPatientsLoading(false);
      setIsHydrating(false);
      if (loadingToast) toast.dismiss(loadingToast);
      toast.error(message);
    });

    return () => {
      ignore = true;
      if (loadingToast) toast.dismiss(loadingToast);
    };
    // The clinic fetch is intentionally locked to the doctor id hydration boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  const stats = [
    {
      label: "Today's sessions",
      value: isFetchingData ? "..." : appointments.length.toString(),
      icon: CalendarDays,
      tone: "primary",
    },
    {
      label: "Active patients",
      value: isPatientsLoading ? "..." : patients.length.toString(),
      icon: Users,
      tone: "leaf",
    },
    {
      label: "Feedback in last 24h",
      value: feedbackEntries.length.toString(),
      icon: MessageSquare,
      tone: "saffron",
    },
    {
      label: "Needs review",
      value: "0",
      icon: TrendingUp,
      tone: "earth",
    },
  ];

  const handleCancelAppointment = async (id: string) => {
    try {
      const headers = authHeaders(session);
      await axios.delete(`${API_BASE_URL}/api/appointments/${id}`, { headers });
      setAppointments((prev) => prev.filter((a) => a._id !== id));
      toast.success("Appointment cancelled successfully.");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to cancel assignment."));
    }
  };

  const handleStatusChange = async (id: string, treatmentStatus: TreatmentStatus) => {
    try {
      const headers = authHeaders(session);
      const { data } = await axios.patch<Appointment>(
        `${API_BASE_URL}/api/appointments/${id}/status`,
        { treatmentStatus },
        { headers },
      );
      setAppointments((prev) =>
        prev
          .map((appointment) => (appointment._id === id ? data : appointment))
          .sort(compareAppointmentsByTime),
      );
      toast.success(`Session marked ${treatmentStatus}.`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update session status."));
    }
  };

  if (isHydrating) {
    return <DoctorHydrationScreen />;
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">
              Practitioner
            </p>
            <h1 className="mt-1 font-display text-4xl font-semibold">Today's Clinic</h1>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            <NotificationsBell notifications={notifications} />
            <NewAppointmentDialog
              doctor={session}
              patients={patients}
              isPatientsLoading={isPatientsLoading}
              onCreate={(a) =>
                setAppointments((prev) => [...prev, a].sort(compareAppointmentsByTime))
              }
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="mt-1 font-display text-3xl font-semibold">{s.value}</p>
                </div>
                <div
                  className={`grid h-10 w-10 place-items-center rounded-xl ${
                    s.tone === "primary"
                      ? "bg-primary/10 text-primary"
                      : s.tone === "leaf"
                        ? "bg-leaf/15 text-leaf-foreground"
                        : s.tone === "saffron"
                          ? "bg-saffron/20 text-earth"
                          : "bg-earth/15 text-earth"
                  }`}
                >
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="schedule" className="space-y-6">
          <TabsList className="bg-muted/60">
            <TabsTrigger value="schedule">
              <CalendarDays className="mr-2 h-4 w-4" /> Schedule
            </TabsTrigger>
            <TabsTrigger value="patients">
              <Users className="mr-2 h-4 w-4" /> Patients
            </TabsTrigger>
            <TabsTrigger value="feedback">
              <MessageSquare className="mr-2 h-4 w-4" /> Feedback
            </TabsTrigger>
            <TabsTrigger value="insights">
              <TrendingUp className="mr-2 h-4 w-4" /> Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule">
            <ScheduleView
              appointments={appointments}
              isFetchingData={isFetchingData}
              error={scheduleError}
              onCancel={handleCancelAppointment}
              onStatusChange={handleStatusChange}
            />
          </TabsContent>

          <TabsContent value="patients">
            <PatientsView
              patients={patients}
              appointments={appointments}
              isLoading={isPatientsLoading}
              error={patientsError}
            />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackView feedbackEntries={feedbackEntries} />
          </TabsContent>

          <TabsContent value="insights">
            <InsightsView appointments={appointments} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function DoctorHydrationScreen() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center px-4 py-8 sm:px-6">
        <Card className="mx-auto w-full max-w-md p-8 text-center shadow-soft">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold">Loading today's clinic</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Restoring your practitioner session and syncing the latest schedule.
          </p>
        </Card>
      </main>
    </div>
  );
}

/* ---------- Schedule ---------- */

function ScheduleView({
  appointments,
  isFetchingData,
  error,
  onCancel,
  onStatusChange,
}: {
  appointments: Appointment[];
  isFetchingData: boolean;
  error: string | null;
  onCancel: (id: string) => void;
  onStatusChange: (id: string, treatmentStatus: TreatmentStatus) => void;
}) {
  const isScheduleLocked = isFetchingData;
  const nextAppointment = useMemo(
    () => (isScheduleLocked ? null : getNextAppointment(appointments)),
    [appointments, isScheduleLocked],
  );
  const roomData = useMemo(
    () => (isScheduleLocked ? [] : roomUtilisation(appointments)),
    [appointments, isScheduleLocked],
  );
  const timelineSlots = useMemo(
    () => (isScheduleLocked ? [] : buildTimelineSlots(appointments)),
    [appointments, isScheduleLocked],
  );
  const appointmentsByTimelineSlot = useMemo(
    () =>
      isScheduleLocked
        ? new Map<string, Appointment[]>()
        : groupAppointmentsByTimelineSlot(appointments),
    [appointments, isScheduleLocked],
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Daily timeline</h2>
          <Badge variant="secondary" className="bg-leaf/15 text-leaf-foreground">
            Auto-conflict guard ON
          </Badge>
        </div>
        {isScheduleLocked ? (
          <DailyTimelineSkeleton />
        ) : error ? (
          <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : appointments.length === 0 ? (
          <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            No active sessions today.
          </div>
        ) : (
          <div className="relative grid grid-cols-[60px_1fr] gap-2">
            {timelineSlots.map((slot) => {
              const slotApps = appointmentsByTimelineSlot.get(slot.key) ?? [];
              return (
                <div key={slot.key} className="contents">
                  <div className="border-t border-border pt-1.5 text-xs text-muted-foreground">
                    {slot.label}
                  </div>
                  <div className="min-h-14 border-t border-border pt-1.5">
                    <div className="space-y-1.5">
                      {slotApps.map((a) => (
                        <AppointmentRow
                          key={a._id}
                          app={a}
                          onCancel={onCancel}
                          onStatusChange={onStatusChange}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="space-y-6">
        {isScheduleLocked ? (
          <NextSessionSkeleton />
        ) : (
          <NextSessionCard appointment={nextAppointment} />
        )}

        <Card className="p-5">
          <h2 className="font-display text-xl font-semibold">Room utilisation</h2>
          <p className="text-sm text-muted-foreground">Booked minutes per therapy room today</p>
          <div className="mt-5 h-64">
            {isScheduleLocked ? (
              <RoomUtilisationSkeleton />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={roomData}>
                  <CartesianGrid
                    stroke="var(--color-border)"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="room"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                  <Tooltip
                    cursor={{ fill: "var(--color-muted)" }}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="minutes" fill="var(--color-primary)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function DailyTimelineSkeleton() {
  return (
    <div
      aria-busy="true"
      className="min-h-72 rounded-xl border border-dashed border-border bg-muted/30 p-4"
    >
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Syncing MongoDB appointments...
      </div>
      <div className="grid grid-cols-[60px_1fr] gap-2">
        {TIMELINE_SKELETON_ROWS.map((row) => (
          <div key={row} className="contents">
            <Skeleton className="mt-1 h-3 w-11" />
            <div className="border-t border-border pt-2">
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NextSessionSkeleton() {
  return (
    <Card className="p-5" aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-4 h-7 w-48" />
      <Skeleton className="mt-3 h-4 w-64 max-w-full" />
      <Skeleton className="mt-6 h-2 w-full" />
    </Card>
  );
}

function RoomUtilisationSkeleton() {
  return (
    <div aria-busy="true" className="flex h-full items-end gap-3 px-2 pb-2">
      {[72, 124, 96, 152, 112].map((height, index) => (
        <Skeleton key={index} className="flex-1 rounded-t-xl" style={{ height }} />
      ))}
    </div>
  );
}

function buildTimelineSlots(appointments: Appointment[]): TimelineSlot[] {
  const hours = new Set(DEFAULT_TIMELINE_HOURS);
  let hasUnscheduledAppointment = false;

  appointments.forEach((appointment) => {
    const hour = getAppointmentHour(appointment);

    if (hour === null) {
      hasUnscheduledAppointment = true;
      return;
    }

    hours.add(hour);
  });

  const slots = Array.from(hours)
    .sort((a, b) => a - b)
    .map((hour) => ({
      key: getTimelineHourKey(hour),
      label: formatTimelineHour(hour),
    }));

  if (hasUnscheduledAppointment) {
    slots.push({
      key: UNSCHEDULED_TIMELINE_SLOT,
      label: "Time pending",
    });
  }

  return slots;
}

function groupAppointmentsByTimelineSlot(appointments: Appointment[]) {
  const appointmentsBySlot = new Map<string, Appointment[]>();

  appointments.forEach((appointment) => {
    const slotKey = getAppointmentTimelineSlotKey(appointment);
    const slotAppointments = appointmentsBySlot.get(slotKey) ?? [];
    slotAppointments.push(appointment);
    appointmentsBySlot.set(slotKey, slotAppointments);
  });

  appointmentsBySlot.forEach((slotAppointments) => {
    slotAppointments.sort(compareAppointmentsByTime);
  });

  return appointmentsBySlot;
}

function getAppointmentTimelineSlotKey(appointment: Appointment) {
  const hour = getAppointmentHour(appointment);
  return hour === null ? UNSCHEDULED_TIMELINE_SLOT : getTimelineHourKey(hour);
}

function getTimelineHourKey(hour: number) {
  return `hour-${hour}`;
}

function formatTimelineHour(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function NextSessionCard({ appointment }: { appointment: Appointment | null }) {
  if (!appointment) {
    return (
      <Card className="p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Next session</p>
        <h2 className="mt-2 font-display text-xl font-semibold">No upcoming slot today</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Scheduled and ongoing sessions for the current date will appear here.
        </p>
      </Card>
    );
  }

  const patientName = getUserName(appointment.patientId, "Patient");
  const progress = Math.round((appointment.currentDayNumber / 21) * 100);

  return (
    <Card className="border-primary/30 bg-primary/5 p-5 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary">Next session</p>
          <h2 className="mt-2 font-display text-2xl font-semibold">{appointment.therapyName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {patientName} at {appointment.timeSlot} · {appointment.room}
          </p>
        </div>
        <StatusBadge status={appointment.treatmentStatus} />
      </div>
      <div className="mt-5">
        <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
          <span>21-day cycle</span>
          <span>Day {appointment.currentDayNumber} of 21</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </Card>
  );
}

function AppointmentRow({
  app,
  onCancel,
  onStatusChange,
}: {
  app: Appointment;
  onCancel: (id: string) => void;
  onStatusChange: (id: string, treatmentStatus: TreatmentStatus) => void;
}) {
  const therapy = getTherapyDisplay(app.therapyName);
  const patientName = getUserName(app.patientId, "Patient");

  return (
    <div className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2 shadow-sm transition hover:border-primary/40">
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-leaf-grad text-leaf-foreground">
          <Stethoscope className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold">
            {therapy.name}{" "}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              {therapy.sanskrit}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            {patientName} · <Clock className="mr-0.5 inline h-3 w-3" />
            {app.timeSlot} ({app.duration}m) · <MapPin className="mr-0.5 inline h-3 w-3" />
            {app.room} · Day {app.currentDayNumber}/21
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <StatusBadge status={app.treatmentStatus} />
        {app.treatmentStatus === "scheduled" && (
          <Button variant="outline" size="sm" onClick={() => onStatusChange(app._id, "ongoing")}>
            Start
          </Button>
        )}
        {app.treatmentStatus === "ongoing" && (
          <Button size="sm" onClick={() => onStatusChange(app._id, "completed")}>
            Complete
          </Button>
        )}
        {app.treatmentStatus === "scheduled" && (
          <Button variant="ghost" size="sm" onClick={() => onCancel(app._id)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

function roomUtilisation(apps: Appointment[]) {
  const map = new Map<string, number>();
  apps.forEach((a) => map.set(a.room, (map.get(a.room) ?? 0) + a.duration));
  return Array.from(map.entries()).map(([room, minutes]) => ({
    room: room.replace("Therapy Hall ", "Hall "),
    minutes,
  }));
}

/* ---------- New Appointment Dialog ---------- */

function NewAppointmentDialog({
  doctor,
  patients,
  isPatientsLoading,
  onCreate,
}: {
  doctor: SessionUser | null;
  patients: MongoUser[];
  isPatientsLoading: boolean;
  onCreate: (a: Appointment) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);
  const [patientId, setPatientId] = useState("");
  const [therapyName, setTherapyName] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(formatLocalDate());
  const [time, setTime] = useState("10:00");
  const [room, setRoom] = useState("Therapy Hall A");
  const [duration, setDuration] = useState("60");

  const submit = async () => {
    if (!doctor?.id) return toast.error("Please sign in again before scheduling.");
    if (!patientId || !therapyName.trim() || !room.trim()) {
      return toast.error("Select patient, therapy, and room");
    }

    const dur = parseInt(duration, 10);
    if (!Number.isFinite(dur) || dur <= 0) return toast.error("Enter a valid duration");

    const loadingToast = toast.loading("Scheduling session...");
    setIsScheduling(true);

    try {
      const { data } = await axios.post<Appointment>(
        `${API_BASE_URL}/api/appointments/new`,
        {
          patientId,
          doctorId: doctor.id,
          therapyName,
          appointmentDate,
          timeSlot: time,
          duration: dur,
          room,
        },
        { headers: authHeaders(doctor) },
      );

      onCreate(data);
      toast.success("Session Saved in Atlas");
      setOpen(false);
      setPatientId("");
      setTherapyName("");
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        toast.error("Room Conflict!");
      } else {
        toast.error(getApiErrorMessage(error, "Unable to schedule session."));
      }
    } finally {
      // finally block hamesha chalta hai, chahe request success ho ya error aaye
      toast.dismiss(loadingToast);
      setIsScheduling(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-1 h-4 w-4" /> New session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule a therapy session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Patient</Label>
            <Select value={patientId} onValueChange={setPatientId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={isPatientsLoading ? "Loading patients..." : "Select patient"}
                />
              </SelectTrigger>
              <SelectContent>
                {patients.length > 0 ? (
                  patients.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-patients" disabled>
                    No assigned patients
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Therapy</Label>
            <Select value={therapyName} onValueChange={setTherapyName}>
              <SelectTrigger>
                <SelectValue placeholder="Select therapy" />
              </SelectTrigger>
              <SelectContent>
                {["Snehapana", "Nasya", "Abhyanga", "Virechana"].map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input
                type="date"
                value={appointmentDate}
                onChange={(e) => setAppointmentDate(e.target.value)}
              />
            </div>
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
                <SelectTrigger>
                  <SelectValue placeholder="Select Room" />
                </SelectTrigger>
                <SelectContent>
                  {["Therapy Hall A", "Therapy Hall B", "Nasya Room", "Purgation Suite"].map(
                    (r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={isScheduling || isPatientsLoading}>
            {isScheduling ? "Scheduling..." : "Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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

function formatLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function getAppointmentStartMinutes(appointment: Appointment) {
  return timeSlotToMinutes(appointment.timeSlot ?? appointment.time);
}

function compareAppointmentsByTime(a: Appointment, b: Appointment) {
  const left = getAppointmentStartMinutes(a);
  const right = getAppointmentStartMinutes(b);

  if (!Number.isFinite(left) && !Number.isFinite(right)) return 0;
  if (!Number.isFinite(left)) return 1;
  if (!Number.isFinite(right)) return -1;

  return left - right;
}

function getAppointmentHour(appointment: Appointment) {
  const startMinutes = getAppointmentStartMinutes(appointment);
  if (!Number.isFinite(startMinutes)) return null;
  return Math.floor(startMinutes / 60);
}

function getNextAppointment(appointments: Appointment[]) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const actionable = appointments
    .filter((appointment) => ["scheduled", "ongoing"].includes(appointment.treatmentStatus))
    .sort(compareAppointmentsByTime);

  return (
    actionable.find((appointment) => {
      const startMinutes = getAppointmentStartMinutes(appointment);
      return Number.isFinite(startMinutes) && startMinutes >= nowMinutes;
    }) ??
    actionable.find((appointment) => appointment.treatmentStatus === "ongoing") ??
    null
  );
}

function getUserName(ref: UserReference, fallback: string) {
  return typeof ref === "object" && ref !== null ? ref.name : fallback;
}

function getUserId(ref: UserReference) {
  return typeof ref === "object" && ref !== null ? ref._id : ref;
}

function shortId(id: string) {
  return id.length > 8 ? `${id.slice(0, 8)}...` : id;
}

function getTherapyDisplay(therapyName: string) {
  const map: Record<string, string> = {
    Snehapana: "स्नेहपान",
    Nasya: "नस्य",
    Abhyanga: "अभ्यंग",
    Virechana: "विरेचन",
  };
  return {
    name: therapyName,
    sanskrit: map[therapyName] || "",
  };
}

/* ---------- Patients View ---------- */

function PatientsView({
  patients,
  appointments,
  isLoading,
  error,
}: {
  patients: MongoUser[];
  appointments: Appointment[];
  isLoading: boolean;
  error: string | null;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(
    () => patients.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())),
    [patients, q],
  );
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Patients under care</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="w-64 pl-9"
            placeholder="Search patients"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
      {isLoading ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading patients...
          </span>
        </div>
      ) : error ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          No active patients found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="pb-3 font-medium">Patient</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Current therapy</th>
                <th className="pb-3 font-medium">21-day progress</th>
                <th className="pb-3 font-medium">Latest metrics</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Assignment</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const patientAppointments = appointments.filter(
                  (a) => getUserId(a.patientId) === p._id,
                );
                const nextTherapy = patientAppointments[0]?.therapyName ?? "No session today";
                const scheduledMinutes = patientAppointments.reduce(
                  (sum, a) => sum + a.duration,
                  0,
                );
                const currentDay =
                  p.treatmentProfile?.currentDayNumber ??
                  patientAppointments[0]?.currentDayNumber ??
                  1;
                const pct = Math.round((currentDay / 21) * 100);
                const metrics = p.healthMetrics;
                return (
                  <tr
                    key={p._id}
                    className="border-b border-border/60 transition hover:bg-muted/40"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="bg-leaf/20 text-sm text-leaf-foreground">
                            {initials(p.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-muted-foreground">Mongo ID {shortId(p._id)}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <Badge variant="outline">{p.email}</Badge>
                    </td>
                    <td>{nextTherapy}</td>
                    <td className="min-w-[170px]">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2" />
                        <span className="text-xs text-muted-foreground">Day {currentDay}/21</span>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {patientAppointments.length} session(s), {scheduledMinutes}m today
                      </p>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {metrics ? (
                        <span>
                          D {metrics.digestion ?? "-"} · S {metrics.sleepQuality ?? "-"} · E{" "}
                          {metrics.energyLevel ?? "-"}
                        </span>
                      ) : (
                        "No report"
                      )}
                    </td>
                    <td>
                      <StatusBadge
                        status={patientAppointments.length > 0 ? "Scheduled" : "No sessions"}
                      />
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {p.assignedDoctor ? "Assigned" : "Unassigned"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "On Track": "bg-leaf/20 text-leaf-foreground border-leaf/30",
    "Needs Review": "bg-saffron/25 text-earth border-saffron/40",
    Completed: "bg-muted text-muted-foreground border-border",
    Scheduled: "bg-leaf/20 text-leaf-foreground border-leaf/30",
    "No sessions": "bg-muted text-muted-foreground border-border",
    scheduled: "bg-leaf/20 text-leaf-foreground border-leaf/30",
    ongoing: "bg-saffron/25 text-earth border-saffron/40",
    completed: "bg-muted text-muted-foreground border-border",
    missed: "bg-destructive/10 text-destructive border-destructive/30",
  };
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${map[status] ?? map["No sessions"]}`}
    >
      {status}
    </span>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

/* ---------- Feedback ---------- */

function FeedbackView({ feedbackEntries }: { feedbackEntries: FeedbackEntry[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-xl font-semibold">Live patient feedback</h2>
        {feedbackEntries.length === 0 ? (
          <div className="grid min-h-48 place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            No patient feedback has been submitted yet.
          </div>
        ) : (
          <div className="space-y-3">
            {feedbackEntries.map((f) => (
              <div key={f._id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-saffron/30 text-sm text-earth">
                        {initials(f.patientName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{f.patientName}</p>
                      <p className="text-xs text-muted-foreground">
                        {f.submittedAt} · feeling {f.rating}/5
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {f.symptoms.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">
                        {s}
                      </Badge>
                    ))}
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
        )}
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-display text-xl font-semibold">Cohort wellbeing</h2>
        <p className="text-sm text-muted-foreground">
          Average self-reported scores from active patients
        </p>
        <div className="mt-5 h-72">
          {feedbackEntries.length === 0 ? (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
              Feedback charts will appear after patients submit reports.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cohortAverages(feedbackEntries)}>
                <CartesianGrid
                  stroke="var(--color-border)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                />
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
                <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-leaf)" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </div>
  );
}

function cohortAverages(feedbackEntries: FeedbackEntry[]) {
  const avg = (k: "energy" | "digestion" | "sleep") =>
    +(feedbackEntries.reduce((s, f) => s + f[k], 0) / feedbackEntries.length).toFixed(1);
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
      <p className="text-sm font-semibold text-foreground">
        {value}
        <span className="text-muted-foreground">/10</span>
      </p>
    </div>
  );
}

/* ---------- Insights ---------- */

function InsightsView({ appointments }: { appointments: Appointment[] }) {
  const data = useMemo(() => sessionsByHour(appointments), [appointments]);

  return (
    <Card className="p-5">
      <h2 className="font-display text-xl font-semibold">Scheduled sessions by hour</h2>
      <p className="text-sm text-muted-foreground">
        Timeline load based on today's MongoDB appointments
      </p>
      <div className="mt-5 h-80">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center text-sm text-muted-foreground">
            No active sessions today.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
              />
              <YAxis tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="sessions"
                stroke="var(--color-primary)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--color-saffron)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}

function sessionsByHour(appointments: Appointment[]) {
  const buckets = new Map<string, { hour: string; sessions: number; minutes: number }>();
  appointments.forEach((appointment) => {
    const startMinutes = getAppointmentStartMinutes(appointment);
    const hour = Number.isFinite(startMinutes)
      ? formatTimelineHour(Math.floor(startMinutes / 60))
      : "Time pending";
    const existing = buckets.get(hour) ?? { hour, sessions: 0, minutes: 0 };
    existing.sessions += 1;
    existing.minutes += appointment.duration;
    buckets.set(hour, existing);
  });

  return Array.from(buckets.values()).sort((a, b) => {
    if (a.hour === "Time pending") return 1;
    if (b.hour === "Time pending") return -1;
    return a.hour.localeCompare(b.hour);
  });
}

/* ---------- Notifications ---------- */

function NotificationsBell({ notifications }: { notifications: NotificationItem[] }) {
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
          {notifications.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No clinic alerts.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n._id} className="px-4 py-3">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {n.time}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
