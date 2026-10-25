"use client";

import { useState } from "react";
import type { CellValue, FormField } from "@/lib/admin/types";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";

type Values = Record<string, string>;

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(fields: FormField[], values: Values) {
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = (values[f.key] ?? "").trim();
    if (f.required && !v) errors[f.key] = `${f.label} is required.`;
    else if (v && f.type === "email" && !emailRe.test(v)) errors[f.key] = "Enter a valid email address.";
    else if (v && f.type === "number" && Number.isNaN(Number(v))) errors[f.key] = "Enter a number.";
    else if (v && f.type === "tel" && !/^\+?[\d\s-]{8,}$/.test(v)) errors[f.key] = "Enter a valid phone number.";
    else if (v && f.type === "url" && !/^https?:\/\/\S+$/.test(v)) errors[f.key] = "Enter a full link starting with https://";
  }
  return errors;
}

function toInputValue(field: FormField, value: CellValue | undefined): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.join(", ");
  const s = String(value);
  if (field.type === "date") return s.slice(0, 10);
  return s;
}

export function FormDrawer({
  open,
  title,
  description,
  fields,
  initial,
  submitLabel,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  description?: string;
  fields: FormField[];
  initial?: Record<string, CellValue>;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (values: Record<string, CellValue>) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} variant="drawer">
      {open ? (
        <FormBody
          fields={fields}
          initial={initial}
          submitLabel={submitLabel}
          onCancel={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </Modal>
  );
}

function FormBody({
  fields,
  initial,
  submitLabel,
  onCancel,
  onSubmit,
}: {
  fields: FormField[];
  initial?: Record<string, CellValue>;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (values: Record<string, CellValue>) => void;
}) {
  const [values, setValues] = useState<Values>(() =>
    Object.fromEntries(fields.map((f) => [f.key, toInputValue(f, initial?.[f.key])])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (key: string, v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const errs = validate(fields, values);
        setErrors(errs);
        const firstError = fields.find((f) => errs[f.key]);
        if (firstError) {
          document.getElementById(`f-${firstError.key}`)?.focus();
          return;
        }
        onSubmit(
          Object.fromEntries(
            fields.map((f) => {
              const v = values[f.key].trim();
              return [f.key, f.type === "number" ? (v === "" ? null : Number(v)) : v];
            }),
          ),
        );
      }}
    >
      {fields.map((f) => {
        const id = `f-${f.key}`;
        const common = {
          id,
          name: f.key,
          value: values[f.key],
          "aria-invalid": errors[f.key] ? true : undefined,
          "aria-describedby": errors[f.key] ? `${id}-error` : f.help ? `${id}-help` : undefined,
          required: f.required,
        };
        return (
          <Field key={f.key} id={id} label={f.label} required={f.required} help={f.help} error={errors[f.key]}>
            {f.type === "select" ? (
              <select {...common} onChange={(e) => set(f.key, e.target.value)} className={inputClass}>
                <option value="">Select…</option>
                {f.options?.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                {...common}
                rows={4}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                className={cn(inputClass, "h-auto py-2")}
              />
            ) : (
              <input
                {...common}
                type={f.type}
                placeholder={f.placeholder}
                onChange={(e) => set(f.key, e.target.value)}
                className={inputClass}
              />
            )}
          </Field>
        );
      })}
      <div className="sticky bottom-0 -mx-5 mt-2 flex justify-end gap-2 border-t border-border bg-surface px-5 pt-3 pb-1">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
