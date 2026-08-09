import { useSyncExternalStore } from "react";

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "ataa-theme";

let mode: ThemeMode = "system";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};
const getMode = () => mode;
const getServerMode = (): ThemeMode => "system";

function systemPrefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function apply() {
  if (typeof document === "undefined") return;
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

let started = false;

export function initTheme() {
  if (started || typeof window === "undefined") return;
  started = true;
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark" || saved === "system") mode = saved;
  apply();
  emit();
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (mode === "system") apply();
  });
}

export function setThemeMode(next: ThemeMode) {
  mode = next;
  if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, next);
  apply();
  emit();
}

export function useThemeMode() {
  return useSyncExternalStore(subscribe, getMode, getServerMode);
}

/** Inline script that applies the saved theme before first paint. */
export const themeBootstrapScript = `(function(){try{var m=localStorage.getItem('${STORAGE_KEY}')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
