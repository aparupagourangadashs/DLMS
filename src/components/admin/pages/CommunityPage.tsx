"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, ChevronRight, Clock3, HeartHandshake, LayoutList, MessageSquare, Pin, PinOff, Plus, Send, ShieldCheck, Users, UserRoundMinus } from "lucide-react";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { DemoNotice, PageHeader } from "../PageHeader";

export type CommunityMessage = { id: string; author: string; role: string; time: string; text: string; pinned: boolean };
export type CommunityMember = { id: string; name: string; role: "Moderator" | "Member"; joined: string };
export type Community = { id: string; name: string; description: string; layout?: "messages" | "feed"; messages: CommunityMessage[]; members: CommunityMember[] };

export function CommunityPage({ communities: initial }: { communities: Community[] }) {
  const [communities, setCommunities] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id);
  const [tab, setTab] = useState<"messages" | "members" | "pins">("messages");
  const [draft, setDraft] = useState("");
  const [removing, setRemoving] = useState<CommunityMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [communityDraft, setCommunityDraft] = useState<{ name: string; description: string; layout: "messages" | "feed" }>({ name: "", description: "", layout: "messages" });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});
  const active = communities.find((c) => c.id === activeId);
  const activeColor = palette[cardCycle[Math.max(0, communities.findIndex((c) => c.id === activeId)) % cardCycle.length]];

  const update = (fn: (c: Community) => Community) => setCommunities((prev) => prev.map((c) => (c.id === activeId ? fn(c) : c)));

  const togglePin = (m: CommunityMessage) => {
    update((c) => ({ ...c, messages: c.messages.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)) }));
    toast.success(m.pinned ? "Message unpinned" : "Message pinned");
  };

  return (
    <>
      <PageHeader title="Community" description="Learner communities with members, messages and pinned posts." status="ready" actions={<Button variant="gold" onClick={() => { setCommunityDraft({ name: "", description: "", layout: "messages" }); setCreateErrors({}); setCreating(true); }}><Plus className="size-4" aria-hidden="true" />New Community</Button>} />
      <DemoNotice />
      <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="h-fit min-w-0 overflow-hidden">
          <div className="community-directory-heading">
            <HeartHandshake className="size-5" aria-hidden="true" />
            <h2 className="flex-1 font-semibold">Your communities</h2>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{communities.length}</span>
          </div>
          <ul className="grid gap-2 p-3 sm:grid-cols-2 xl:grid-cols-1">
            {communities.map((c, index) => {
              const color = palette[cardCycle[index % cardCycle.length]];
              const Icon = index % 2 === 0 ? BookOpen : HeartHandshake;
              return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => { setActiveId(c.id); setDraft(""); }}
                  aria-current={c.id === activeId ? "true" : undefined}
                  className={cn("community-choice", c.id === activeId ? color.tile : "hover:bg-surface-muted")}
                >
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", c.id === activeId ? color.solid : color.tile)} aria-hidden="true"><Icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground">{c.name}</span>
                    <span className="mt-1 block text-xs text-muted">{c.members.length} members · {c.messages.length} messages</span>
                  </span>
                  <ChevronRight className={cn("size-4 shrink-0", color.text)} aria-hidden="true" />
                </button>
              </li>
              );
            })}
          </ul>
        </Card>

        {active ? (
          <Card className="min-w-0 overflow-hidden">
            <div className="community-heading">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-2xl", activeColor.solid)} aria-hidden="true"><MessageSquare className="size-6" /></span>
                <div className="min-w-0">
                <h2 className="font-serif text-2xl font-semibold">{active.name}</h2>
                <p className="mt-1 text-sm text-muted">{active.description}</p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-muted"><LayoutList className="size-3.5" aria-hidden="true" />{active.layout === "feed" ? "Feed layout · newest posts first" : "Message layout · conversation order"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium">
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", palette.teal.tile)}><Users className="size-3.5" aria-hidden="true" />{active.members.length} members</span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", palette.violet.tile)}><MessageSquare className="size-3.5" aria-hidden="true" />{active.messages.length} messages</span>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1", palette.amber.tile)}><Pin className="size-3.5" aria-hidden="true" />{active.messages.filter((m) => m.pinned).length} pinned</span>
                </div>
                </div>
              </div>
              <Button variant="soft-info" onClick={() => setTab("members")}>
                <Users className="size-4" aria-hidden="true" />
                Manage Members
              </Button>
            </div>
            <div className="border-b border-border px-4 py-3">
              <Tabs
                label="Community views"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "messages", label: "Messages", count: active.messages.length, icon: MessageSquare, color: "violet" },
                  { value: "members", label: "Members", count: active.members.length, icon: Users, color: "teal" },
                  { value: "pins", label: "Pins", count: active.messages.filter((m) => m.pinned).length, icon: Pin, color: "amber" },
                ]}
              />
            </div>

            {tab === "members" ? (
              <ul className="grid gap-3 p-4" aria-label="Community members">
                {active.members.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted/40 p-3">
                    <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold", personColor(m.name).tile)} aria-hidden="true">
                      {m.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <div className="min-w-[100px] flex-1 break-words">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted">Joined {m.joined}</p>
                    </div>
                    <Badge tone={m.role === "Moderator" ? "accent" : "success"}>{m.role === "Moderator" ? <ShieldCheck className="size-3" aria-hidden="true" /> : null}{m.role}</Badge>
                    <Button variant="soft-danger" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>
                      <UserRoundMinus className="size-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <MessageList messages={(tab === "pins" ? active.messages.filter((m) => m.pinned) : active.messages).toSorted((a, b) => active.layout === "feed" ? active.messages.indexOf(b) - active.messages.indexOf(a) : 0)} onTogglePin={togglePin} emptyPins={tab === "pins"} />
            )}

            {tab === "messages" ? (
              <form
                className="community-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text) return;
                  update((c) => ({
                    ...c,
                    messages: [...c.messages, { id: crypto.randomUUID(), author: "Demo Admin", role: "Admin", time: "Just now", text, pinned: false }],
                  }));
                  setDraft("");
                }}
              >
                <label htmlFor="composer" className="mb-2 flex items-center gap-2 text-sm font-semibold"><MessageSquare className="size-4 text-violet-500" aria-hidden="true" />Write a message</label>
                <div className="flex flex-wrap gap-2">
                <input id="composer" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message to the community…" className={inputClass} />
                <Button type="submit" variant="primary" disabled={!draft.trim()}>
                  <Send className="size-4" aria-hidden="true" />
                  Send
                </Button>
                </div>
              </form>
            ) : null}
          </Card>
        ) : null}
      </div>

      <Modal open={creating} onClose={() => setCreating(false)} title="Create community" description="Create a local demo community. No learners are notified.">
        <form noValidate className="flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault();
          const errors: Record<string, string> = {};
          if (!communityDraft.name.trim()) errors.name = "Community name is required.";
          else if (communities.some((community) => community.name.toLowerCase() === communityDraft.name.trim().toLowerCase())) errors.name = "A community with this name already exists.";
          if (!communityDraft.description.trim()) errors.description = "Description is required.";
          setCreateErrors(errors);
          if (Object.keys(errors).length) { document.getElementById(`community-${Object.keys(errors)[0]}`)?.focus(); return; }
          const id = crypto.randomUUID();
          setCommunities((previous) => [...previous, { id, name: communityDraft.name.trim(), description: communityDraft.description.trim(), layout: communityDraft.layout, members: [{ id: crypto.randomUUID(), name: "Demo Admin", role: "Moderator", joined: "Just now" }], messages: [] }]);
          setActiveId(id); setTab("messages"); setDraft(""); setCreating(false);
          toast.success("Demo community created");
        }}>
          <div className={cn("flex items-center gap-3 rounded-xl border border-violet-200 p-4 dark:border-violet-500/25", palette.violet.tile)}><span className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", palette.violet.solid)}><HeartHandshake className="size-6" aria-hidden="true" /></span><div><p className="font-semibold">A new space to learn together</p><p className="mt-1 text-xs text-muted">Choose a conversation or announcement-style feed.</p></div></div>
          <Field id="community-name" label="Community name" required error={createErrors.name}><input id="community-name" className={inputClass} value={communityDraft.name} maxLength={100} onChange={(event) => setCommunityDraft((draft) => ({ ...draft, name: event.target.value }))} aria-invalid={Boolean(createErrors.name)} aria-describedby={createErrors.name ? "community-name-error" : undefined} /></Field>
          <Field id="community-description" label="Description" required error={createErrors.description}><textarea id="community-description" className={cn(inputClass, "min-h-24 py-3")} value={communityDraft.description} onChange={(event) => setCommunityDraft((draft) => ({ ...draft, description: event.target.value }))} aria-invalid={Boolean(createErrors.description)} aria-describedby={createErrors.description ? "community-description-error" : undefined} /></Field>
          <fieldset className="grid gap-2"><legend className="mb-2 text-sm font-medium">Community layout</legend>{(["messages", "feed"] as const).map((layout) => {
            const color = palette[layout === "messages" ? "sky" : "violet"];
            const Icon = layout === "messages" ? MessageSquare : LayoutList;
            return <label key={layout} className={cn("flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 text-sm transition-colors", communityDraft.layout === layout ? color.tile : "bg-surface hover:bg-surface-muted")}><input type="radio" name="community-layout" checked={communityDraft.layout === layout} onChange={() => setCommunityDraft((draft) => ({ ...draft, layout }))} className="mt-2.5 size-4 shrink-0 accent-accent" /><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", color.solid)} aria-hidden="true"><Icon className="size-4" /></span><span><strong className="block">{layout === "messages" ? "Message layout" : "Feed layout"}</strong><span className="text-xs text-muted">{layout === "messages" ? "A conversation in chronological order." : "Latest updates and announcements first."}</span></span></label>;
          })}</fieldset>
          <div className="flex flex-wrap justify-end gap-2"><Button variant="soft-info" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" variant="success"><Plus className="size-4" aria-hidden="true" />Create community</Button></div>
        </form>
      </Modal>

      <Modal
        open={removing !== null}
        onClose={() => setRemoving(null)}
        title="Remove member?"
        footer={
          <>
            <Button onClick={() => setRemoving(null)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                update((c) => ({ ...c, members: c.members.filter((m) => m.id !== removing?.id) }));
                toast.success("Member removed", { description: removing?.name });
                setRemoving(null);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm">{removing?.name} will no longer see or post in this community.</p>
      </Modal>
    </>
  );
}

function personColor(name: string) {
  return palette[cardCycle[Array.from(name).reduce((sum, char) => sum + char.charCodeAt(0), 0) % cardCycle.length]];
}

function MessageList({ messages, onTogglePin, emptyPins }: { messages: CommunityMessage[]; onTogglePin: (m: CommunityMessage) => void; emptyPins: boolean }) {
  if (!messages.length) {
    return (
      <EmptyState
        icon={emptyPins ? <Pin className="size-5" /> : <MessageSquare className="size-5" />}
        title={emptyPins ? "No pinned messages" : "No messages yet"}
        description={emptyPins ? "Pin important messages so members can find them quickly." : "Start the conversation below."}
      />
    );
  }
  return (
    <ul className="community-messages" aria-label="Messages">
      {messages.map((m) => (
        <li key={m.id} className={cn("community-message", m.pinned && "community-message-pinned")}>
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-semibold", personColor(m.author).tile)} aria-hidden="true">
            {m.author.split(" ").map((p) => p[0]).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{m.author}</span>
              <Badge tone={m.role === "Moderator" || m.role === "Admin" ? "accent" : "info"}>{m.role === "Moderator" || m.role === "Admin" ? <ShieldCheck className="size-3" aria-hidden="true" /> : null}{m.role}</Badge>
              {m.pinned ? (
                <Badge tone="gold" className="ml-2">
                  <Pin className="size-3" aria-hidden="true" /> Pinned
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted"><Clock3 className="size-3" aria-hidden="true" />{m.time}</p>
            <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap text-foreground/90">{m.text}</p>
          </div>
          <IconButton className="community-pin" label={m.pinned ? "Unpin message" : "Pin message"} aria-pressed={m.pinned} onClick={() => onTogglePin(m)}>
            {m.pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
