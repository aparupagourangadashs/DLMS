"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass, Select } from "@/components/ui/Field";
import { StatCard } from "@/components/ui/StatCard";
import { apiClient } from "@/lib/api/client";
import { useMutation, useResourceList } from "@/lib/api/hooks";
import { cardCycle, palette } from "@/lib/colors";
import { Activity, BookOpen, CheckCircle2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../PageHeader";

type Branch = {
  id: string;
  name: string;
  city: string;
  managerId: string | null;
  managerName: string;
  status: "Active" | "Paused";
  staff: number;
  activity: string;
};

type StaffOption = { id: string; name: string };

export function SubOrganizationsPage() {
  const branches = useResourceList<Branch>("/api/admin/branches");
  const staff = useResourceList<StaffOption>("/api/admin/lookups/staff");
  const [form, setForm] = useState({ name: "", city: "", managerId: "" });

  const create = useMutation(
    (body: { name: string; city: string; managerId: string | null }) => apiClient.post<Branch>("/api/admin/branches", body),
    {
      successMessage: "Sub-organization added",
      onSuccess: () => {
        setForm({ name: "", city: "", managerId: "" });
        branches.refetch();
      },
    },
  );
  const toggle = useMutation(
    (branch: Branch) => apiClient.patch<Branch>(`/api/admin/branches/${branch.id}`, { status: branch.status === "Active" ? "Paused" : "Active" }),
    { successMessage: "Branch status updated", onSuccess: () => branches.refetch() },
  );

  const items = branches.rows ?? [];
  const managerOptions = [{ value: "", label: "No manager yet" }, ...(staff.rows ?? []).map((s) => ({ value: s.id, label: s.name }))];

  return (
    <>
      <PageHeader title="Sub-Organizations" description="Manage branches, their managers, and recent activity." status="ready" />
      {branches.status === "error" ? (
        <EmptyState title="Could not load branches" description={branches.error?.message ?? "Something went wrong."} action={<Button onClick={branches.refetch}>Try again</Button>} />
      ) : branches.status === "loading" && !branches.rows ? (
        <p role="status" className="py-12 text-center text-sm text-muted">Loading branches…</p>
      ) : (
        <>
          <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Settings summary">
            <StatCard label="Organizations" value={String(items.length)} hint="Branches" icon={<Users />} color="teal" />
            <StatCard label="Active branches" value={String(items.filter((b) => b.status === "Active").length)} hint="Can be paused or reactivated" icon={<CheckCircle2 />} color="emerald" />
            <StatCard label="Staff" value={items.reduce((sum, b) => sum + b.staff, 0).toLocaleString()} hint="Assigned to a branch" icon={<BookOpen />} color="violet" />
          </section>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
            <Card>
              <ul className="grid gap-3 p-4">
                {items.length === 0 ? <li className="text-sm text-muted">No branches yet. Add the first one.</li> : null}
                {items.map((item, index) => {
                  const color = palette[cardCycle[index % cardCycle.length]];
                  return (
                    <li key={item.id} className={`grid min-w-0 gap-3 rounded-2xl border p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${color.tile}`}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${color.solid}`} aria-hidden="true"><Users className="size-4" /></span>
                          <h3 className="min-w-0 flex-1 break-words font-semibold text-foreground">{item.name}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-surface-muted text-muted"}`}>{item.status}</span>
                        </div>
                        <p className="mt-2 text-sm text-muted">{item.city} · Manager: {item.managerName} · {item.staff} staff</p>
                        <p className="mt-1 text-xs text-muted"><Activity className="mr-1 inline size-3.5" aria-hidden="true" />Recent activity: {item.activity}</p>
                      </div>
                      <Button size="sm" disabled={toggle.pending} variant={item.status === "Active" ? "soft-warning" : "soft-success"} onClick={() => void toggle.mutate(item)}>
                        {item.status === "Active" ? "Pause branch" : "Reactivate branch"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </Card>
            <Card className="p-5">
              <h2 className="mb-3 flex items-center gap-2 font-semibold"><Plus className="size-4" aria-hidden="true" />Add sub-organization</h2>
              <form
                className="space-y-3"
                noValidate
                onSubmit={(event) => {
                  event.preventDefault();
                  void create.mutate({ name: form.name, city: form.city, managerId: form.managerId || null });
                }}
              >
                <Field id="branch-name" label="Organization name" required error={create.fieldErrors.name}>
                  <input id="branch-name" className={inputClass} value={form.name} maxLength={80} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-invalid={Boolean(create.fieldErrors.name)} />
                </Field>
                <Field id="branch-city" label="City or location" error={create.fieldErrors.city}>
                  <input id="branch-city" className={inputClass} value={form.city} maxLength={80} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                </Field>
                <Field id="branch-manager" label="Manager" error={create.fieldErrors.managerId}>
                  <Select id="branch-manager" value={form.managerId} onValueChange={(managerId) => setForm({ ...form, managerId })} options={managerOptions} />
                </Field>
                <Button type="submit" variant="gold" disabled={create.pending}><Plus className="size-4" aria-hidden="true" /> Add branch</Button>
              </form>
            </Card>
          </div>
        </>
      )}
    </>
  );
}
