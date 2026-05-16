// Browser session store for API-authenticated users.
import { useEffect, useState } from "react";

export type Role = "doctor" | "patient";

export interface SessionUser {
  id?: string;
  role: Role;
  name: string;
  email: string;
  token?: string;
}

const KEY = "ayursutra_session";

export function getSession(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("ayursutra:session"));
}

export function clearSession() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("ayursutra:session"));
}

export function useSession() {
  const [user, setUser] = useState<SessionUser | null>(null);
  useEffect(() => {
    setUser(getSession());
    const handler = () => setUser(getSession());
    window.addEventListener("ayursutra:session", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("ayursutra:session", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return user;
}
