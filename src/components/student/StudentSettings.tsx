"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Globe, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { StudentHeading, StudentPanel } from "./StudentUi";
import { StudentAvatar } from "./StudentAvatar";
import { initialStudentProfile } from "@/lib/student/demo";

const profileGroups = [
  { title: "Personal Details", fields: [{ key: "name", label: "Student name" }, { key: "username", label: "Username" }, { key: "dob", label: "Date of birth", type: "date" }, { key: "gender", label: "Gender", type: "gender" }] },
  { title: "Parent Details", fields: [{ key: "parentName", label: "Parent name" }, { key: "parentEmail", label: "Parent email", type: "email" }, { key: "parentPhone", label: "Parent contact number", type: "tel" }] },
  { title: "Education Details", fields: [{ key: "standard", label: "Standard / class" }] },
  { title: "Contact Details", fields: [{ key: "mobile", label: "Student mobile number", type: "tel" }, { key: "alternate", label: "Alternate contact", type: "tel" }, { key: "email", label: "Student email", type: "email" }] },
  { title: "Address", fields: [{ key: "address", label: "Residential address" }, { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "pincode", label: "Pincode" }, { key: "permanent", label: "Permanent address" }] },
  { title: "Student Source", fields: [{ key: "source", label: "How did you hear about us?", type: "source" }] },
];
const notificationLabels = ["Session reminder: one hour before", "Session reminder: one day before", "Session reminder: at session start", "Promotional campaigns", "WhatsApp", "Email", "SMS", "Push"];

export function StudentSettings({ tab }: { tab: "profile" | "preferences" }) {
  return <><StudentHeading title="Settings" description="Preview your profile and learning preferences. Use fictional values only; changes are temporary." icon={Settings} /><nav aria-label="Settings pages" className="mb-5 flex gap-2">{(["profile", "preferences"] as const).map((item) => <Link key={item} href={`/student/settings/${item}`} aria-current={tab === item ? "page" : undefined} className={cn("rounded-xl px-4 py-3 text-sm font-semibold", tab === item ? "bg-accent text-accent-fg" : "bg-surface text-accent")}>{item === "profile" ? "Profile" : "Preferences"}</Link>)}</nav>{tab === "profile" ? <Profile /> : <Preferences />}</>;
}

function Profile() {
  const [values, setValues] = useState(initialStudentProfile);
  const [draft, setDraft] = useState(initialStudentProfile);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <form onSubmit={(event) => { event.preventDefault(); setValues(draft); setEditing(false); setSaved(true); toast.success("Profile preview updated for this page only."); }}>
      <div className="student-account-identity mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5">
        <StudentAvatar className="h-16 w-16" />
        <div className="min-w-0"><h2 className="font-serif text-2xl font-semibold break-words">{values.name}</h2><p className="mt-1 text-sm text-muted">Your student profile</p><p className="mt-2 text-xs text-muted">Illustrated demo avatar. Profile photo uploads are not connected.</p></div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-xs leading-relaxed text-muted">Editable fields and validation are proposals pending IBMV approval. No account information is changed.</p>{!editing ? <Button variant="soft-info" onClick={() => { setDraft(values); setEditing(true); setSaved(false); }}>Edit sample profile</Button> : <div className="flex gap-2"><Button onClick={() => setEditing(false)}>Cancel</Button><Button type="submit" variant="success">Apply preview</Button></div>}</div>
      {saved ? <p role="status" className="mb-4 rounded-xl bg-teal-500/10 p-3 text-sm">Preview updated. Leaving this page resets these values.</p> : null}
      <div className="space-y-5">{profileGroups.map((group) => <StudentPanel key={group.title} title={group.title}><div className="grid gap-4 sm:grid-cols-2">{group.fields.map((field) => {
        const id = `student-${field.key}`;
        const value = (editing ? draft : values)[field.key] ?? "";
        const update = (next: string) => setDraft((previous) => ({ ...previous, [field.key]: next }));
        return <Field key={field.key} id={id} label={field.label}>
          {!editing ? <p className="min-h-11 rounded-xl bg-accent-soft/40 px-3 py-3 text-sm break-words">{value || "Not provided in demo"}</p>
            : field.type === "date" ? <DatePicker id={id} value={value} onValueChange={update} max="2026-10-26" />
              : field.type === "gender" || field.type === "source" ? <Select id={id} value={value} onValueChange={update} options={field.type === "gender" ? [{ value: "", label: "Prefer not to say" }, { value: "female", label: "Female" }, { value: "male", label: "Male" }, { value: "other", label: "Other" }] : [{ value: "", label: "Not specified" }, { value: "website", label: "Website" }, { value: "friend", label: "Friend or family" }, { value: "other", label: "Other" }]} />
                : <input id={id} type={field.type ?? "text"} value={value} maxLength={field.key.toLowerCase().includes("address") || field.key === "permanent" ? 300 : 120} onChange={(event) => update(event.target.value)} className={inputClass} required={field.key === "name" || field.key === "email"} pattern={field.key === "name" ? ".*\\S.*" : undefined} autoComplete="off" />}
        </Field>;
      })}</div></StudentPanel>)}</div>
    </form>
  );
}

function Preferences() {
  const [zone, setZone] = useState("Asia/Kolkata");
  const [enabled, setEnabled] = useState<string[]>(["Session reminder: one hour before", "Email"]);
  const [saved, setSaved] = useState(false);
  return (
    <div className="space-y-5">
      <StudentPanel title="Timezone">
        <div className="mb-4 inline-flex rounded-xl bg-sky-500/10 p-3 text-sky-700 dark:text-sky-300"><Globe className="size-6" aria-hidden="true" /></div>
        <Field id="student-timezone" label="Timezone"><Select id="student-timezone" value={zone} onValueChange={(next) => { setZone(next); setSaved(false); }} options={[...new Set(["Asia/Kolkata", "UTC", "Europe/London", "America/New_York", "Australia/Sydney", zone])].map((value) => ({ value, label: value }))} /></Field>
        <Button className="mt-4" variant="soft-info" onClick={() => { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone); setSaved(false); }}>Set Timezone Automatically</Button>
        <p className="mt-3 text-xs text-muted">Preference preview only. The sample calendar remains explicitly labelled Asia/Kolkata (IST).</p>
      </StudentPanel>
      <StudentPanel title="Notifications">
        <p className="mb-4 flex items-center gap-2 text-sm text-muted"><Bell className="size-4 shrink-0" aria-hidden="true" />No messages or reminders are delivered.</p>
        <div className="divide-y divide-border">{notificationLabels.map((label) => <label key={label} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 text-sm"><span>{label}</span><input className="size-5 shrink-0 accent-teal-600" type="checkbox" checked={enabled.includes(label)} onChange={(event) => { setEnabled((previous) => event.target.checked ? [...previous, label] : previous.filter((item) => item !== label)); setSaved(false); }} /></label>)}</div>
      </StudentPanel>
      <div className="flex flex-wrap gap-3"><Button variant="success" onClick={() => { setSaved(true); toast.success("Preferences preview applied. Nothing saved to a server."); }}>Apply preferences preview</Button><Button onClick={() => { setZone("Asia/Kolkata"); setEnabled(["Session reminder: one hour before", "Email"]); setSaved(false); }}>Reset preview</Button></div>
      {saved ? <p role="status" className="rounded-xl bg-teal-500/10 p-4 text-sm">Preview applied for this page only. Selected timezone: {zone}. Leaving this page resets preferences.</p> : null}
    </div>
  );
}
