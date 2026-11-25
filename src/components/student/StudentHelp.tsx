"use client";

import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { ApiError, apiClient } from "@/lib/api/client";
import type { SupportRequestDto } from "@/lib/student/profile";
import { BookOpen, ExternalLink, LifeBuoy, Mail, Phone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";

type Contact = { email: string; phone: string; phoneDial: string; appUrl: string };

const statusTone = { Open: "warning", "In progress": "info", Resolved: "success" } as const;
const dateFormat = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const faqs = [
    { title: "Where are my courses?", body: "Open My Learning. Filter by stream or switch between Active and Completed Learning." },
    { title: "Does opening a lesson change my progress?", body: "No. Course progress on this portal is still sample data, and reading previews do not submit work." },
    { title: "Are these real certificates or purchases?", body: "Not yet. Certificates, purchases and memberships on this portal are fictional previews and are marked as invalid." },
    { title: "Can I save profile changes?", body: "Yes. Your profile and preferences are saved to your account. Only your sign-in email needs the support team to change it." },
];

export function StudentHelp({ initialRequests, contact }: { initialRequests: SupportRequestDto[]; contact: Contact }) {
    const [requests, setRequests] = useState(initialRequests);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [sending, setSending] = useState(false);

    async function submit(event: React.FormEvent) {
        event.preventDefault();
        if (message.trim().length < 10) {
            setError("Please write at least 10 characters to describe the issue.");
            return;
        }
        setSending(true);
        setError("");
        try {
            const result = await apiClient.post<SupportRequestDto>("/api/student/support-requests", { message });
            setRequests((current) => [result.data, ...current]);
            setMessage("");
            toast.success("Message sent", { description: "The IBMV team will reply by email. You can also follow it on this page." });
        } catch (caught) {
            setError(caught instanceof ApiError ? (caught.fields.message ?? caught.message) : "Could not send your message. Please try again.");
        } finally {
            setSending(false);
        }
    }

    return (
        <>
            <StudentHeading title="Help Centre" description="Find your way around the student portal, or write to the IBMV team." icon={LifeBuoy} />
            <div className="grid gap-5 xl:grid-cols-2">
                <div className="min-w-0 space-y-5">
                    <StudentPanel title="How can we help?">
                        <form onSubmit={submit} noValidate>
                            <Field id="support-message" label="Your message" required error={error} help="Please do not include passwords or payment details.">
                                <textarea id="support-message" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={Boolean(error)} className={`${inputClass} min-h-36 py-3`} placeholder="Tell us what you need help with…" />
                            </Field>
                            <p className="mt-2 text-xs text-muted">{message.length}/2000 characters</p>
                            <Button className="mt-4" type="submit" variant="soft-success" disabled={sending}>{sending ? "Sending…" : "Send message"}</Button>
                        </form>
                    </StudentPanel>
                    <StudentPanel title="Your recent messages">
                        {requests.length === 0 ? (
                            <StudentEmpty title="No messages yet" description="When you write to us, your message and our replies appear here." icon={LifeBuoy} />
                        ) : (
                            <ul className="space-y-4">
                                {requests.map((request) => (
                                    <li key={request.id} className="rounded-xl border border-border p-4">
                                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                            <Badge tone={statusTone[request.status]}>{request.status}</Badge>
                                            <span className="text-xs text-muted">{dateFormat.format(new Date(request.createdAt))}</span>
                                        </div>
                                        <p className="text-sm break-words whitespace-pre-wrap">{request.message}</p>
                                        {request.replies.map((reply) => (
                                            <div key={reply.id} className="mt-3 rounded-xl bg-accent-soft/60 p-3">
                                                <p className="text-xs font-semibold text-accent">IBMV team · {dateFormat.format(new Date(reply.createdAt))}</p>
                                                <p className="mt-1 text-sm break-words whitespace-pre-wrap">{reply.body}</p>
                                            </div>
                                        ))}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </StudentPanel>
                </div>
                <div className="min-w-0 space-y-5">
                    <StudentPanel title="Quick answers">
                        {faqs.map((faq) => <details key={faq.title} className="border-b border-border py-3 last:border-0"><summary className="min-h-8 cursor-pointer text-sm font-semibold">{faq.title}</summary><p className="mt-3 text-sm leading-relaxed text-muted">{faq.body}</p></details>)}
                        <div className="mt-4"><LinkButton href="/student/my-learning" variant="soft-info"><BookOpen className="size-4" aria-hidden="true" />Go to My Learning</LinkButton></div>
                    </StudentPanel>
                    <StudentPanel title="Contact IBMV">
                        <ul className="space-y-1 text-sm">
                            <li><a href={`mailto:${contact.email}`} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-accent-soft"><Mail className="size-4 shrink-0 text-accent" aria-hidden="true" />{contact.email}</a></li>
                            <li><a href={`tel:${contact.phoneDial}`} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-accent-soft"><Phone className="size-4 shrink-0 text-accent" aria-hidden="true" />{contact.phone}</a></li>
                            <li><a href={contact.appUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-accent-soft"><ExternalLink className="size-4 shrink-0 text-accent" aria-hidden="true" />Official IBMV app<span className="sr-only"> (opens in a new tab)</span></a></li>
                        </ul>
                    </StudentPanel>
                </div>
            </div>
        </>
    );
}
