"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bell, BookOpen, CalendarDays, Check, ClipboardCheck, GraduationCap, Mail, Megaphone, MessageCircle, MessageSquare, RotateCcw, Save, Settings2, ShieldCheck, Smartphone, Users, Wallet, X, type LucideIcon } from "lucide-react";
import { cardCycle, palette, type ColorKey } from "@/lib/colors";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import { DemoNotice, PageHeader } from "../PageHeader";

const channels = ["Email", "WhatsApp", "SMS", "Push"] as const;
type Channel = (typeof channels)[number];
type Family = { key: string; label: string; events: Array<{ key: string; label: string; description: string; defaults: Channel[] }> };

const families: Family[] = [
  { key: "account", label: "Account", events: [
    { key: "welcome", label: "Welcome / registration", description: "When a learner creates an account.", defaults: ["Email", "WhatsApp"] },
    { key: "profile", label: "Profile updated", description: "When account details are changed.", defaults: ["Email"] },
  ] },
  { key: "enrolment", label: "Enrolment", events: [
    { key: "enrolled", label: "Enrolment confirmed", description: "After enrolment or successful payment.", defaults: ["Email", "WhatsApp", "Push"] },
    { key: "course-access", label: "Course access granted", description: "When a course becomes available to a learner.", defaults: ["Email", "Push"] },
  ] },
  { key: "sessions", label: "Sessions", events: [
    { key: "reminder-day", label: "Session reminder – 1 day before", description: "Sent the day before a live class.", defaults: ["Email"] },
    { key: "reminder-hour", label: "Session reminder – 1 hour before", description: "Sent an hour before a live class.", defaults: ["WhatsApp", "Push"] },
    { key: "reminder-start", label: "Session starting now", description: "Sent when the class begins.", defaults: ["Push"] },
  ] },
  { key: "assessments", label: "Assessments", events: [
    { key: "assessment-open", label: "Assessment available", description: "When a scheduled assessment opens.", defaults: ["Email", "Push"] },
    { key: "result", label: "Assessment evaluated", description: "When marks are published.", defaults: ["Email", "Push"] },
  ] },
  { key: "certificates", label: "Certificates", events: [
    { key: "certificate", label: "Certificate issued", description: "When a certificate becomes available.", defaults: ["Email", "Push"] },
  ] },
  { key: "payments", label: "Payments", events: [
    { key: "payment-receipt", label: "Payment receipt", description: "After payment confirmation.", defaults: ["Email", "WhatsApp"] },
    { key: "payment-failed", label: "Payment failed", description: "When a payment attempt is unsuccessful.", defaults: ["Email"] },
    { key: "refund", label: "Refund update", description: "When a refund status changes.", defaults: ["Email"] },
  ] },
  { key: "products", label: "Products", events: [
    { key: "product-update", label: "Course or product update", description: "When enrolled product information changes.", defaults: ["Email"] },
    { key: "new-product", label: "New product announcement", description: "Optional update about new learning products.", defaults: [] },
  ] },
  { key: "community", label: "Community", events: [
    { key: "community-invite", label: "Community invitation", description: "When a learner is invited to a community.", defaults: ["Email", "Push"] },
    { key: "community-mention", label: "Mention or reply", description: "When a learner is mentioned or receives a reply.", defaults: ["Push"] },
  ] },
  { key: "announcements", label: "Announcements", events: [
    { key: "announcement", label: "New announcement", description: "When an announcement is published for a learner.", defaults: ["Email", "Push"] },
  ] },
];

const channelIcons: Record<Channel, LucideIcon> = { Email: Mail, WhatsApp: MessageCircle, SMS: MessageSquare, Push: Smartphone };
const channelColors: Record<Channel, ColorKey> = { Email: "blue", WhatsApp: "emerald", SMS: "violet", Push: "orange" };
type Preferences = Record<string, Set<Channel>>;
type GlobalChannels = Record<Channel, boolean>;

const initialPreferences = (): Preferences => Object.fromEntries(families.flatMap((family) => family.events.map((event) => [event.key, new Set<Channel>(event.defaults)])));
const initialGlobal: GlobalChannels = { Email: true, WhatsApp: true, SMS: true, Push: true };
const familyIcons: LucideIcon[] = [Users, GraduationCap, CalendarDays, ClipboardCheck, ShieldCheck, Wallet, BookOpen, MessageCircle, Megaphone];

function ChannelSwitch({ channel, label, checked, disabled = false, onChange }: { channel: Channel; label: string; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return <label className={cn("relative inline-flex min-h-11 min-w-12 items-center justify-center", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} aria-label={label} onChange={onChange} className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed" />
    <span className={cn("pointer-events-none inline-flex h-7 w-12 items-center rounded-full p-1 shadow-inner transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent", checked ? palette[channelColors[channel]].bar : "bg-surface-muted ring-1 ring-border")} aria-hidden="true">
      <span className={cn("inline-flex size-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5 text-emerald-700" : "translate-x-0 text-slate-500")}>{checked ? <Check className="size-3" /> : <X className="size-3" />}</span>
    </span>
  </label>;
}

export function SystemNotifications() {
  const [preferences, setPreferences] = useState<Preferences>(initialPreferences);
  const [global, setGlobal] = useState<GlobalChannels>(initialGlobal);
  const [activeFamily, setActiveFamily] = useState(families[0].key);
  const [dirty, setDirty] = useState(false);
  const [managing, setManaging] = useState(false);
  const allEvents = families.flatMap((family) => family.events);
  const family = families.find((item) => item.key === activeFamily) ?? families[0];
  const enabledCounts = useMemo(() => Object.fromEntries(channels.map((channel) => [
    channel,
    allEvents.filter((event) => preferences[event.key]?.has(channel) && global[channel]).length,
  ])) as Record<Channel, number>, [preferences, global, allEvents]);

  const toggleEvent = (key: string, channel: Channel) => {
    setPreferences((previous) => {
      const next = new Set(previous[key] ?? []);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return { ...previous, [key]: next };
    });
    setDirty(true);
  };

  const reset = () => {
    setPreferences(initialPreferences());
    setGlobal(initialGlobal);
    setDirty(false);
  };

  return (
    <>
      <PageHeader
        title="System Notifications"
        description="Configure automatic messages by event family and delivery channel."
        status="ready"
        actions={
          <>
            <Button variant="soft-info" onClick={() => setManaging(true)}>
              <Settings2 className="size-4" aria-hidden="true" /> Manage Notifications
            </Button>
            <Button variant="soft-warning" disabled={!dirty} onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" /> Reset
            </Button>
            <Button variant="success" disabled={!dirty} onClick={() => {
              setDirty(false);
              toast.success("Notification settings updated", { description: "Demo only: settings are not persisted or sent to a provider." });
            }}>
              <Save className="size-4" aria-hidden="true" /> Save changes
            </Button>
          </>
        }
      />
      <DemoNotice>Email, WhatsApp, SMS, and push delivery are not connected. Provider status below is informational; no notification is sent from this demo.</DemoNotice>
      <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Enabled notifications by channel">
        {channels.map((channel) => {
          const Icon = channelIcons[channel];
          return <StatCard key={channel} label={channel} value={String(enabledCounts[channel])} hint={`of ${allEvents.length} events active`} color={channelColors[channel]} icon={<Icon />} />;
        })}
      </section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <h2 className="flex items-center gap-2 font-semibold"><Bell className="size-4 text-violet-500" aria-hidden="true" />Notification families</h2>
        <p role="status"><Badge tone={dirty ? "warning" : "info"}>{dirty ? "Unsaved changes" : "Demo configuration"}</Badge></p>
      </div>
      <Tabs label="Notification event family" value={activeFamily} onChange={setActiveFamily} className="mb-4 gap-2 pb-1" items={families.map((item, index) => ({ value: item.key, label: item.label, count: item.events.length, icon: familyIcons[index], color: cardCycle[index % cardCycle.length] }))} />
      <Card id="notification-family-panel" role="tabpanel" aria-label={family.label} className="admin-table-card">
        <CardHeader className="bg-linear-to-r from-sky-50 to-violet-50 dark:from-sky-500/10 dark:to-violet-500/10" title={<span className="flex items-center gap-2"><Bell className={cn("size-5", palette.violet.text)} aria-hidden="true" />{family.label} notifications</span>} description="Choose the channels for each event. Global channel preferences take priority." />
        <TableScroll label={`${family.label} notifications by channel`}>
          <table className="admin-data-table">
            <caption className="sr-only">{family.label} notifications by channel</caption>
            <thead><tr>
              <th scope="col"><TableHeading icon={Bell}>Notification</TableHeading></th>
              {channels.map((channel) => <th key={channel} scope="col" className="px-4 py-3 text-center"><TableHeading icon={channelIcons[channel]}>{channel}</TableHeading></th>)}
            </tr></thead>
            <tbody>
              {family.events.map((event) => <tr key={event.key} className="border-b border-border last:border-0">
                <th scope="row" className="px-5 py-3 text-left font-normal">
                  <span className="admin-table-identity">
                    <span className="admin-table-avatar" aria-hidden="true"><Bell className="size-4" /></span>
                    <span className="min-w-56"><span className="block font-semibold">{event.label}</span><span className="mt-0.5 block text-xs text-muted">{event.description}</span></span>
                  </span>
                </th>
                {channels.map((channel) => {
                  const selected = preferences[event.key]?.has(channel) ?? false;
                  const checked = selected && global[channel];
                  return <td key={channel} className="text-center"><ChannelSwitch channel={channel} checked={checked} disabled={!global[channel]} label={`${event.label} by ${channel}${global[channel] ? "" : " (globally disabled)"}`} onChange={() => toggleEvent(event.key, channel)} /></td>;
                })}
              </tr>)}
            </tbody>
          </table>
        </TableScroll>
      </Card>
      <Modal open={managing} onClose={() => setManaging(false)} title="Manage Notifications" description="Global channel controls and connection status." size="lg" footer={<Button variant="success" onClick={() => setManaging(false)}><Check className="size-4" aria-hidden="true" />Done</Button>}>
        <div className="space-y-5">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">Global channel controls</legend>
            {channels.map((channel) => { const Icon = channelIcons[channel]; return <div key={channel} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-medium"><span className={cn("inline-flex size-9 items-center justify-center rounded-xl", palette[channelColors[channel]].tile)}><Icon className="size-4" aria-hidden="true" /></span>{channel}</span>
              <ChannelSwitch channel={channel} checked={global[channel]} label={`Enable ${channel} globally`} onChange={() => { setGlobal((current) => ({ ...current, [channel]: !current[channel] })); setDirty(true); }} />
            </div>; })}
          </fieldset>
          <section aria-labelledby="provider-status-title">
            <h3 id="provider-status-title" className="mb-2 text-sm font-semibold">Provider status</h3>
            <ul className="space-y-2">{channels.map((channel) => <li key={channel} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm"><span>{channel} provider</span><span className="rounded-full border border-amber-300/60 bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Not connected</span></li>)}</ul>
            <p className="mt-2 text-xs text-muted">Provider setup and delivery health checks are unavailable in the local demo.</p>
          </section>
        </div>
      </Modal>
    </>
  );
}
