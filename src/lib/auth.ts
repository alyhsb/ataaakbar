import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import { loadAll, resetStore, recordDonorLogin } from "@/lib/donors-store";

export type AppRole = "admin" | "owner" | "donor";

type AuthState = {
  ready: boolean;
  userId: string | null;
  email: string | null;
  role: AppRole | null;
};

let state: AuthState = { ready: false, userId: null, email: null, role: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getState = () => state;

let started = false;

async function applySession(userId: string | null, email: string | null) {
  if (!userId) {
    state = { ready: true, userId: null, email: null, role: null };
    resetStore();
    emit();
    return;
  }
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r) => r.role as AppRole);
  const role: AppRole = roles.includes("admin")
    ? "admin"
    : roles.includes("owner")
      ? "owner"
      : "donor";
  state = { ready: true, userId, email, role };
  emit();
  await loadAll();
  void recordDonorLogin(userId);
}

export function initAuth() {
  if (started || typeof window === "undefined") return;
  started = true;

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
    void applySession(session?.user.id ?? null, session?.user.email ?? null);
  });

  void supabase.auth
    .getSession()
    .then(({ data }) => applySession(data.session?.user.id ?? null, data.session?.user.email ?? null));
}

export function useAuth() {
  return useSyncExternalStore(subscribe, getState, getState);
}

export async function signOut() {
  await supabase.auth.signOut();
  state = { ready: true, userId: null, email: null, role: null };
  resetStore();
  emit();
}
