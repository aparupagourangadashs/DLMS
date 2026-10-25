"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DemoNotice, PageHeader } from "../PageHeader";

const channels = ["Email", "WhatsApp", "SMS", "Push"] as const;
type Channel = (typeof channels)[number];

const events: Array<{ key: string; label: string; description: string; defaults: Channel[] }> = [
  { key: "welcome", label: "Welcome / registration", description: "When a learner creates an account.", defaults: ["Email", "WhatsApp"] },
  { key: "enrolled", label: "Enrolment confirmed", description: "After enrolment or successful payment.", defaults: ["Email", "WhatsApp", "Push"] },
  { key: "reminder-day", label: "Session reminder – 1 day before", description: "Sent the day before a live class.", defaults: ["Email"] },
  { key: "reminder-hour", label: "Session reminder – 1 hour before", description: "Sent an hour before a live class.", defaults: ["WhatsApp", "Push"] },
  { key: "reminder-start", label: "Session starting now", description: "Sent when the class begins.", defaults: ["Push"] },
  { key: "payment-failed", label: "Payment failed", description: "When a Razorpay payment fails.", defaults: ["Email"] },
  { key: "certificate", label: "Certificate issued", description: "When a certificate becomes available.", defaults: ["Email", "Push"] },
  { key: "result", label: "Assessment evaluated", description: "When marks are published.", defaults: ["Email", "Push"] },
];

const initialState = () => Object.fromEntries(events.map((e) => [e.key, new Set<Channel>(e.defaults)]));

export function SystemNotifications() {
  const [state, setState] = useState<Record<string, Set<Channel>>>(initialState);
  const [dirty, setDirty] = useState(false);

  const toggle = (key: string, ch: Channel) => {
    setState((prev) => {
      const next = new Set(prev[key]);
      if (next.has(ch)) next.delete(ch);
      else next.add(ch);
      return { ...prev, [key]: next };
    });
    setDirty(true);
  };

  return (
    <>
      <PageHeader
        title="System Notifications"
        description="Choose which automatic messages are sent, and on which channels."
        status="proposed"
        actions={
          <>
            <Button
              disabled={!dirty}
              onClick={() => {
                setState(initialState());
                setDirty(false);
              }}
            >
              Reset
            </Button>
            <Button
              variant="primary"
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                toast.success("Notification settings saved", { description: "Demo only: they aren't saved yet." });
              }}
            >
              Save changes
            </Button>
          </>
        }
      />
      <DemoNotice>WhatsApp and SMS use IBMV&apos;s own provider accounts, and WhatsApp templates need provider approval. Learners can still opt out of each channel.</DemoNotice>
      <Card className="relative overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">Automatic notifications by channel</caption>
          <thead>
            <tr className="border-b border-border bg-surface-muted/60 text-left text-xs font-semibold tracking-wide text-muted uppercase">
              <th scope="col" className="px-5 py-3">Notification</th>
              {channels.map((c) => (
                <th key={c} scope="col" className="px-4 py-3 text-center">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.key} className="border-b border-border last:border-0">
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <span className="block font-medium">{e.label}</span>
                  <span className="block text-xs text-muted">{e.description}</span>
                </th>
                {channels.map((c) => {
                  const on = state[e.key].has(c);
                  return (
                    <td key={c} className="px-4 py-3 text-center">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={on}
                        aria-label={`${e.label} by ${c}`}
                        onClick={() => toggle(e.key, c)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${on ? "bg-accent" : "bg-border"}`}
                      >
                        <span className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
