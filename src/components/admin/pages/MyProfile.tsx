"use client";

import { useState } from "react";
import { toast } from "sonner";
import { KeyRound, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { DemoNotice, PageHeader } from "../PageHeader";

type Profile = Record<string, string>;

const sections: Array<{ title: string; fields: Array<{ key: string; label: string; type?: string; options?: string[]; required?: boolean; wide?: boolean }> }> = [
  {
    title: "Personal details",
    fields: [
      { key: "name", label: "Name", required: true },
      { key: "username", label: "Username", required: true },
      { key: "dob", label: "Date of birth", type: "date" },
      { key: "gender", label: "Gender", options: ["Female", "Male", "Prefer not to say"] },
    ],
  },
  {
    title: "Contact",
    fields: [
      { key: "mobile", label: "Mobile", type: "tel", required: true },
      { key: "altMobile", label: "Alternate mobile", type: "tel" },
      { key: "email", label: "Email", type: "email", required: true, wide: true },
    ],
  },
  {
    title: "Address",
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
    fields: [
      { key: "timezone", label: "Timezone", options: ["Asia/Kolkata (IST, UTC+05:30)", "Europe/London", "America/New_York", "Asia/Dubai"] },
      { key: "notifications", label: "Notification preference", options: ["Email and WhatsApp", "Email only", "WhatsApp only", "None"] },
    ],
  },
];

const initial: Profile = {
  name: "Demo Admin",
  username: "demo.admin",
  dob: "1990-01-15",
  gender: "Prefer not to say",
  mobile: "+91 98200 00000",
  altMobile: "",
  email: "admin@example.com",
  permanentAddress: "IBMV Campus",
  state: "Maharashtra",
  city: "Mumbai",
  pincode: "400001",
  residentialAddress: "",
  timezone: "Asia/Kolkata (IST, UTC+05:30)",
  notifications: "Email and WhatsApp",
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

export function MyProfile() {
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pwOpen, setPwOpen] = useState(false);
  const values = editing ? draft : saved;

  return (
    <>
      <PageHeader
        title="My Profile"
        description="Your account details and preferences."
        status="ready"
        actions={
          editing ? null : (
            <>
              <Button onClick={() => setPwOpen(true)}>
                <KeyRound className="size-4" aria-hidden="true" />
                Change password
              </Button>
              <Button
                variant="primary"
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
      <DemoNotice />

      <form
        noValidate
        className="flex max-w-4xl flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          const errs = validateProfile(draft);
          setErrors(errs);
          const first = Object.keys(errs)[0];
          if (first) {
            document.getElementById(`p-${first}`)?.focus();
            return;
          }
          setSaved(draft);
          setEditing(false);
          toast.success("Profile updated");
        }}
      >
        {sections.map((s) => (
          <Card key={s.title}>
            <CardHeader title={s.title} />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              {s.fields.map((f) => {
                const id = `p-${f.key}`;
                if (!editing) {
                  return (
                    <div key={f.key} className={f.wide ? "sm:col-span-2" : undefined}>
                      <p className="text-xs text-muted">{f.label}</p>
                      <p className="mt-0.5 text-sm font-medium">{values[f.key] || <span className="font-normal text-muted">Not provided</span>}</p>
                    </div>
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
                      <select {...common}>
                        {f.options.map((o) => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input {...common} type={f.type ?? "text"} />
                    )}
                  </Field>
                );
              })}
            </div>
          </Card>
        ))}
        {editing ? (
          <div className="sticky bottom-4 flex justify-end gap-2 rounded-2xl border border-border bg-surface/95 p-3 shadow-card backdrop-blur">
            <Button
              onClick={() => {
                setEditing(false);
                setErrors({});
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save changes
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
  const fields = [
    ["current", "Current password", "current-password"],
    ["next", "New password", "new-password"],
    ["confirm", "Confirm new password", "new-password"],
  ] as const;

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const errs: Record<string, string> = {};
        if (!v.current) errs.current = "Enter your current password.";
        if (v.next.length < 10) errs.next = "Use at least 10 characters.";
        else if (!/[A-Za-z]/.test(v.next) || !/\d/.test(v.next)) errs.next = "Include letters and numbers.";
        if (v.confirm !== v.next) errs.confirm = "Passwords don't match.";
        setErrors(errs);
        if (Object.keys(errs).length) return;
        toast.info("Password change is ready to connect", { description: "It will work once sign-in is added in the backend phase." });
        onDone();
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
        <Button type="submit" variant="primary">
          Update password
        </Button>
      </div>
    </form>
  );
}
