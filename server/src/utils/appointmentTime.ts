export const APPOINTMENT_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const formatSystemDate = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const isAppointmentDate = (value: unknown): value is string =>
  typeof value === "string" && APPOINTMENT_DATE_REGEX.test(value);

export const normalizeTimeSlot = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const trimmed = value.trim().toUpperCase();
  const twelveHour = /^(0?[1-9]|1[0-2]):([0-5]\d)\s?(AM|PM)$/.exec(trimmed);
  if (twelveHour) {
    const [, rawHour, minutes, period] = twelveHour;
    return `${rawHour.padStart(2, "0")}:${minutes} ${period}`;
  }

  const twentyFourHour = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!twentyFourHour) return null;

  const [, rawHour, minutes] = twentyFourHour;
  const hour = Number(rawHour);
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${period}`;
};

export const timeSlotToMinutes = (timeSlot: string): number | null => {
  const normalized = normalizeTimeSlot(timeSlot);
  if (!normalized) return null;

  const match = /^(\d{2}):([0-5]\d)\s(AM|PM)$/.exec(normalized);
  if (!match) return null;

  const [, rawHour, rawMinutes, period] = match;
  let hour = Number(rawHour);
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;
  return hour * 60 + Number(rawMinutes);
};

export const timeSlotToTwentyFourHour = (timeSlot: string): string => {
  const minutes = timeSlotToMinutes(timeSlot);
  if (minutes === null) return timeSlot;

  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

export const buildSlotLocks = (
  timeSlot: string,
  duration: number,
  granularityMinutes = 15,
): string[] => {
  const startMinutes = timeSlotToMinutes(timeSlot);
  if (startMinutes === null || duration <= 0) return [];

  const locks = new Set<string>();
  const firstBucket =
    Math.floor(startMinutes / granularityMinutes) * granularityMinutes;
  const endBucket =
    Math.ceil((startMinutes + duration) / granularityMinutes) *
    granularityMinutes;

  for (
    let cursor = firstBucket;
    cursor < endBucket;
    cursor += granularityMinutes
  ) {
    locks.add(String(cursor).padStart(4, "0"));
  }

  return Array.from(locks);
};
