"use client";

import { Button } from "@/components/ui/Button";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { commonTimezones, genderOptions, sourceOptions, type LearnerPreferencesDto, type LearnerProfileDto } from "@/lib/student/profile";
import { Bell, Globe, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudentAvatar } from "./StudentAvatar";
import { StudentHeading, StudentPanel } from "./StudentUi";

const profileGroups = [
  { title: "Personal Details", fields: [{ key: "name", label: "Student name" }, { key: "username", label: "Username" }, { key: "dob", label: "Date of birth", type: "date" }, { key: "gender", label: "Gender", type: "gender" }] },
  { title: "Parent Details", fields: [{ key: "parentName", label: "Parent name" }, { key: "parentEmail", label: "Parent email", type: "email" }, { key: "parentPhone", label: "Parent contact number", type: "tel" }] },
  { title: "Education Details", fields: [{ key: "standard", label: "Standard / class" }] },
  { title: "Contact Details", fields: [{ key: "mobile", label: "Student mobile number", type: "tel" }, { key: "alternate", label: "Alternate contact", type: "tel" }, { key: "email", label: "Student email", type: "email" }] },
  { title: "Address", fields: [{ key: "address", label: "Residential address" }, { key: "city", label: "City" }, { key: "state", label: "State" }, { key: "pincode", label: "Pincode" }, { key: "permanent", label: "Permanent address" }] },
  { title: "Student Source", fields: [{ key: "source", label: "How did you hear about us?", type: "source" }] },
];
const preferenceGroups: Array<{ title: string; description?: string; items: Array<{ key: keyof LearnerPreferencesDto; label: string }> }> = [
  { title: "Session reminders", items: [{ key: "sessionReminder1Hour", label: "One hour before a session" }, { key: "sessionReminder1Day", label: "One day before a session" }, { key: "sessionReminderStart", label: "When a session starts" }] },
  { title: "Promotional campaigns", description: "News, offers and invitations from IBMV. We only send these when this switch and the channel you prefer are both on.", items: [{ key: "promotional", label: "Send me promotional messages" }] },
  { title: "Channels", items: [{ key: "whatsapp", label: "WhatsApp" }, { key: "email", label: "Email" }, { key: "sms", label: "SMS" }, { key: "push", label: "Push notifications" }] },
];

export function StudentSettings(props: { tab: "profile"; profile: LearnerProfileDto; today: string } | { tab: "preferences"; preferences: LearnerPreferencesDto }) {
  const { tab } = props;
  return <><StudentHeading title="Settings" description="Keep your details up to date and choose how IBMV reaches you. Your changes are saved to your account." icon={Settings} /><nav aria-label="Settings pages" className="mb-5 flex gap-2">{(["profile", "preferences"] as const).map((item) => <Link key={item} href={`/student/settings/${item}`} aria-current={tab === item ? "page" : undefined} className={cn("rounded-xl px-4 py-3 text-sm font-semibold", tab === item ? "bg-accent text-accent-fg" : "bg-surface text-accent")}>{item === "profile" ? "Profile" : "Preferences"}</Link>)}</nav>{props.tab === "profile" ? <Profile initial={props.profile} today={props.today} /> : <Preferences initial={props.preferences} />}</>;
}

function Profile({ initial, today }: { initial: LearnerProfileDto; today: string }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customFields, setCustomFields] = useState<Array<{ id: string; label: string; type: string; required: boolean; options: string[]; value: string }>>([]);
  useEffect(() => {
    apiClient.get<typeof customFields>("/api/student/custom-fields").then(({ data }) => setCustomFields(data)).catch(() => setCustomFields([]));
  }, []);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      // Email and registration number are not editable here, so they are not sent.
      const editable = {
        ...Object.fromEntries(Object.entries(draft).filter(([key]) => key !== "email" && key !== "registrationNo" && key !== "customFields")),
        customFields: Object.fromEntries(customFields.map((field) => [field.id, field.value])),
      };
      const result = await apiClient.patch<LearnerProfileDto>("/api/student/profile", editable);
      setValues(result.data);
      setEditing(false);
      toast.success("Profile saved");
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
        toast.error("Please correct the highlighted fields.");
      } else toast.error(error instanceof ApiError ? error.message : "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} noValidate>
      <div className="student-account-identity mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-border p-5">
        <StudentAvatar className="h-16 w-16" />
        <div className="min-w-0"><h2 className="font-serif text-2xl font-semibold break-words">{values.name}</h2><p className="mt-1 text-sm text-muted">Your student profile{values.registrationNo ? ` · Registration no. ${values.registrationNo}` : ""}</p><p className="mt-2 text-xs text-muted">Illustrated avatar. Profile photo uploads are not available yet.</p></div>
      </div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="max-w-lg text-xs leading-relaxed text-muted">Your details are saved to your account and visible to the IBMV team that supports learners. Your sign-in email can only be changed by contacting support.</p>{!editing ? <Button variant="soft-info" onClick={() => { setDraft(values); setErrors({}); setEditing(true); }}>Edit profile</Button> : <div className="flex gap-2"><Button onClick={() => { setEditing(false); setErrors({}); }} disabled={saving}>Cancel</Button><Button type="submit" variant="success" disabled={saving}>{saving ? "Saving…" : "Save changes"}</Button></div>}</div>
      <div className="space-y-5">{profileGroups.map((group) => <StudentPanel key={group.title} title={group.title}><div className="grid gap-4 sm:grid-cols-2">{group.fields.map((field) => {
        const id = `student-${field.key}`;
        const key = field.key as keyof LearnerProfileDto;
        const value = (editing ? draft : values)[key] ?? "";
        const update = (next: string) => setDraft((previous) => ({ ...previous, [key]: next }));
        const options = field.type === "gender" ? genderOptions : sourceOptions;
        const readOnly = field.key === "email";
        return <Field key={field.key} id={id} label={field.label} error={errors[field.key]} required={field.key === "name"}>
          {!editing || readOnly ? <p className="min-h-11 rounded-xl bg-accent-soft/40 px-3 py-3 text-sm break-words">{(field.type === "gender" || field.type === "source" ? options.find((option) => option.value === value)?.label : value) || "Not provided"}</p>
            : field.type === "date" ? <DatePicker id={id} value={value} onValueChange={update} max={today} />
              : field.type === "gender" || field.type === "source" ? <Select id={id} value={value} onValueChange={update} options={options} />
                : <input id={id} type={field.type ?? "text"} value={value} maxLength={field.key === "address" || field.key === "permanent" ? 300 : 120} onChange={(event) => update(event.target.value)} className={inputClass} aria-invalid={Boolean(errors[field.key])} autoComplete="off" />}
        </Field>;
      })}</div></StudentPanel>)}
      {customFields.length ? <StudentPanel title="Additional information"><div className="grid gap-4 sm:grid-cols-2">{customFields.map((field) => <Field key={field.id} id={`custom-${field.id}`} label={field.label} required={field.required}>
        {!editing ? <p className="min-h-11 rounded-xl bg-accent-soft/40 px-3 py-3 text-sm break-words">{field.value || "Not provided"}</p>
          : field.type === "Dropdown" ? <Select id={`custom-${field.id}`} value={field.value} onValueChange={(value) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value } : item))} options={field.options.map((option) => ({ value: option, label: option }))} />
            : <input id={`custom-${field.id}`} className={inputClass} type={field.type === "Email" ? "email" : field.type === "Number" ? "number" : field.type === "Date" ? "date" : "text"} value={field.value} onChange={(event) => setCustomFields((current) => current.map((item) => item.id === field.id ? { ...item, value: event.target.value } : item))} />}
      </Field>)}</div></StudentPanel> : null}
      </div>
    </form>
  );
}

function Preferences({ initial }: { initial: LearnerPreferencesDto }) {
  const [saved, setSaved] = useState(initial);
  const [prefs, setPrefs] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dirty = JSON.stringify(prefs) !== JSON.stringify(saved);
  const zones = [...new Set([...commonTimezones, prefs.timezone])];

  async function save() {
    setSaving(true);
    setError("");
    try {
      const result = await apiClient.put<LearnerPreferencesDto>("/api/student/preferences", prefs);
      setSaved(result.data);
      setPrefs(result.data);
      toast.success("Preferences saved");
    } catch (caught) {
      setError(caught instanceof ApiError ? (caught.fields.timezone ?? caught.message) : "Could not save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <StudentPanel title="Timezone">
        <div className="mb-4 inline-flex rounded-xl bg-sky-500/10 p-3 text-sky-700 dark:text-sky-300"><Globe className="size-6" aria-hidden="true" /></div>
        <Field id="student-timezone" label="Timezone"><Select id="student-timezone" value={prefs.timezone} onValueChange={(next) => setPrefs((previous) => ({ ...previous, timezone: next, timezoneAuto: false }))} options={zones.map((value) => ({ value, label: value }))} /></Field>
        <Button className="mt-4" variant="soft-info" onClick={() => setPrefs((previous) => ({ ...previous, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, timezoneAuto: true }))}>Set Timezone Automatically</Button>
        <p className="mt-3 text-xs text-muted">{prefs.timezoneAuto ? "Using the timezone detected on this device. " : ""}Class times on your calendar are shown in Asia/Kolkata (IST) for now. Showing them in your own timezone arrives with class reminders.</p>
      </StudentPanel>
      {preferenceGroups.map((group) => (
        <StudentPanel key={group.title} title={group.title}>
          {group.description ? <p className="mb-2 flex items-start gap-2 text-sm text-muted"><Bell className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{group.description}</p> : null}
          <div className="divide-y divide-border">{group.items.map(({ key, label }) => <label key={key} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 text-sm"><span>{label}</span><input className="size-5 shrink-0 accent-teal-600" type="checkbox" checked={Boolean(prefs[key])} onChange={(event) => setPrefs((previous) => ({ ...previous, [key]: event.target.checked }))} /></label>)}</div>
        </StudentPanel>
      ))}
      <p className="text-xs leading-relaxed text-muted">Your choices are saved to your account and are the consent record IBMV checks before sending anything. Reminder and campaign delivery starts when those services are connected.</p>
      {error ? <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{error}</p> : null}
      <div className="flex flex-wrap gap-3"><Button variant="success" onClick={() => void save()} disabled={saving || !dirty}>{saving ? "Saving…" : "Save preferences"}</Button><Button onClick={() => { setPrefs(saved); setError(""); }} disabled={saving || !dirty}>Discard changes</Button></div>
    </div>
  );
}
