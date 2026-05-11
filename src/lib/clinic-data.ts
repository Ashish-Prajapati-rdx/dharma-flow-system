// Static demo data for AyurSutra Panchakarma Management System.

export interface Therapy {
  id: string;
  name: string;
  sanskrit: string;
  description: string;
  pre: string[];
  post: string[];
}

export const THERAPIES: Therapy[] = [
  {
    id: "snehapana",
    name: "Snehapana",
    sanskrit: "स्नेहपान",
    description: "Internal oleation with medicated ghee to mobilise toxins.",
    pre: [
      "Fast for 12 hours before the procedure",
      "Drink warm water only on the morning of the session",
      "Avoid heavy physical activity",
    ],
    post: [
      "Sip warm water throughout the day",
      "Light, easily digestible meals (rice gruel)",
      "Avoid cold foods and daytime sleep",
    ],
  },
  {
    id: "abhyanga",
    name: "Abhyanga",
    sanskrit: "अभ्यङ्ग",
    description: "Full body warm oil massage to nourish dhatus.",
    pre: ["Empty stomach for 2 hours prior", "Remove all jewellery", "Hydrate well the previous evening"],
    post: ["Warm shower after 45 minutes", "Rest for 30 minutes", "Avoid air conditioning for 2 hours"],
  },
  {
    id: "virechana",
    name: "Virechana",
    sanskrit: "विरेचन",
    description: "Therapeutic purgation to eliminate Pitta toxins.",
    pre: ["Strict liquid diet 24 hours before", "No travel scheduled for next day", "Inform practitioner of all medications"],
    post: ["Bed rest for the first day", "Follow Samsarjana Krama diet", "Avoid spicy and sour foods for 7 days"],
  },
  {
    id: "basti",
    name: "Basti",
    sanskrit: "बस्ति",
    description: "Medicated enema therapy for Vata disorders.",
    pre: ["Light dinner the night before", "Empty bladder before procedure", "Wear loose comfortable clothing"],
    post: ["Lie on left side for 15 minutes", "Drink warm cumin water", "Avoid cold drinks for 48 hours"],
  },
  {
    id: "nasya",
    name: "Nasya",
    sanskrit: "नस्य",
    description: "Nasal administration of medicated oils.",
    pre: ["Steam inhalation 10 min prior", "Avoid heavy breakfast", "Clear nasal passages"],
    post: ["Gargle with warm salt water", "Avoid cold breeze for 3 hours", "No head wash for 24 hours"],
  },
];

export interface Patient {
  id: string;
  name: string;
  age: number;
  prakriti: "Vata" | "Pitta" | "Kapha" | "Vata-Pitta" | "Pitta-Kapha";
  programDays: 7 | 21;
  dayCurrent: number;
  currentTherapy: string; // therapy id
  status: "On Track" | "Needs Review" | "Completed";
  lastUpdate: string;
}

export const PATIENTS: Patient[] = [
  { id: "p1", name: "Aarav Sharma", age: 42, prakriti: "Vata-Pitta", programDays: 21, dayCurrent: 9, currentTherapy: "snehapana", status: "On Track", lastUpdate: "2h ago" },
  { id: "p2", name: "Meera Iyer", age: 35, prakriti: "Pitta", programDays: 7, dayCurrent: 4, currentTherapy: "virechana", status: "Needs Review", lastUpdate: "20m ago" },
  { id: "p3", name: "Rohan Verma", age: 51, prakriti: "Kapha", programDays: 21, dayCurrent: 14, currentTherapy: "abhyanga", status: "On Track", lastUpdate: "1d ago" },
  { id: "p4", name: "Ananya Gupta", age: 28, prakriti: "Vata", programDays: 7, dayCurrent: 2, currentTherapy: "nasya", status: "On Track", lastUpdate: "5h ago" },
  { id: "p5", name: "Vikram Nair", age: 47, prakriti: "Pitta-Kapha", programDays: 21, dayCurrent: 21, currentTherapy: "basti", status: "Completed", lastUpdate: "3d ago" },
  { id: "p6", name: "Saanvi Reddy", age: 33, prakriti: "Vata", programDays: 21, dayCurrent: 6, currentTherapy: "abhyanga", status: "On Track", lastUpdate: "4h ago" },
];

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  therapyId: string;
  time: string; // "HH:MM"
  duration: number; // minutes
  room: string;
}

export const TODAY_APPOINTMENTS: Appointment[] = [
  { id: "a1", patientId: "p1", patientName: "Aarav Sharma", therapyId: "snehapana", time: "08:00", duration: 60, room: "Therapy Hall A" },
  { id: "a2", patientId: "p4", patientName: "Ananya Gupta", therapyId: "nasya", time: "09:30", duration: 45, room: "Nasya Room" },
  { id: "a3", patientId: "p3", patientName: "Rohan Verma", therapyId: "abhyanga", time: "11:00", duration: 75, room: "Therapy Hall B" },
  { id: "a4", patientId: "p2", patientName: "Meera Iyer", therapyId: "virechana", time: "13:30", duration: 90, room: "Purgation Suite" },
  { id: "a5", patientId: "p6", patientName: "Saanvi Reddy", therapyId: "abhyanga", time: "15:30", duration: 60, room: "Therapy Hall A" },
  { id: "a6", patientId: "p1", patientName: "Aarav Sharma", therapyId: "abhyanga", time: "17:00", duration: 60, room: "Therapy Hall B" },
];

export interface FeedbackEntry {
  id: string;
  patientId: string;
  patientName: string;
  rating: number; // 1-5
  symptoms: string[];
  note: string;
  submittedAt: string;
  energy: number;
  digestion: number;
  sleep: number;
}

export const FEEDBACK: FeedbackEntry[] = [
  { id: "f1", patientId: "p2", patientName: "Meera Iyer", rating: 3, symptoms: ["Mild headache", "Fatigue"], note: "Headache after morning purgation, hoping it eases by tomorrow.", submittedAt: "20 min ago", energy: 4, digestion: 5, sleep: 6 },
  { id: "f2", patientId: "p1", patientName: "Aarav Sharma", rating: 4, symptoms: ["Better sleep"], note: "Slept 8 hours straight, joints feel lighter.", submittedAt: "2 hours ago", energy: 7, digestion: 6, sleep: 8 },
  { id: "f3", patientId: "p4", patientName: "Ananya Gupta", rating: 5, symptoms: ["Clearer breathing"], note: "Sinus pressure has lifted significantly.", submittedAt: "5 hours ago", energy: 8, digestion: 7, sleep: 7 },
  { id: "f4", patientId: "p6", patientName: "Saanvi Reddy", rating: 4, symptoms: ["Calm mind"], note: "Anxiety reduced after today's Abhyanga.", submittedAt: "4 hours ago", energy: 7, digestion: 6, sleep: 7 },
];

// Patient-specific recovery metrics for charts (current logged-in patient demo)
export const RECOVERY_TIMELINE = [
  { day: "D1", energy: 3, sleep: 4, digestion: 4 },
  { day: "D3", energy: 4, sleep: 5, digestion: 5 },
  { day: "D5", energy: 5, sleep: 6, digestion: 6 },
  { day: "D7", energy: 6, sleep: 7, digestion: 7 },
  { day: "D9", energy: 7, sleep: 7, digestion: 7 },
  { day: "D11", energy: 7, sleep: 8, digestion: 8 },
  { day: "D14", energy: 8, sleep: 8, digestion: 8 },
];

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "session" | "diet" | "alert";
}

export const PATIENT_NOTIFICATIONS: NotificationItem[] = [
  { id: "n1", title: "Snehapana session tomorrow at 08:00", body: "Begin a 12-hour fast from 8 PM tonight. Sip warm water only.", time: "30 min ago", type: "session" },
  { id: "n2", title: "Dietary precaution", body: "Avoid cold and raw foods for the next 48 hours.", time: "3 hours ago", type: "diet" },
  { id: "n3", title: "Hydration reminder", body: "Aim for 2.5L warm water daily during this phase.", time: "Yesterday", type: "alert" },
];

export const DOCTOR_NOTIFICATIONS: NotificationItem[] = [
  { id: "dn1", title: "Meera Iyer flagged for review", body: "Reported headache after Virechana, energy at 4/10.", time: "20 min ago", type: "alert" },
  { id: "dn2", title: "Room conflict resolved", body: "Therapy Hall A double-booking auto-rescheduled.", time: "1 hour ago", type: "session" },
  { id: "dn3", title: "Inventory low: Mahanarayan oil", body: "Restock recommended within 3 days.", time: "Yesterday", type: "diet" },
];

export function getTherapy(id: string): Therapy {
  return THERAPIES.find((t) => t.id === id) ?? THERAPIES[0];
}
