"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Award, Bell, BookOpen, ClipboardCheck, Copy, Download, Gift, HeartHandshake, LifeBuoy, MessagesSquare, Receipt, Search } from "lucide-react";
import { announcements, courses } from "@/lib/student/demo";
import { Badge } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { StudentEmpty, StudentHeading, StudentPanel } from "./StudentUi";

export function StudentAnnouncements() {
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [selected, setSelected] = useState<(typeof announcements)[number] | null>(null);
  const unread = (item: (typeof announcements)[number]) => item.unread && !read.includes(item.id);
  const items = announcements.filter((a) => (!unreadOnly || unread(a)) && `${a.title} ${a.body}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <>
      <StudentHeading title="Announcements" description="Stay close to your learning community. Read status changes are temporary in this preview." icon={Bell} />
      <StudentPanel className="mb-5">
        <Field id="announcement-search" label="Search Announcement"><input id="announcement-search" type="search" className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find an announcement" /></Field>
        <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={unreadOnly} onChange={(e) => setUnreadOnly(e.target.checked)} className="size-5 accent-teal-600" />Show Unread</label>
      </StudentPanel>
      <p role="status" className="mb-3 text-xs text-muted">{items.length} announcements found</p>
      <div className="space-y-4">{items.map((a) => <StudentPanel key={a.id}><div className="mb-3 flex flex-wrap items-center gap-2"><Badge tone={a.priority === "Important" ? "warning" : "info"}>{a.priority}</Badge><Badge tone={unread(a) ? "success" : "neutral"}>{unread(a) ? "Unread" : "Read"}</Badge><span className="text-xs text-muted">{a.category}</span></div><h2 className="font-serif text-xl font-semibold">{a.title}</h2><p className="mt-2 text-sm text-muted">{a.body.slice(0, 115)}...</p><p className="mt-3 text-xs text-muted">{a.date}</p><Button className="mt-4" variant="soft-info" onClick={() => { setSelected(a); setRead((ids) => ids.includes(a.id) ? ids : [...ids, a.id]); }}>Read announcement</Button></StudentPanel>)}</div>
      {!items.length ? <StudentEmpty title="No matching announcements" description="Clear the search or turn off Show Unread to see more." icon={Search} /> : null}
      <Modal open={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title ?? "Announcement"}>{selected ? <><p className="mb-4 text-xs text-muted">{selected.date}</p><p className="text-sm leading-relaxed">{selected.body}</p></> : null}</Modal>
    </>
  );
}

const communities = [
  { id: "study-circle", title: "Study Circle", description: "A welcoming space for thoughtful questions and shared reflections.", posts: [{ title: "Welcome to the sample study circle", body: "Introduce a study question, listen with care and avoid sharing personal information. This original fictional post demonstrates a community feed.", author: "Demo facilitator", date: "26 Oct 2026" }, { title: "One question for your next reading", body: "What would you like to understand more clearly? Note a question for your next session; no reply is sent from this preview.", author: "Demo facilitator", date: "24 Oct 2026" }] },
  { id: "reading-room", title: "Reading Room", description: "Reading habits, study prompts and a little encouragement.", posts: [{ title: "Set aside a quiet moment", body: "Choose a short reading and return to it with attention. All community examples are fictional and contain no learner conversations.", author: "Demo facilitator", date: "25 Oct 2026" }] },
];

export function StudentCommunities() {
  const [selected, setSelected] = useState<string | null>(null);
  const community = communities.find((item) => item.id === selected);
  return (
    <>
      <StudentHeading title="Communities" description="Learn alongside others in a respectful, moderated space. Preview posts are fictional and read-only." icon={MessagesSquare} />
      {community ? <><Button className="mb-4" onClick={() => setSelected(null)}>Back to communities</Button><StudentPanel title={community.title}><p className="mb-5 text-sm text-muted">{community.description}</p><div className="space-y-4">{community.posts.map((post) => <article key={post.title} className="rounded-xl border border-border bg-accent-soft/40 p-4"><p className="mb-2 text-xs text-muted">{post.author} · {post.date}</p><h3 className="font-semibold">{post.title}</h3><p className="mt-2 text-sm leading-relaxed">{post.body}</p></article>)}</div><p className="mt-5 text-xs text-muted">Posting, replies and membership permissions require confirmed moderation rules and backend integration.</p></StudentPanel></> : <div className="grid gap-5 md:grid-cols-2">{communities.map((item) => <StudentPanel key={item.id}><span className="mb-4 inline-flex rounded-2xl bg-violet-500/10 p-3 text-violet-700 dark:text-violet-300"><MessagesSquare className="size-6" aria-hidden="true" /></span><h2 className="font-serif text-2xl font-semibold">{item.title}</h2><p className="mt-2 text-sm text-muted">{item.description}</p><p className="mt-4 rounded-xl bg-accent-soft p-3 text-xs">{item.posts[0].title}</p><Button className="mt-4" variant="soft-violet" onClick={() => setSelected(item.id)}>Open community preview</Button></StudentPanel>)}</div>}
    </>
  );
}

export function StudentExams() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  return <><StudentHeading title="Exams" description="Your assessment space. Exam rules, start, submission and result visibility are not yet connected." icon={ClipboardCheck} /><StudentPanel className="mb-5"><Tabs label="Exam status" value={tab} onChange={setTab} items={[{ value: "upcoming", label: "Upcoming Exams", color: "sky" }, { value: "past", label: "Past Exams", color: "violet" }]} /></StudentPanel><StudentEmpty title={tab === "upcoming" ? "No upcoming sample exams" : "No past sample exams"} description="This preview has no assigned assessments. Exam-taking flows will be designed after assessment requirements are confirmed." icon={ClipboardCheck} /><div className="mt-5"><LinkButton href="/student">Go to Home</LinkButton></div></>;
}

const certificateSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="700" viewBox="0 0 1000 700"><rect width="1000" height="700" fill="#F4F6FA"/><rect x="30" y="30" width="940" height="640" rx="20" fill="white" stroke="#4A5D8F" stroke-width="4"/><g text-anchor="middle" font-family="Georgia,serif" fill="#1a1a3e"><text x="500" y="150" font-size="30">IBMV Learning Platform</text><text x="500" y="240" font-size="46">Sample Certificate</text><text x="500" y="330" font-size="30">Demo Learner</text><text x="500" y="400" font-size="24">Learning Together - Interface Preview</text><text x="500" y="490" font-size="24" fill="#4A5D8F">DEMO ONLY - NOT A VALID CREDENTIAL</text><text x="500" y="565" font-size="18">Illustrative issue date: 20 October 2026. No credential issued.</text></g></svg>`;

export function StudentCertificates() {
  const [preview, setPreview] = useState(false);
  function download() {
    const url = URL.createObjectURL(new Blob([certificateSvg], { type: "image/svg+xml" }));
    const link = document.createElement("a");
    link.href = url; link.download = "ibmv-demo-certificate.svg"; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Sample SVG downloaded. This is not a valid credential.");
  }
  return (
    <>
      <StudentHeading title="Certificates" description="Celebrate learning milestones. This screen demonstrates a sample, not an issued qualification." icon={Award} />
      <StudentPanel>
        <div className="flex flex-wrap items-start gap-4"><span className="rounded-2xl bg-amber-500/15 p-4 text-amber-700 dark:text-amber-300"><Award className="size-10" aria-hidden="true" /></span><div><Badge tone="warning">Demo only · Not valid</Badge><h2 className="mt-3 font-serif text-2xl font-semibold">Learning Together</h2><p className="mt-2 text-sm text-muted">Illustrative issue: 20 Oct 2026 · Expiry: not applicable to sample</p></div></div>
        <div className="mt-5 flex flex-wrap gap-3"><Button variant="soft-violet" onClick={() => setPreview(true)}>Preview sample</Button><Button onClick={download}><Download className="size-4" aria-hidden="true" />Download sample SVG</Button></div>
        <p className="mt-4 text-xs leading-relaxed text-muted">Production PDF format, eligibility, verification and sharing destinations still need confirmation. Credential sharing is unavailable in this demo.</p>
      </StudentPanel>
      <Modal open={preview} onClose={() => setPreview(false)} title="Sample certificate preview" size="lg"><div className="rounded-xl border-4 border-accent/40 bg-accent-soft p-6 text-center"><Award className="mx-auto mb-4 size-12 text-accent" aria-hidden="true" /><p className="font-serif text-3xl">Sample Certificate</p><p className="mt-6 text-xl">Demo Learner</p><p className="mt-3">Learning Together</p><p className="mt-6 text-sm font-bold text-accent">DEMO ONLY · NOT A VALID CREDENTIAL</p></div></Modal>
    </>
  );
}

export function StudentMemberships() {
  return <><StudentHeading title="Memberships" description="A place for your learning memberships and access details." icon={HeartHandshake} /><StudentEmpty title="No active sample memberships" description="Membership plans, renewal and cancellation rules have not been confirmed. No subscription can be purchased from this preview." icon={HeartHandshake} /><div className="mt-5"><LinkButton href="/student/help" variant="soft-info">Membership support</LinkButton></div></>;
}

const purchases = [
  { id: "DEMO-001", course: courses[0], date: "19 Oct 2026", amount: "Free", status: "Sample enrollment" },
  { id: "DEMO-002", course: courses[2], date: "12 Oct 2026", amount: "Free", status: "Sample enrollment" },
];

export function StudentPurchases() {
  const [selected, setSelected] = useState<(typeof purchases)[number] | null>(null);
  return <><StudentHeading title="My Purchases" description="An illustrative enrollment history. No charges or real transactions have occurred." icon={Receipt} /><div className="space-y-4">{purchases.map((item) => <StudentPanel key={item.id}><div className="flex flex-wrap items-start justify-between gap-3"><div><Badge tone="success">{item.status}</Badge><h2 className="mt-3 font-serif text-xl font-semibold">{item.course.title}</h2><p className="mt-2 text-xs text-muted">{item.date} · {item.id}</p></div><span className="rounded-xl bg-teal-500/10 px-4 py-2 font-semibold text-teal-800 dark:text-teal-200">{item.amount}</span></div><Button className="mt-4" variant="soft-info" onClick={() => setSelected(item)}>View Details</Button></StudentPanel>)}</div><Modal open={Boolean(selected)} onClose={() => setSelected(null)} title="Sample enrollment details">{selected ? <dl className="space-y-4 text-sm">{[["Reference", selected.id], ["Course", selected.course.title], ["Date", selected.date], ["Amount", selected.amount], ["Payment", "No payment collected. Fictional enrollment only."]].map(([label, value]) => <div key={label}><dt className="text-xs text-muted">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>)}</dl> : null}<p className="mt-5 text-xs text-muted">Invoice, cancellation and refund policies await confirmation. This is not a receipt.</p></Modal></>;
}

export function StudentReferrals() {
  const [transactions, setTransactions] = useState(false);
  const [copyError, setCopyError] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText("IBMV-DEMO-ONLY"); setCopyError(""); toast.success("Demo code copied. It cannot be redeemed."); }
    catch { setCopyError("Clipboard access is unavailable. Select and copy IBMV-DEMO-ONLY manually."); toast.error("Could not access clipboard."); }
  }
  return <><StudentHeading title="Refer & Earn" description="A preview of referral tools. No rewards program or redemption service is active." icon={Gift} /><div className="grid gap-5 md:grid-cols-2"><StudentPanel title="Your sample referral code"><p className="rounded-xl border border-dashed border-accent/40 bg-accent-soft p-4 font-mono text-lg font-semibold break-all">IBMV-DEMO-ONLY</p><Button className="mt-4" variant="soft-violet" onClick={copy}><Copy className="size-4" aria-hidden="true" />Copy demo code</Button>{copyError ? <p role="alert" className="mt-3 text-sm text-danger">{copyError}</p> : null}<p className="mt-3 text-xs text-muted">Not redeemable. Sharing destinations and reward terms are not configured.</p></StudentPanel><StudentPanel title="Sample credit balance"><p className="text-4xl font-semibold text-accent">0</p><p className="mt-2 text-sm text-muted">No cash value. No referral transactions.</p><Button className="mt-4" onClick={() => setTransactions(true)}>View Transactions</Button></StudentPanel></div><StudentPanel title="Before referrals go live" className="mt-5"><ol className="list-decimal space-y-2 pl-5 text-sm text-muted"><li>IBMV must confirm eligibility, reward amounts and expiry.</li><li>Terms and referral privacy must be reviewed.</li><li>Rewards must be validated on the server, not in browser storage.</li></ol></StudentPanel><Modal open={transactions} onClose={() => setTransactions(false)} title="Referral transactions"><StudentEmpty title="No sample transactions" description="This demo has not earned or redeemed any credits." icon={Gift} /></Modal></>;
}

export function StudentHelp() {
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <StudentHeading title="Help Centre" description="Find your way around the student portal and preview a support request." icon={LifeBuoy} />
      <div className="grid gap-5 xl:grid-cols-2">
        <StudentPanel title="How can we help?">
          <form onSubmit={(event) => { event.preventDefault(); if (message.trim().length < 10) { setError("Please write at least 10 characters to describe the issue."); return; } setError(""); setSaved(message.trim()); toast.success("Draft preview prepared. Nothing has been sent."); }}>
            <Field id="support-message" label="Support message" required error={error} help="Demo only. Do not include personal information."><textarea id="support-message" required maxLength={2000} value={message} onChange={(e) => { setMessage(e.target.value); setSaved(""); }} aria-invalid={Boolean(error)} aria-describedby={error ? "support-message-error" : "support-message-help"} className={`${inputClass} min-h-36 py-3`} placeholder="Describe a sample issue..." /></Field>
            <p className="mt-2 text-xs text-muted">{message.length}/2000 characters</p>
            <Button className="mt-4" type="submit" variant="soft-success">Preview request · Not sent</Button>
          </form>
          {saved ? <div className="mt-4 rounded-xl bg-teal-500/10 p-4" role="status"><p className="text-sm font-semibold">Unsent draft preview</p><p className="mt-2 text-sm whitespace-pre-wrap break-words">{saved}</p></div> : null}
          <p className="mt-4 text-xs leading-relaxed text-muted">Support delivery, verified email/telephone, social and app-download destinations are not configured. There is no Send action until a service is connected.</p>
        </StudentPanel>
        <StudentPanel title="Quick answers">{[{ title: "Where are my courses?", body: "Open My Learning. Filter by stream or switch between Active and Completed Learning." }, { title: "Does opening a lesson change my progress?", body: "No. All progress is fixed sample data. Reading previews do not submit work." }, { title: "Are these real certificates or purchases?", body: "No. Every record is fictional. Sample downloads are visibly marked as invalid." }, { title: "Can I save profile changes?", body: "You can preview edits temporarily. Nothing is saved to a server or shared with admin." }].map((faq) => <details key={faq.title} className="border-b border-border py-3 last:border-0"><summary className="min-h-8 cursor-pointer text-sm font-semibold">{faq.title}</summary><p className="mt-3 text-sm leading-relaxed text-muted">{faq.body}</p></details>)}<div className="mt-4"><LinkButton href="/student/my-learning" variant="soft-info"><BookOpen className="size-4" aria-hidden="true" />Go to My Learning</LinkButton></div></StudentPanel>
      </div>
    </>
  );
}
