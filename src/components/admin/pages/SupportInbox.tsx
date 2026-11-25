"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import type { ScreenStatus } from "@/lib/admin/navigation";
import { ApiError, apiClient } from "@/lib/api/client";
import { useResourceList } from "@/lib/api/hooks";
import type { SupportListItem, SupportThread } from "@/server/services/support";
import { CheckCircle2, Inbox, Mail, Search, Send, UserCheck, UserMinus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../PageHeader";

const statuses = ["Open", "In progress", "Resolved"] as const;
const tone = { Open: "warning", "In progress": "info", Resolved: "success" } as const;
const when = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

export function SupportInbox({ currentUserId, canWrite, status }: { currentUserId: string; canWrite: boolean; status: ScreenStatus }) {
    const [tab, setTab] = useState<string>("Open");
    const [search, setSearch] = useState("");
    const [q, setQ] = useState("");
    const list = useResourceList<SupportListItem>("/api/admin/support", { tab: tab === "All" ? undefined : tab, q, pageSize: 50 });

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [thread, setThread] = useState<SupportThread | null>(null);
    const [threadError, setThreadError] = useState("");
    const [reply, setReply] = useState("");
    const [replyError, setReplyError] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!selectedId) return;
        let cancelled = false;
        apiClient
            .get<SupportThread>(`/api/admin/support/${selectedId}`)
            .then((result) => {
                if (cancelled) return;
                setThread(result.data);
                setThreadError("");
            })
            .catch((error: unknown) => {
                if (!cancelled) setThreadError(error instanceof ApiError ? error.message : "Could not load this request.");
            });
        return () => {
            cancelled = true;
        };
    }, [selectedId]);

    const open = (id: string) => {
        setSelectedId(id);
        setThread(null);
        setThreadError("");
        setReply("");
        setReplyError("");
    };

    async function change(body: { status?: string; assignedToId?: string | null }) {
        if (!thread) return;
        setBusy(true);
        try {
            const result = await apiClient.patch<SupportThread>(`/api/admin/support/${thread.id}`, body);
            setThread(result.data);
            list.refetch();
        } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Could not update this request.");
        } finally {
            setBusy(false);
        }
    }

    async function sendReply(event: React.FormEvent) {
        event.preventDefault();
        if (!thread) return;
        setBusy(true);
        setReplyError("");
        try {
            const result = await apiClient.post<SupportThread>(`/api/admin/support/${thread.id}/replies`, { body: reply });
            setThread(result.data);
            setReply("");
            list.refetch();
            toast.success("Reply sent", { description: "The learner is emailed and sees it in their Help page." });
        } catch (error) {
            setReplyError(error instanceof ApiError ? (error.fields.body ?? error.message) : "Could not send the reply.");
        } finally {
            setBusy(false);
        }
    }

    const counts = list.meta?.tabCounts;
    const all = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : undefined;
    const tabs = [
        { value: "Open", label: "Open", color: "amber" as const, count: counts?.Open },
        { value: "In progress", label: "In progress", color: "sky" as const, count: counts?.["In progress"] },
        { value: "Resolved", label: "Resolved", color: "emerald" as const, count: counts?.Resolved },
        { value: "All", label: "All", color: "violet" as const, count: all },
    ];

    return (
        <>
            <PageHeader title="Support Inbox" description="Help requests written by learners. Reply by email from here; replies also appear on the learner's Help page." status={status} />
            <div className="grid items-start gap-5 lg:grid-cols-[minmax(18rem,26rem)_minmax(0,1fr)]">
                <Card className="min-w-0 overflow-hidden">
                    <div className="space-y-3 border-b border-border p-4">
                        <Tabs label="Request status" value={tab} onChange={(value) => setTab(value)} items={tabs} />
                        <form className="flex gap-2" role="search" onSubmit={(event) => { event.preventDefault(); setQ(search.trim()); }}>
                            <input type="search" className={inputClass} placeholder="Search name, email or message" aria-label="Search requests" value={search} onChange={(event) => setSearch(event.target.value)} />
                            <Button type="submit" variant="soft-info" aria-label="Search"><Search className="size-4" aria-hidden="true" /></Button>
                        </form>
                    </div>
                    {list.status === "error" ? (
                        <div className="p-4"><EmptyState title="Could not load requests" description={list.error?.message ?? "Something went wrong."} action={<Button onClick={list.refetch}>Try again</Button>} /></div>
                    ) : list.status === "loading" && !list.rows ? (
                        <p role="status" className="p-6 text-sm text-muted">Loading requests…</p>
                    ) : (list.rows ?? []).length === 0 ? (
                        <div className="p-4"><EmptyState title="No requests here" description={q ? "Nothing matches this search." : "New learner requests appear here."} /></div>
                    ) : (
                        <ul className="max-h-[70vh] divide-y divide-border overflow-y-auto">
                            {(list.rows ?? []).map((item) => (
                                <li key={item.id}>
                                    <button type="button" onClick={() => open(item.id)} aria-current={selectedId === item.id ? "true" : undefined} className={`block w-full min-w-0 px-4 py-3 text-left hover:bg-accent-soft ${selectedId === item.id ? "bg-accent-soft" : ""}`}>
                                        <span className="flex items-center justify-between gap-2">
                                            <span className="truncate text-sm font-semibold">{item.name}</span>
                                            <Badge tone={tone[item.status]}>{item.status}</Badge>
                                        </span>
                                        <span className="mt-1 line-clamp-2 block text-xs text-muted">{item.message}</span>
                                        <span className="mt-1 block text-[11px] text-muted">{when.format(new Date(item.createdAt))}{item.assignedTo ? ` · ${item.assignedTo}` : ""}{item.replyCount ? ` · ${item.replyCount} ${item.replyCount === 1 ? "reply" : "replies"}` : ""}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>

                <Card className="min-w-0 p-5">
                    {!selectedId ? (
                        <EmptyState title="Select a request" description="Choose a request on the left to read it and reply." icon={<Inbox />} />
                    ) : threadError ? (
                        <EmptyState title="Could not open this request" description={threadError} />
                    ) : !thread ? (
                        <p role="status" className="text-sm text-muted">Loading request…</p>
                    ) : (
                        <div className="space-y-5">
                            <header className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="font-serif text-xl font-semibold break-words">{thread.name}</h2>
                                    <p className="mt-1 flex items-center gap-2 text-sm text-muted"><Mail className="size-4 shrink-0" aria-hidden="true" /><a href={`mailto:${thread.email}`} className="break-all underline-offset-2 hover:underline">{thread.email}</a></p>
                                    <p className="mt-1 text-xs text-muted">Received {when.format(new Date(thread.createdAt))}{thread.assignedTo ? ` · Assigned to ${thread.assignedTo}` : " · Unassigned"}</p>
                                </div>
                                <Badge tone={tone[thread.status]}>{thread.status}</Badge>
                            </header>

                            {canWrite ? (
                                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Request actions">
                                    {statuses.map((value) => (
                                        <Button key={value} size="sm" variant={thread.status === value ? "primary" : "secondary"} disabled={busy || thread.status === value} onClick={() => void change({ status: value })}>
                                            {value === "Resolved" ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}{value === "Resolved" ? "Mark resolved" : value === "Open" ? "Reopen" : "In progress"}
                                        </Button>
                                    ))}
                                    {thread.assignedToId === currentUserId ? (
                                        <Button size="sm" variant="soft-info" disabled={busy} onClick={() => void change({ assignedToId: null })}><UserMinus className="size-4" aria-hidden="true" />Unassign me</Button>
                                    ) : (
                                        <Button size="sm" variant="soft-info" disabled={busy} onClick={() => void change({ assignedToId: currentUserId })}><UserCheck className="size-4" aria-hidden="true" />Assign to me</Button>
                                    )}
                                </div>
                            ) : null}

                            <section aria-label="Conversation" className="space-y-3">
                                <article className="rounded-xl border border-border bg-surface-muted/40 p-4">
                                    <p className="text-xs font-semibold text-muted">{thread.name} · {when.format(new Date(thread.createdAt))}</p>
                                    <p className="mt-1 text-sm break-words whitespace-pre-wrap">{thread.message}</p>
                                </article>
                                {thread.replies.map((item) => (
                                    <article key={item.id} className={`rounded-xl border p-4 ${item.fromStaff ? "border-accent/30 bg-accent-soft/60" : "border-border bg-surface-muted/40"}`}>
                                        <p className="text-xs font-semibold text-muted">{item.author} · {when.format(new Date(item.createdAt))}</p>
                                        <p className="mt-1 text-sm break-words whitespace-pre-wrap">{item.body}</p>
                                    </article>
                                ))}
                            </section>

                            {canWrite ? (
                                <form onSubmit={sendReply} noValidate>
                                    <Field id="support-reply" label="Reply" error={replyError} help="Sent to the learner by email. Do not include passwords or payment details.">
                                        <textarea id="support-reply" className={`${inputClass} min-h-28 py-3`} maxLength={5000} value={reply} onChange={(event) => setReply(event.target.value)} aria-invalid={Boolean(replyError)} />
                                    </Field>
                                    <Button className="mt-3" type="submit" variant="gold" disabled={busy || reply.trim().length < 2}><Send className="size-4" aria-hidden="true" />Send reply</Button>
                                </form>
                            ) : (
                                <p className="text-xs text-muted">Your role can read requests but not reply.</p>
                            )}
                        </div>
                    )}
                </Card>
            </div>
        </>
    );
}
