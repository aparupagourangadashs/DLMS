"use client";

import { useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";

const memory = new Map<string, string>();
const eventName = "admin-demo-records";
function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key) memory.delete(event.key);
    else memory.clear();
    notify();
  };
  window.addEventListener(eventName, notify);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(eventName, notify); window.removeEventListener("storage", onStorage); };
}

/** Local fixtures only; versioned keys keep these separate from backend records. */
export function useDemoRecords<T>(key: string, initial: T[]) {
  const fallback = JSON.stringify(initial);
  const snapshot = useSyncExternalStore(subscribe, () => {
    try { return memory.get(key) ?? localStorage.getItem(key) ?? fallback; }
    catch { return memory.get(key) ?? fallback; }
  }, () => fallback);
  const records = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(snapshot);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch { /* A corrupt local fixture is replaced with the shipped demo. */ }
    return initial;
  }, [snapshot, initial]);
  function save(next: T[]) {
    const json = JSON.stringify(next);
    memory.set(key, json);
    try {
      localStorage.setItem(key, json);
      toast.success("Saved in this browser only", { description: "Demo data. No server or external provider was updated." });
    } catch {
      toast.warning("Browser storage unavailable", { description: "Changes are available in memory only and will be lost on reload." });
    }
    window.dispatchEvent(new Event(eventName));
  }
  return [records, save] as const;
}
