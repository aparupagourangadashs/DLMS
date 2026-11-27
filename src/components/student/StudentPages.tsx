"use client";

import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { apiClient } from "@/lib/api/client";
import type { StudentAnnouncement } from "@/lib/student/learning-types";
import { istDateTime } from "@/lib/student/when";
import { Award, Bell, ClipboardCheck, Copy, Download, Gift, HeartHandshake, MessagesSquare, Receipt, Search, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";

const urgencyTone = { High: "warning", Medium: "info", Low: "neutral" } as const;
const urgencyLabel = { High: "Important", Medium: "Update", Low: "Note" } as const;

export function StudentAnnouncements({ initial }: { initial: StudentAnnouncement[] }) {
  const [items, setItems] = useState(initial);
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<StudentAnnouncement | null>(null);
  const shown = items.filter((a) => (!unreadOnly || !a.read) && `${a.title} ${a.body} ${a.tags.join(" ")}`.toLowerCase().includes(search.trim().toLowerCase()));
  const setRead = (id: string, read: boolean) => setItems((list) => list.map((a) => (a.id === id ? { ...a, read } : a)));
  const open = (item: StudentAnnouncement) => {
    setSelected(item);
    if (item.read) return;
    setRead(item.id, true);
    apiClient.post(`/api/student/announcements/${item.id}/read`).catch(() => {
      setRead(item.id, false);
      toast.error("Could not save that you read this announcement.");
    });
  };
  return (
    <>
      <StudentHeading title="Announcements" description="Stay close to your learning community. Notices from IBMV and your batches appear here." icon={Bell} />
      <StudentPanel className="mb-5">
        <Field id="announcement-search" label="Search Announcement"><input id="announcement-search" type="search" className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an announcement" /></Field>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="size-5 accent-teal-600" />Show Unread</label>
      </StudentPanel>
      <p role="status" className="mb-3 text-xs text-muted">{shown.length} {shown.length === 1 ? "announcement" : "announcements"} found</p>
      <div className="space-y-4">{shown.map((a) => <StudentPanel key={a.id}><div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone={urgencyTone[a.urgency]}>{urgencyLabel[a.urgency]}</Badge><Badge tone={a.read ? "neutral" : "success"}>{a.read ? "Read" : "Unread"}</Badge>{a.tags.length ? <span className="text-xs text-muted">{a.tags.join(", ")}</span> : null}</div><h2 className="font-serif text-xl font-semibold">{a.title}</h2><p className="mt-2 text-sm text-muted">{a.body.length > 115 ? `${a.body.slice(0, 115)}…` : a.body}</p><p className="mt-3 text-xs text-muted">{istDateTime(a.publishedAt)}</p><Button className="mt-4" variant="soft-info" onClick={() => open(a)}>Read announcement</Button></StudentPanel>)}</div>
      {!shown.length ? (items.length ? <StudentEmpty title="No matching announcements" description="Clear the search or turn off Show Unread to see more." icon={Search} /> : <StudentEmpty title="No announcements yet" description="Notices from IBMV and your batches will appear here." icon={Bell} />) : null}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title ?? "Announcement"}>{selected ? <><p className="mb-4 text-xs text-muted">{istDateTime(selected.publishedAt)}{selected.tags.length ? ` · ${selected.tags.join(", ")}` : ""}</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.body}</p></> : null}</Modal>
    </>
  );
}

export function StudentCommunities() {
  type Community = { id: string; name: string; description: string; layout: "MESSAGE" | "FEED"; memberCount: number; postCount: number };
  type Post = { id: string; body: string; pinned: boolean; createdAt: string; author: string; replies: Array<{ id: string; body: string; createdAt: string; author: string }> };
  const [items, setItems] = useState<Community[]>([]);
  const [selected, setSelected] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<Community[]>("/api/student/communities").then(({ data }) => setItems(data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  async function open(item: Community) {
    setSelected(item);
    try {
      const result = await apiClient.get<{ posts: Post[] }>(`/api/student/communities/${item.id}/posts`);
      setPosts(result.data.posts);
    } catch {
      setPosts([]);
    }
  }
  async function post() {
    if (!selected || !draft.trim()) return;
    try {
      await apiClient.post(`/api/student/communities/${selected.id}/posts`, { body: draft });
      setDraft("");
      await open(selected);
      toast.success("Posted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post.");
    }
  }
  return <>
    <StudentHeading title="Communities" description="Learn alongside others in a respectful, moderated space." icon={MessagesSquare} />
    {loading ? <StudentEmpty title="Loading communities" description="Checking communities you belong to." icon={MessagesSquare} /> : selected ? <>
      <Button className="mb-4" onClick={() => setSelected(null)}>Back to communities</Button>
      <StudentPanel title={selected.name}><p className="mb-5 text-sm text-muted">{selected.description}</p><div className="space-y-4">{posts.map((post) => <article key={post.id} className="rounded-xl border border-border bg-accent-soft/40 p-4"><p className="mb-2 text-xs text-muted">{post.author} · {new Date(post.createdAt).toISOString().slice(0, 10)}{post.pinned ? " · Pinned" : ""}</p><p className="text-sm leading-relaxed whitespace-pre-wrap">{post.body}</p>{post.replies.map((reply) => <div key={reply.id} className="mt-3 rounded-lg border-l-2 border-accent pl-3"><p className="text-xs text-muted">{reply.author}</p><p className="mt-1 text-sm">{reply.body}</p></div>)}</article>)}</div>{posts.length === 0 ? <StudentEmpty title="No posts yet" description="A post or moderator update will appear here." icon={MessagesSquare} /> : null}<Field id="community-post" label="Write a post" className="mt-5"><textarea id="community-post" className={`${inputClass} min-h-24`} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={5000} /></Field><Button className="mt-3" onClick={() => void post()} disabled={!draft.trim()}><Send className="mr-2 size-4" />Post</Button></StudentPanel>
    </> : items.length ? <div className="grid gap-5 md:grid-cols-2">{items.map((item) => <StudentPanel key={item.id}><span className="mb-4 inline-flex rounded-2xl bg-violet-500/10 p-3 text-violet-700 dark:text-violet-300"><MessagesSquare className="size-6" aria-hidden="true" /></span><h2 className="font-serif text-2xl font-semibold">{item.name}</h2><p className="mt-2 text-sm text-muted">{item.description}</p><p className="mt-4 text-xs text-muted">{item.memberCount} members · {item.postCount} posts</p><Button className="mt-4" variant="soft-violet" onClick={() => void open(item)}>Open community</Button></StudentPanel>)}</div> : <StudentEmpty title="No communities" description="You have not been added to an active community." icon={MessagesSquare} />}
  </>;
}

export function StudentExams() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [items, setItems] = useState<Array<{ id: string; name: string; opensAt: string | null; closesAt: string | null; durationMinutes: number | null; questionCount: number; attempts: Array<{ id: string; status: string; submittedAt: string | null }> }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<typeof items>(`/api/student/exams?tab=${tab}`).then(({ data }) => setItems(data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, [tab]);
  return <>
    <StudentHeading title="Exams" description="Open your assigned assessments, complete an attempt and review your result." icon={ClipboardCheck} />
    <StudentPanel className="mb-5"><Tabs label="Exam status" value={tab} onChange={setTab} items={[{ value: "upcoming", label: "Upcoming Exams", color: "sky" }, { value: "past", label: "Past Exams", color: "violet" }]} /></StudentPanel>
    {loading ? <StudentEmpty title="Loading exams" description="Checking the assessments assigned to you." icon={ClipboardCheck} /> : items.length ? <div className="space-y-4">{items.map((exam) => <StudentPanel key={exam.id}><h2 className="font-serif text-xl font-semibold">{exam.name}</h2><p className="mt-2 text-sm text-muted">{exam.questionCount} questions · {exam.durationMinutes ? `${exam.durationMinutes} minutes` : "No time limit"}{exam.closesAt ? ` · closes ${new Date(exam.closesAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}` : ""}</p><LinkButton className="mt-4" href={`/student/exams/${exam.id}`}>Open exam</LinkButton></StudentPanel>)}</div> : <StudentEmpty title={tab === "upcoming" ? "No upcoming exams" : "No past exams"} description="No assessments are available in this list." icon={ClipboardCheck} />}
  </>;
}

type ExamQuestion = { id: string; type: "MCQ" | "MULTI" | "TEXT" | "FILE"; prompt: string; options: unknown[]; marks: number; answer: unknown };
type ExamPayload = { attemptId: string; assessment: { name: string; instructions: string | null; durationMinutes: number | null; passPercent: number; totalMarks: number }; questions: ExamQuestion[] };

export function StudentExamTaking({ assessmentId }: { assessmentId: string }) {
  const [payload, setPayload] = useState<ExamPayload | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<{ percentage: number; passed: boolean; marks: number | null; total: number } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    apiClient.post<ExamPayload>(`/api/student/exams/${assessmentId}/start`).then(({ data }) => {
      setPayload(data);
      const initial: Record<string, unknown> = {};
      for (const question of data.questions) if (question.answer !== null) initial[question.id] = question.answer;
      setAnswers(initial);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not start this exam."));
  }, [assessmentId]);

  const setAnswer = (id: string, value: unknown) => setAnswers((current) => ({ ...current, [id]: value }));
  const save = async () => {
    if (!payload) return;
    try { await apiClient.put(`/api/student/attempts/${payload.attemptId}/answers`, { answers }); setError(""); toast.success("Answers saved."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save answers."); }
  };
  const submit = async () => {
    if (!payload) return;
    try {
      await apiClient.put(`/api/student/attempts/${payload.attemptId}/answers`, { answers });
      const { data } = await apiClient.post<{ percentage: number; passed: boolean; marks: number | null; total: number }>(`/api/student/attempts/${payload.attemptId}/submit`);
      setResult(data);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit this exam."); }
  };
  if (error) return <><StudentHeading title="Exam unavailable" description="This attempt could not be opened." icon={ClipboardCheck} /><StudentPanel><p role="alert" className="text-sm text-danger">{error}</p><div className="mt-4"><LinkButton href="/student/exams">Back to exams</LinkButton></div></StudentPanel></>;
  if (!payload) return <StudentEmpty title="Starting exam" description="Checking the attempt and timer." icon={ClipboardCheck} />;
  if (result) return <><StudentHeading title={payload.assessment.name} description="Attempt submitted." icon={ClipboardCheck} /><StudentPanel><Badge tone={result.passed ? "success" : "warning"}>{result.passed ? "Passed" : "Not passed"}</Badge><p className="mt-4 text-4xl font-semibold text-accent">{result.percentage}%</p><p className="mt-2 text-sm text-muted">{result.marks === null ? "Awaiting evaluation" : `${result.marks} of ${result.total} marks`}</p><div className="mt-5"><LinkButton href="/student/exams">Back to exams</LinkButton></div></StudentPanel></>;
  return <>
    <StudentHeading title={payload.assessment.name} description={payload.assessment.instructions ?? "Answer every question and submit once."} icon={ClipboardCheck} />
    <div className="space-y-4">{payload.questions.map((question, index) => <StudentPanel key={question.id}><p className="text-xs text-muted">Question {index + 1} · {question.marks} {question.marks === 1 ? "mark" : "marks"}</p><h2 className="mt-2 font-semibold">{question.prompt}</h2>{question.type === "MCQ" ? <div className="mt-4 space-y-2">{question.options.map((option, optionIndex) => <label key={optionIndex} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3"><input type="radio" name={question.id} checked={answers[question.id] === optionIndex} onChange={() => setAnswer(question.id, optionIndex)} />{String(option)}</label>)}</div> : <Field id={`answer-${question.id}`} label="Your answer"><textarea id={`answer-${question.id}`} className={`${inputClass} min-h-28`} value={typeof answers[question.id] === "string" ? String(answers[question.id]) : ""} onChange={(event) => setAnswer(question.id, event.target.value)} /></Field>}</StudentPanel>)}</div>
    <div className="mt-5 flex flex-wrap gap-3"><Button variant="soft-info" onClick={save}>Save answers</Button><Button onClick={submit}>Submit attempt</Button></div>
  </>;
}

export function StudentCertificates() {
  const [items, setItems] = useState<Array<{ id: string; name: string; serial: string; issuedAt: string; expiresAt: string | null; status: string; verificationCode: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<typeof items>("/api/student/certificates").then(({ data }) => setItems(data)).catch(() => setItems([])).finally(() => setLoading(false));
  }, []);
  async function share(id: string) {
    try {
      const { data } = await apiClient.get<{ url: string }>(`/api/student/certificates/${id}/share`);
      await navigator.clipboard.writeText(data.url);
      toast.success("Verification link copied.");
    } catch {
      toast.error("Could not copy the verification link.");
    }
  }
  return (
    <>
      <StudentHeading title="Certificates" description="Download or share credentials issued to your account." icon={Award} />
      {loading ? <StudentEmpty title="Loading certificates" description="Checking your issued credentials." icon={Award} /> : items.length ? <div className="space-y-4">{items.map((certificate) => <StudentPanel key={certificate.id}>
        <div className="flex flex-wrap items-start gap-4"><span className="rounded-2xl bg-amber-500/15 p-4 text-amber-700 dark:text-amber-300"><Award className="size-10" aria-hidden="true" /></span><div><Badge tone={certificate.status === "Issued" ? "success" : certificate.status === "Expired" ? "warning" : "danger"}>{certificate.status}</Badge><h2 className="mt-3 font-serif text-2xl font-semibold">{certificate.name}</h2><p className="mt-2 text-sm text-muted">{certificate.serial} · Issued {new Date(certificate.issuedAt).toISOString().slice(0, 10)}</p>{certificate.expiresAt ? <p className="mt-1 text-xs text-muted">Expires {new Date(certificate.expiresAt).toISOString().slice(0, 10)}</p> : null}</div></div>
        <div className="mt-5 flex flex-wrap gap-3"><a className="inline-flex min-h-11 items-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-fg" href={`/api/student/certificates/${certificate.id}/download`}><Download className="mr-2 size-4" aria-hidden="true" />Download</a><Button variant="soft-violet" onClick={() => share(certificate.id)}><Copy className="mr-2 size-4" aria-hidden="true" />Share verification link</Button></div>
      </StudentPanel>)}</div> : <StudentEmpty title="No certificates yet" description="Credentials issued to your account will appear here." icon={Award} />}
    </>
  );
}

export function StudentMemberships() {
  const [data, setData] = useState<{ active: Array<{ id: string; name: string; description: string | null; priceMinor: number; currency: string; interval: string; benefits: string[]; status: string; startsAt: string; endsAt: string | null }>; plans: Array<{ id: string; name: string; description: string | null; priceMinor: number; currency: string; interval: string; benefits: string[] }> }>({ active: [], plans: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<typeof data>("/api/student/memberships").then(({ data }) => setData(data)).catch(() => setData({ active: [], plans: [] })).finally(() => setLoading(false));
  }, []);
  const money = (minor: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  return <>
    <StudentHeading title="Memberships" description="View your membership and available learning plans." icon={HeartHandshake} />
    {loading ? <StudentEmpty title="Loading memberships" description="Checking your account." icon={HeartHandshake} /> : <>
      {data.active.length ? <div className="mb-5 space-y-4">{data.active.map((membership) => <StudentPanel key={membership.id}><Badge tone={membership.status === "ACTIVE" ? "success" : "warning"}>{membership.status}</Badge><h2 className="mt-3 font-serif text-xl font-semibold">{membership.name}</h2><p className="mt-2 text-sm text-muted">{membership.description ?? "Learning membership"}</p><p className="mt-3 text-xs text-muted">{membership.interval} · {membership.endsAt ? `Ends ${new Date(membership.endsAt).toISOString().slice(0, 10)}` : "No expiry"}</p></StudentPanel>)}</div> : <StudentEmpty title="No memberships yet" description="Your active and expired memberships will appear here." icon={HeartHandshake} />}
      {data.plans.length ? <div className="grid gap-5 md:grid-cols-2">{data.plans.map((plan) => <StudentPanel key={plan.id} title={plan.name}><p className="text-2xl font-semibold text-accent">{money(plan.priceMinor, plan.currency)} <span className="text-xs font-normal text-muted">{plan.interval.toLowerCase()}</span></p><p className="mt-2 text-sm text-muted">{plan.description}</p><ul className="mt-3 space-y-1 text-sm">{plan.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}</ul><p className="mt-4 text-xs text-muted">Purchase and renewal require commerce provider approval.</p></StudentPanel>)}</div> : null}
    </>}
  </>;
}

export function StudentPurchases() {
  type Order = { id: string; number: string; status: string; currency: string; totalMinor: number; createdAt: string; items: Array<{ kind: string; name: string; quantity: number; totalMinor: number }>; payments: Array<{ status: string; method: string | null; amountMinor: number }>; refunds: Array<{ amountMinor: number; reason: string; processedAt: string }> };
  const [orders, setOrders] = useState<Order[]>([]);
  const [selected, setSelected] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<Order[]>("/api/student/orders").then(({ data }) => setOrders(data)).catch(() => setOrders([])).finally(() => setLoading(false));
  }, []);
  const money = (minor: number, currency: string) => new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(minor / 100);
  return <>
    <StudentHeading title="My Purchases" description="Your orders, payments and refunds." icon={Receipt} />
    {loading ? <StudentEmpty title="Loading purchases" description="Checking your orders." icon={Receipt} /> : orders.length ? <div className="space-y-4">{orders.map((order) => <StudentPanel key={order.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge tone={order.status === "PAID" ? "success" : "warning"}>{order.status}</Badge><h2 className="mt-3 font-serif text-xl font-semibold">{order.items.map((item) => item.name).join(", ")}</h2><p className="mt-2 text-xs text-muted">{new Date(order.createdAt).toISOString().slice(0, 10)} · {order.number}</p></div><span className="rounded-xl bg-teal-500/10 px-4 py-2 font-semibold text-teal-800 dark:text-teal-200">{money(order.totalMinor, order.currency)}</span></div><Button className="mt-4" variant="soft-info" onClick={async () => { try { const result = await apiClient.get<Order>(`/api/student/orders/${order.id}`); setSelected(result.data); } catch { toast.error("Could not load order details."); } }}>View Details</Button></StudentPanel>)}</div> : <StudentEmpty title="No purchases yet" description="Your completed and pending orders will appear here." icon={Receipt} />}
    <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Order details">
      {selected ? <dl className="space-y-4 text-sm">{[["Reference", selected.number], ["Status", selected.status], ["Date", new Date(selected.createdAt).toISOString().slice(0, 10)], ["Amount", money(selected.totalMinor, selected.currency)], ["Payments", selected.payments.length ? selected.payments.map((payment) => payment.status).join(", ") : "None"], ["Refunds", selected.refunds.length ? selected.refunds.map((refund) => money(refund.amountMinor, selected.currency)).join(", ") : "None"]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl> : null}
    </Modal>
  </>;
}

export function StudentReferrals() {
  const [transactions, setTransactions] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [referral, setReferral] = useState<{ code: string; balanceMinor: number; transactions: Array<{ id: string; referee: string; creditMinor: number; status: string; createdAt: string }> }>({ code: "", balanceMinor: 0, transactions: [] });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    apiClient.get<typeof referral>("/api/student/referrals").then(({ data }) => setReferral(data)).catch(() => setReferral({ code: "", balanceMinor: 0, transactions: [] })).finally(() => setLoading(false));
  }, []);
  async function copy() {
    if (!referral.code) return;
    try { await navigator.clipboard.writeText(referral.code); setCopyError(""); toast.success("Referral code copied."); }
    catch { setCopyError(`Clipboard access is unavailable. Select and copy ${referral.code} manually.`); toast.error("Could not access clipboard."); }
  }
  const balance = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(referral.balanceMinor / 100);
  return <><StudentHeading title="Refer & Earn" description="View your learner referral code and server-tracked reward balance." icon={Gift} /><div className="grid gap-5 md:grid-cols-2"><StudentPanel title="Your referral code">{loading ? <p className="text-sm text-muted">Loading code…</p> : <p className="rounded-xl border border-dashed border-accent/40 bg-accent-soft p-4 font-mono text-lg font-semibold break-all">{referral.code}</p>}<Button className="mt-4" variant="soft-violet" onClick={copy} disabled={!referral.code}><Copy className="size-4" aria-hidden="true" />Copy code</Button>{copyError ? <p role="alert" className="mt-3 text-sm text-danger">{copyError}</p> : null}</StudentPanel><StudentPanel title="Credit balance"><p className="text-4xl font-semibold text-accent">{balance}</p><p className="mt-2 text-sm text-muted">Credits are added only after approved paid orders.</p><Button className="mt-4" onClick={() => setTransactions(true)}>View Transactions</Button></StudentPanel></div><StudentPanel title="Referral rules" className="mt-5"><ol className="list-decimal space-y-2 pl-5 text-sm text-muted"><li>Self-referrals and duplicate accounts are not eligible.</li><li>Rewards are approved only after a referred order is paid and verified.</li><li>Final reward amounts and expiry remain subject to IBMV approval.</li></ol></StudentPanel><Modal open={transactions} onClose={() => setTransactions(false)} title="Referral transactions">{referral.transactions.length ? <ul className="space-y-3">{referral.transactions.map((item) => <li key={item.id} className="rounded-xl border border-border p-4"><div className="flex justify-between gap-3"><strong>{item.referee}</strong><Badge tone={item.status === "PAID" ? "success" : "warning"}>{item.status}</Badge></div><p className="mt-2 text-sm text-muted">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(item.creditMinor / 100)} · {new Date(item.createdAt).toISOString().slice(0, 10)}</p></li>)}</ul> : <StudentEmpty title="No referral transactions" description="Verified referral rewards will appear here." icon={Gift} />}</Modal></>;
}
