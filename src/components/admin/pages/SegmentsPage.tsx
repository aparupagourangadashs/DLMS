"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, inputClass, Select } from "@/components/ui/Field";
import { apiClient, ApiError } from "@/lib/api/client";
import { Plus, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../PageHeader";

type Segment = { id: string; name: string; type: "STATIC" | "DYNAMIC"; rules: unknown; memberCount: number };

export function SegmentsPage() {
  const [items, setItems] = useState<Segment[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<"STATIC" | "DYNAMIC">("STATIC");
  const [status, setStatus] = useState("ALL");
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiClient.get<Segment[]>("/api/admin/b3b/segments").then(({ data }) => setItems(data)).catch(() => setError("Could not load segments."));
  }, []);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    try {
      const { data } = await apiClient.post<Segment>("/api/admin/b3b/segments", {
        name,
        type,
        learnerIds: [],
        rules: type === "DYNAMIC" ? { status, branchId: "", courseId } : undefined,
      });
      setItems((current) => [...current, data].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setError("");
      toast.success("Segment saved");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not save the segment.");
    }
  }

  async function remove(id: string) {
    try {
      await apiClient.delete(`/api/admin/b3b/segments/${id}`);
      setItems((current) => current.filter((item) => item.id !== id));
      toast.success("Segment deleted");
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : "Could not delete the segment.");
    }
  }

  return (
    <>
      <PageHeader title="Segments" description="Organize learners into static groups or database-evaluated dynamic groups." status="ready" />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card>
          <CardHeader title="Learner segments" description={`${items.length} configured`} />
          {items.length ? <ul className="grid gap-3 p-4">{items.map((segment) => <li key={segment.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Users className="size-5" /></span><span className="min-w-0 flex-1"><strong className="block">{segment.name}</strong><span className="text-xs text-muted">{segment.type === "DYNAMIC" ? "Dynamic rules" : "Static membership"} · {segment.memberCount} members</span></span><Button size="sm" variant="soft-danger" onClick={() => void remove(segment.id)}>Delete</Button></li>)}</ul> : <p className="p-5 text-sm text-muted">No segments configured.</p>}
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold">Create segment</h2>
          <form className="space-y-3" onSubmit={add}>
            <Field id="segment-name" label="Name"><input id="segment-name" className={inputClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={100} /></Field>
            <Field id="segment-type" label="Type"><Select id="segment-type" value={type} onValueChange={(value) => setType(value as "STATIC" | "DYNAMIC")} options={[{ value: "STATIC", label: "Static" }, { value: "DYNAMIC", label: "Dynamic" }]} /></Field>
            {type === "DYNAMIC" ? <>
              <Field id="segment-status" label="Learner status"><Select id="segment-status" value={status} onValueChange={setStatus} options={[{ value: "ALL", label: "All statuses" }, { value: "REGISTERED", label: "Registered" }, { value: "ON_LEAVE", label: "On leave" }, { value: "ARCHIVED", label: "Archived" }]} /></Field>
              <Field id="segment-course" label="Course ID (optional)" help="Leave blank to match the learner status only."><input id="segment-course" className={inputClass} value={courseId} onChange={(event) => setCourseId(event.target.value)} placeholder="Course ID" /></Field>
            </> : null}
            {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
            <Button type="submit" variant="gold"><Plus className="mr-2 size-4" />Create</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
