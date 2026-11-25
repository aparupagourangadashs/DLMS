"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ApiError, apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";
import { AtSign, Bell, CalendarDays, Clock3, ContactRound, House, KeyRound, Mail, MapPin, MapPinned, Pencil, Phone, Save, Settings2, Smartphone, UserRound, UserRoundCog, X, type LucideIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../PageHeader";

type Profile = Record<string, string>;

const sections: Array<{ title: string; description: string; icon: LucideIcon; color: ColorKey; fields: Array<{ key: string; label: string; type?: string; options?: string[]; required?: boolean; wide?: boolean; readOnly?: boolean }> }> = [
  {
    title: "Personal details",
    description: "Your name and personal information",
    icon: UserRound,
    color: "violet",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "username", label: "Username", required: true },
      { key: "dob", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender", options: ["Female", "Male", "Prefer not to say"] },
    ],
  },
  {
    title: "Contact",
    description: "How to reach you",
    icon: ContactRound,
    color: "sky",
    fields: [
      { key: "mobile", label: "Mobile", type: "tel", required: true },
      { key: "altMobile", label: "Alternate mobile", type: "tel" },
      { key: "email", label: "Email (sign-in address)", type: "email", required: true, wide: true, readOnly: true },
    ],
  },
  {
    title: "Address",
    description: "Your home and location details",
    icon: MapPinned,
    color: "teal",
    fields: [
      { key: "permanentAddress", label: "Permanent address", wide: true },
      { key: "state", label: "State" },
      { key: "city", label: "City" },
      { key: "pincode", label: "Pincode" },
      { key: "residentialAddress", label: "Residential address", wide: true },
    ],
  },
  {
    title: "Preferences",
    description: "Your timezone and communication choices",
    icon: Settings2,
    color: "rose",
    fields: [
      { key: "timezone", label: "Timezone", options: ["Asia/Kolkata (IST, UTC+05:30)", "Europe/London", "America/New_York", "Asia/Dubai"] },
      { key: "notifications", label: "Notification preference", options: ["Email and WhatsApp", "Email only", "WhatsApp only", "None"] },
    ],
  },
];

const fieldIcons: Record<string, LucideIcon> = {
  name: UserRound, username: AtSign, dob: CalendarDays, gender: UserRoundCog,
  mobile: Smartphone, altMobile: Phone, email: Mail,
  permanentAddress: House, residentialAddress: House, state: MapPin, city: MapPin, pincode: MapPinned,
  timezone: Clock3, notifications: Bell,
};

function validateProfile(p: Profile) {
  const e: Record<string, string> = {};
  if (!p.name.trim()) e.name = "Name is required.";
  if (!p.username.trim()) e.username = "Username is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) e.email = "Enter a valid email address.";
  if (!/^\+?[\d\s-]{8,}$/.test(p.mobile)) e.mobile = "Enter a valid mobile number.";
  if (p.altMobile && !/^\+?[\d\s-]{8,}$/.test(p.altMobile)) e.altMobile = "Enter a valid mobile number.";
  if (p.pincode && !/^\d{6}$/.test(p.pincode)) e.pincode = "Pincode must be 6 digits.";
  return e;
}

export function MyProfile({ initial }: { initial: Profile }) {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwOpen, setPwOpen] = useState(false);
  const values = editing ? draft : saved;

  async function save() {
    const errs = validateProfile(draft);
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) {
      document.getElementById(`p-${first}`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const result = await apiClient.patch<Profile>("/api/admin/me", draft);
      setSaved(result.data);
      setEditing(false);
      toast.success("Profile updated");
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields);
        document.getElementById(`p-${Object.keys(error.fields)[0]}`)?.focus();
      } else {
        toast.error(error instanceof ApiError ? error.message : "Could not save your profile.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your account details and preferences."
        status="ready"
        actions={
          editing ? null : (
            <>
              <Button variant="soft-violet" onClick={() => setPwOpen(true)}>
                <KeyRound className="size-4" aria-hidden="true" />
                Change password
              </Button>
              <Button
                variant="soft-info"
                onClick={() => {
                  setDraft(saved);
                  setEditing(true);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Edit Profile
              </Button>
            </>
          )
        }
      />

      <section className="profile-identity mb-5" aria-label="Profile overview">
        <span className="profile-avatar" aria-hidden="true">{saved.name.split(" ").filter(Boolean).slice(0, 2).map((word) => word[0]).join("")}</span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-semibold tracking-widest text-violet-700 uppercase dark:text-violet-300">My account</p>
          <h2 className="font-serif text-3xl font-semibold break-words">{saved.name}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm break-all text-muted"><AtSign className="size-4 shrink-0" aria-hidden="true" />{saved.username}</p>
          <p className="mt-2 flex items-start gap-2 text-sm break-all"><Mail className="mt-0.5 size-4 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden="true" />{saved.email}</p>
        </div>
        <span className={cn("inline-flex items-center gap-2 rounded-full border border-current/15 px-3 py-2 text-xs font-semibold", editing ? palette.amber.tile : palette.violet.tile)}>
          {editing ? <Pencil className="size-3.5" aria-hidden="true" /> : <UserRound className="size-3.5" aria-hidden="true" />}
          {editing ? "Editing profile" : "Personal profile"}
        </span>
      </section>

      <form
        noValidate
        className="grid min-w-0 items-start gap-5 xl:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        {sections.map((s) => {
          const color = palette[s.color];
          return (
            <Card key={s.title} className="h-full min-w-0 overflow-hidden">
              <div className={cn("h-1", color.bar)} />
              <CardHeader
                className="bg-surface-muted/40"
                title={<span className="flex items-center gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", color.tile)} aria-hidden="true"><s.icon className="size-5" /></span><span>{s.title}</span></span>}
                description={s.description}
              />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {s.fields.map((f) => {
                  const id = `p-${f.key}`;
                  const Icon = fieldIcons[f.key];
                  if (!editing || f.readOnly) {
                    return (
                      <dl key={f.key} className={cn("profile-detail", f.wide && "sm:col-span-2")}>
                        <dt className="flex items-center gap-2 text-xs font-medium text-muted"><Icon className={cn("size-4 shrink-0", color.text)} aria-hidden="true" />{f.label}</dt>
                        <dd className="mt-2 text-sm font-medium break-words">{values[f.key] || <span className="font-normal text-muted">Not provided</span>}</dd>
                      </dl>
                    );
                  }
                  const common = {
                    id,
                    value: draft[f.key],
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
                      setDraft((d) => ({ ...d, [f.key]: e.target.value }));
                      if (errors[f.key]) setErrors((x) => ({ ...x, [f.key]: "" }));
                    },
                    className: inputClass,
                    "aria-invalid": errors[f.key] ? true : undefined,
                    "aria-describedby": errors[f.key] ? `${id}-error` : undefined,
                  };
                  return (
                    <Field key={f.key} id={id} label={f.label} required={f.required} error={errors[f.key]} className={f.wide ? "sm:col-span-2" : undefined}>
                      {f.options ? (
                        <Select
                          id={id}
                          value={draft[f.key]}
                          options={f.options.map((value) => ({ value, label: value }))}
                          onValueChange={(value) => {
                            setDraft((d) => ({ ...d, [f.key]: value }));
                            if (errors[f.key]) setErrors((x) => ({ ...x, [f.key]: "" }));
                          }}
                          required={f.required}
                          aria-invalid={errors[f.key] ? true : undefined}
                          aria-describedby={errors[f.key] ? `${id}-error` : undefined}
                        />
                      ) : f.type === "date" ? (
                        <DatePicker id={id} value={draft[f.key]} onValueChange={(value) => {
                          setDraft((d) => ({ ...d, [f.key]: value }));
                          if (errors[f.key]) setErrors((x) => ({ ...x, [f.key]: "" }));
                        }} aria-invalid={errors[f.key] ? true : undefined} aria-describedby={errors[f.key] ? `${id}-error` : undefined} />
                      ) : (
                        <input {...common} type={f.type ?? "text"} />
                      )}
                    </Field>
                  );
                })}
              </div>
            </Card>
          );
        })}
        {editing ? (
          <div className="sticky bottom-24 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur xl:col-span-2">
            <p className="mr-auto flex items-center gap-2 text-xs text-muted"><Pencil className="size-3.5" aria-hidden="true" />Review your details before saving.</p>
            <Button
              onClick={() => {
                setEditing(false);
                setErrors({});
              }}
            >
              <X className="size-4" aria-hidden="true" />
              Cancel
            </Button>
            <Button type="submit" variant="success" disabled={saving}>
              <Save className="size-4" aria-hidden="true" />
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </div>
        ) : null}
      </form>

      <Modal open={pwOpen} onClose={() => setPwOpen(false)} title="Change password">
        {pwOpen ? <PasswordForm onDone={() => setPwOpen(false)} /> : null}
      </Modal>
    </>
  );
}

function PasswordForm({ onDone }: { onDone: () => void }) {
  const [v, setV] = useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const fields = [
    ["current", "Current password", "current-password"],
    ["next", "New password", "new-password"],
    ["confirm", "Confirm new password", "new-password"],
  ] as const;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!v.current) errs.current = "Enter your current password.";
        if (v.next.length < 10) errs.next = "Use at least 10 characters.";
        else if (!/[A-Za-z]/.test(v.next) || !/\d/.test(v.next)) errs.next = "Include letters and numbers.";
        if (v.confirm !== v.next) errs.confirm = "Passwords don't match.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        setPending(true);
        try {
          await apiClient.post("/api/account/password", { currentPassword: v.current, newPassword: v.next });
          toast.success("Password changed", { description: "Please sign in again." });
          await signOut({ redirectTo: "/login" });
        } catch (error) {
          setPending(false);
          if (error instanceof ApiError && error.fields.currentPassword) setErrors({ current: error.fields.currentPassword });
          else if (error instanceof ApiError && error.fields.newPassword) setErrors({ next: error.fields.newPassword });
          else toast.error(error instanceof ApiError ? error.message : "Could not change the password.");
        }
      }}
    >
      {fields.map(([k, label, auto]) => (
        <Field key={k} id={`pw-${k}`} label={label} required error={errors[k]} help={k === "next" ? "At least 10 characters, with letters and numbers." : undefined}>
          <input
            id={`pw-${k}`}
            type="password"
            autoComplete={auto}
            value={v[k]}
            onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value }))}
            className={inputClass}
            aria-invalid={errors[k] ? true : undefined}
            aria-describedby={errors[k] ? `pw-${k}-error` : k === "next" ? "pw-next-help" : undefined}
          />
        </Field>
      ))}
      <div className="flex justify-end gap-2">
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="success" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
