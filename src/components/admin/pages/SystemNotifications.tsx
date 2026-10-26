"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Check, Mail, MessageCircle, MessageSquare, RotateCcw, Save, Smartphone, X, type LucideIcon } from "lucide-react";
import { palette, type ColorKey } from "@/lib/colors";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import { DemoNotice, PageHeader } from "../PageHeader";

const channels = ["Email", "WhatsApp", "SMS", "Push"] as const;
type Channel = (typeof channels)[number];
const channelIcons: Record<Channel, LucideIcon> = { Email: Mail, WhatsApp: MessageCircle, SMS: MessageSquare, Push: Smartphone };
const channelColors: Record<Channel, ColorKey> = { Email: "blue", WhatsApp: "emerald", SMS: "violet", Push: "orange" };

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
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
            <Button
              variant="success"
              disabled={!dirty}
              onClick={() => {
                setDirty(false);
                toast.success("Notification settings saved", { description: "Demo only: they aren't saved yet." });
              }}
            >
              <Save className="size-4" aria-hidden="true" />
              Save changes
            </Button>
          </>
        }
      />
      <DemoNotice>WhatsApp and SMS use IBMV&apos;s own provider accounts, and WhatsApp templates need provider approval. Learners can still opt out of each channel.</DemoNotice>
      <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Enabled notifications by channel">
        {channels.map((channel) => {
          const Icon = channelIcons[channel];
          return <StatCard key={channel} label={channel} value={String(events.filter((event) => state[event.key].has(channel)).length)} hint={`of ${events.length} notifications enabled`} color={channelColors[channel]} icon={<Icon />} />;
        })}
      </section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Bell className="size-4 text-violet-500" aria-hidden="true" />Notification preferences</h2>
        <p className={dirty ? "text-warning" : "text-muted"} role="status">{dirty ? "Unsaved changes" : "Demo configuration"}</p>
      </div>
      <Card className="admin-table-card">
        <TableScroll label="Automatic notifications by channel">
        <table className="admin-data-table">
          <caption className="sr-only">Automatic notifications by channel</caption>
          <thead>
            <tr>
              <th scope="col"><TableHeading icon={Bell}>Notification</TableHeading></th>
              {channels.map((c) => (
                <th key={c} scope="col" className="px-4 py-3 text-center">
                  <TableHeading icon={channelIcons[c]}>{c}</TableHeading>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.key} className="border-b border-border last:border-0">
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <span className="admin-table-identity">
                    <span className="admin-table-avatar" aria-hidden="true"><Bell className="size-4" /></span>
                    <span className="min-w-56">
                      <span className="block font-semibold">{e.label}</span>
                      <span className="mt-0.5 block text-xs text-muted">{e.description}</span>
                    </span>
                  </span>
                </th>
                {channels.map((c) => {
                  const on = state[e.key].has(c);
                  return (
                    <td key={c} className="text-center">
                      <label className="relative inline-flex min-h-11 min-w-12 cursor-pointer items-center justify-center">
                        <input
                          type="checkbox"
                          role="switch"
                          checked={on}
                          aria-label={`${e.label} by ${c}`}
                          onChange={() => toggle(e.key, c)}
                          className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        />
                        <span className={`pointer-events-none inline-flex h-7 w-12 items-center rounded-full p-1 shadow-inner transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent ${on ? palette[channelColors[c]].bar : "bg-surface-muted ring-1 ring-border"}`} aria-hidden="true">
                          <span className={`inline-flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${on ? "translate-x-5 text-emerald-700" : "translate-x-0 text-slate-500"}`}>
                            {on ? <Check className="size-3" /> : <X className="size-3" />}
                          </span>
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        </TableScroll>
      </Card>
    </>
  );
}
