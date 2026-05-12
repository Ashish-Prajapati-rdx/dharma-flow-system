import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "@/components/login-card";

export const Route = createFileRoute("/login/doctor")({
  head: () => ({
    meta: [
      { title: "Practitioner Sign in — AyurSutra" },
      { name: "description", content: "Sign in to manage Panchakarma schedules, patients and feedback." },
    ],
  }),
  component: () => <LoginCard role="doctor" />,
});
