export interface TreatmentInstructions {
  pre: string[];
  post: string[];
}

const defaultInstructions: TreatmentInstructions = {
  pre: [
    "Arrive 15 minutes early and avoid rushing before the procedure.",
    "Keep meals light unless your practitioner has given a specific diet plan.",
    "Carry previous observations about sleep, digestion, appetite, and energy.",
  ],
  post: [
    "Rest quietly after the session and avoid cold drinks or heavy exertion.",
    "Follow the diet and bathing timing advised by your practitioner.",
    "Report unusual discomfort, dizziness, nausea, or fatigue promptly.",
  ],
};

const instructionMap: Record<string, TreatmentInstructions> = {
  nasya: {
    pre: [
      "Keep the face, neck, and shoulders relaxed before therapy.",
      "Avoid a heavy meal for at least 2 hours before the session.",
      "Do not apply strong fragrance, nasal sprays, or cold compresses unless prescribed.",
    ],
    post: [
      "Avoid cold air, dust exposure, and loud speaking immediately after therapy.",
      "Sip warm water and rest with the head protected from wind.",
      "Do not suppress natural urges; report headache, irritation, or excess discharge.",
    ],
  },
  basti: {
    pre: [
      "Follow the meal timing given by your doctor, usually a light warm meal beforehand.",
      "Keep the abdomen relaxed and avoid strenuous exercise before arrival.",
      "Tell the team about constipation, loose stools, pain, or appetite changes.",
    ],
    post: [
      "Stay near the clinic area until your practitioner confirms the response is stable.",
      "Prefer warm, simple food and avoid raw, cold, or heavy items that day.",
      "Track bowel response and abdominal comfort in the daily report.",
    ],
  },
  abhyanga: {
    pre: [
      "Avoid heavy food and keep the body comfortably warm before the session.",
      "Remove jewelry and inform the therapist about tender or painful areas.",
      "Share any skin sensitivity or oil allergy before treatment starts.",
    ],
    post: [
      "Rest before bathing and use warm water only when cleared by the team.",
      "Avoid chilled food, cold exposure, and intense activity for the day.",
      "Hydrate with warm water and monitor fatigue or heaviness.",
    ],
  },
  virechana: {
    pre: [
      "Follow the exact preparation diet and medicine timing prescribed by the doctor.",
      "Avoid travel, meetings, and exertion on the purgation day.",
      "Report appetite, bowel habit, nausea, and sleep before the procedure begins.",
    ],
    post: [
      "Follow the post-purgation diet sequence exactly as advised.",
      "Avoid daytime sleep, cold exposure, and heavy meals during recovery.",
      "Track bowel count, weakness, thirst, and abdominal comfort.",
    ],
  },
  snehapana: {
    pre: [
      "Arrive fasting or as instructed for internal oleation.",
      "Avoid cold food, heavy dinner, and late nights before therapy.",
      "Report nausea, appetite, thirst, and bowel pattern before dosing.",
    ],
    post: [
      "Drink warm water only as advised and avoid cold exposure.",
      "Eat only when true hunger returns and follow the prescribed food plan.",
      "Record digestion, burping, nausea, and heaviness in the daily report.",
    ],
  },
};

export const getTreatmentInstructions = (
  therapyName: string,
): TreatmentInstructions => {
  const normalized = therapyName
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .trim();

  const key = Object.keys(instructionMap).find((name) =>
    normalized.includes(name),
  );

  return key ? instructionMap[key] : defaultInstructions;
};
