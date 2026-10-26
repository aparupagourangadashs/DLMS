"use client";

import { useState } from "react";
import { Copy, Eye, FilePlus2, Mail, MessageCircle, MessageSquare, PencilLine, Search, Smartphone, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { palette, type ColorKey } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { useDemoRecords } from "@/lib/admin/use-demo-records";
import { Button } from "@/components/ui/Button";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { Card, CardHeader } from "@/components/ui/Card";
import { DemoNotice, PageHeader } from "../PageHeader";

const channels = ["Email", "SMS", "WhatsApp", "Push"] as const;
type Channel = typeof channels[number];
type Template = { id: string; name: string; channel: Channel; subject: string; replyTo: string; content: string; unsubscribe: boolean; unsubscribeText: string };
const icons = { Email: Mail, SMS: MessageSquare, WhatsApp: MessageCircle, Push: Smartphone };
const colors: Record<Channel, ColorKey> = { Email: "blue", SMS: "violet", WhatsApp: "emerald", Push: "orange" };
const initial: Template[] = channels.map((channel, i) => ({
  id: `template-${i}`, channel, name: `${channel} course invitation`, subject: "Explore your next course",
  replyTo: "learning@example.com", content: "Hello {{learner_name}},\n\n**Learning starts here.** Explore {{course_name}} with us.",
  unsubscribe: true, unsubscribeText: "Unsubscribe from promotional emails",
}));
const empty = (channel: Channel): Template => ({ id: "", name: "", channel, subject: "", replyTo: "", content: "", unsubscribe: true, unsubscribeText: "Unsubscribe from promotional emails" });
function previewText(value: string) {
  return value.replaceAll("{{learner_name}}", "Demo Learner").replaceAll("{{course_name}}", "Demo Course");
}
function ContentPreview({ content }: { content: string }) {
  return <div className="space-y-3 break-words">{previewText(content).split("\n").map((line, i) => <p key={i} className="min-h-4 whitespace-pre-wrap">{line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : part)}</p>)}</div>;
}

export function PromotionalTemplates() {
  const [records, save] = useDemoRecords("dl-lms-demo-promotional-templates-v1", initial);
  const [channel, setChannel] = useState<Channel>("Email");
  const [draft, setDraft] = useState<Template | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [remove, setRemove] = useState<Template | null>(null);
  const limit = draft?.channel === "Push" ? 240 : draft?.channel === "SMS" ? 1600 : 20000;
  const filtered = records.filter((template) => template.channel === channel && `${template.name} ${template.subject} ${template.content}`.toLowerCase().includes(query.toLowerCase()));
  function update(values: Partial<Template>) { if (draft) { setDraft({ ...draft, ...values }); setError(""); } }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.name.trim() || !draft.content.trim()) { setError("Name and message content cannot be blank."); return; }
    if (draft.channel === "Email" && (!draft.subject.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.replyTo))) { setError("Provide an email subject and a valid reply-to email address."); return; }
    if (draft.channel === "Email" && !draft.unsubscribe) { setError("This promotional email demo requires an unsubscribe footer."); return; }
    if (draft.channel === "Email" && draft.unsubscribe && !draft.unsubscribeText.trim()) { setError("Enter the unsubscribe footer text."); return; }
    if (draft.content.length > limit) { setError(`Content exceeds the ${limit.toLocaleString()} character demo limit.`); return; }
    if (records.some((template) => template.id !== draft.id && template.channel === draft.channel && template.name.toLowerCase() === draft.name.trim().toLowerCase())) { setError("A template with this name already exists in this channel."); return; }
    const next = { ...draft, id: draft.id || crypto.randomUUID(), name: draft.name.trim(), subject: draft.subject.trim(), replyTo: draft.replyTo.trim() };
    save(draft.id ? records.map((record) => record.id === draft.id ? next : record) : [...records, next]);
    setDraft(null);
  }
  return <>
    <PageHeader title="Promotional Templates" description="Reusable message drafts for Email, SMS, WhatsApp and Push." status="ready" actions={<Button variant="gold" onClick={() => { setDraft(empty(channel)); setError(""); }}><FilePlus2 className="size-4" aria-hidden="true" />Add Template</Button>} />
    <DemoNotice>Browser-local demo drafts only. Nothing is sent or uploaded to a provider. WhatsApp approval, delivery, real unsubscribe links and email rendering are not connected. Email formatting supports paragraphs and **bold**, not arbitrary HTML.</DemoNotice>
    <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Templates by channel">{channels.map((value) => { const Icon = icons[value]; return <StatCard key={value} label={`${value} drafts`} value={String(records.filter((template) => template.channel === value).length)} hint="Local demo templates" color={colors[value]} icon={<Icon />} />; })}</section>
    <Card className="mb-5 overflow-hidden">
      <CardHeader className="bg-linear-to-r from-orange-50 via-surface to-surface dark:from-orange-500/10" title={<span className="inline-flex items-center gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", palette[colors[channel]].solid)} aria-hidden="true">{(() => { const Icon = icons[channel]; return <Icon className="size-4" />; })()}</span>Template library</span>} description="Choose a channel, search drafts, then edit with a safe live preview." />
      <div className="grid gap-4 p-4 lg:grid-cols-[1fr_minmax(16rem,24rem)] lg:items-end"><Tabs label="Template channels" value={channel} onChange={setChannel} className="min-w-0" items={channels.map((value) => ({ value, label: value, icon: icons[value], color: colors[value], count: records.filter((template) => template.channel === value).length }))} /><Field id="template-search" label={`Search ${channel} templates`}><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-accent" aria-hidden="true" /><input id="template-search" type="search" className={cn(inputClass, "pl-9")} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, subject or content" /></div></Field></div>
    </Card>
    <p role="status" className="mb-3 text-sm text-muted">{filtered.length} matching {channel} drafts</p>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((template) => { const color = palette[colors[template.channel]]; const Icon = icons[template.channel]; return <Card key={template.id} className="relative flex min-w-0 flex-col gap-3 overflow-hidden break-words p-4"><span className={cn("absolute inset-x-0 top-0 h-1", color.bar)} aria-hidden="true" /><div className="flex items-start gap-3"><span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", color.tile)} aria-hidden="true"><Icon className="size-5" /></span><div className="min-w-0"><h2 className="font-semibold">{template.name}</h2><div className="mt-1 flex flex-wrap gap-1.5"><Badge tone="info">{template.channel}</Badge><Badge tone="warning">Local draft</Badge>{template.channel === "Email" && template.unsubscribe ? <Badge tone="success">Unsubscribe footer</Badge> : null}</div></div></div>{template.channel === "Email" && <p className="text-sm"><strong>Subject:</strong> {template.subject}</p>}<p className="line-clamp-3 rounded-xl bg-surface-muted p-3 whitespace-pre-wrap text-sm text-muted">{template.content}</p><div className="mt-auto flex flex-wrap gap-2"><Button size="sm" variant="soft-info" onClick={() => { setDraft({ ...template }); setError(""); }}><PencilLine className="size-3.5" aria-hidden="true" />Edit &amp; preview</Button><Button size="sm" variant="soft-violet" onClick={() => { setDraft({ ...template, id: "", name: `${template.name.slice(0, 95)} copy` }); setError(""); }}><Copy className="size-3.5" aria-hidden="true" />Duplicate</Button><Button size="sm" variant="soft-danger" onClick={() => setRemove(template)}><Trash2 className="size-3.5" aria-hidden="true" />Delete</Button></div></Card>; })}</div>
    {!filtered.length && <Card className="p-6 text-center text-sm"><Search className="mx-auto mb-2 size-6 text-accent" aria-hidden="true" />No matching templates. Clear your search or add a {channel} draft.</Card>}
    <Modal open={draft !== null} onClose={() => setDraft(null)} title={`${draft?.id ? "Edit" : "Add"} ${draft?.channel ?? channel} Template`} variant="drawer" size="lg">
      {draft && <form onSubmit={submit} className="space-y-4">
        <Field id="template-name" label="Template name" required><input id="template-name" className={inputClass} required maxLength={100} value={draft.name} onChange={(event) => update({ name: event.target.value })} /></Field>
        {draft.channel === "Email" && <>
          <Field id="template-subject" label="Email subject" required><input id="template-subject" className={inputClass} required maxLength={200} value={draft.subject} onChange={(event) => update({ subject: event.target.value })} /></Field>
          <Field id="template-reply" label="Reply-to" required><input id="template-reply" type="email" className={inputClass} required maxLength={254} value={draft.replyTo} onChange={(event) => update({ replyTo: event.target.value })} /></Field>
        </>}
        <Field id="template-content" label="Message content" required help={`Use {{learner_name}} and {{course_name}}. ${draft.content.length}/${limit} characters; SMS segment billing is not simulated.`}><textarea id="template-content" className={`${inputClass} h-44 py-3`} required maxLength={limit} value={draft.content} onChange={(event) => update({ content: event.target.value })} /></Field>
        {draft.channel === "Email" && <>
          <Field id="template-upload" label="Import text / Markdown" help="Replaces content locally. .txt or .md, at most 100 KB; no HTML uploads."><input id="template-upload" type="file" accept=".txt,.md,text/plain,text/markdown" className="w-full text-sm" onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > 100 * 1024 || !/\.(txt|md)$/i.test(file.name)) { setError("Choose a .txt or .md file up to 100 KB."); return; }
            try {
              const content = await file.text();
              if (content.length > 20000) { setError("Imported content exceeds 20,000 characters."); return; }
              setDraft((current) => current ? { ...current, content } : null);
              setError("");
            } catch { setError("The selected file could not be read. Try a different file."); }
          }} /></Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={draft.unsubscribe} onChange={(event) => update({ unsubscribe: event.target.checked })} />Include unsubscribe footer (required to save a promotional email)</label>
          {draft.unsubscribe && <Field id="template-unsubscribe" label="Unsubscribe footer text" required><input id="template-unsubscribe" className={inputClass} maxLength={200} required value={draft.unsubscribeText} onChange={(event) => update({ unsubscribeText: event.target.value })} /></Field>}
        </>}
        <section aria-label="Message preview" className="overflow-hidden break-words rounded-xl border border-border bg-background text-sm">
          <h3 className={cn("flex items-center gap-2 px-4 py-3 font-semibold", palette[colors[draft.channel]].tile)}><Eye className="size-4" aria-hidden="true" />Preview · sample personalization</h3><div className="p-4">
          {draft.channel === "Email" && <div className="mb-4 border-b border-border pb-3"><p><strong>Subject:</strong> {previewText(draft.subject) || "(No subject)"}</p><p><strong>Reply-to:</strong> {draft.replyTo || "(Not set)"}</p></div>}
          {draft.channel === "Email" ? <ContentPreview content={draft.content || "(No content)"} /> : <p className="whitespace-pre-wrap break-words">{previewText(draft.content) || "(No content)"}</p>}
          {draft.channel === "Email" && draft.unsubscribe && <p className="mt-4 border-t border-border pt-3 text-muted">{draft.unsubscribeText} · Preview only, no live link</p>}
        </div></section>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2"><Button onClick={() => setDraft(null)}>Cancel</Button><Button type="submit" variant="success"><FilePlus2 className="size-4" aria-hidden="true" />Save local draft</Button></div>
      </form>}
    </Modal>
    <Modal open={remove !== null} onClose={() => setRemove(null)} title="Delete local template?" footer={<><Button onClick={() => setRemove(null)}>Cancel</Button><Button variant="danger" onClick={() => { save(records.filter((record) => record.id !== remove?.id)); setRemove(null); }}><Trash2 className="size-4" aria-hidden="true" />Delete demo draft</Button></>}><p className="text-sm">Delete {remove?.name} from this browser&apos;s demo drafts? No provider template will be changed.</p></Modal>
  </>;
}
