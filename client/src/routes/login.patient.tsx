import { createFileRoute } from "@tanstack/react-router";
import { LoginCard } from "@/components/login-card";

export const Route = createFileRoute("/login/patient")({
  head: () => ({
    meta: [
      { title: "Patient Sign in — AyurSutra" },
      { name: "description", content: "Sign in to track your Panchakarma detox journey, precautions and reports." },
    ],
  }),
  component: () => <LoginCard role="patient" />,
});
