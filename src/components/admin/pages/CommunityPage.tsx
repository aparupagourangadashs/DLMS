"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Pin, PinOff, Send, Users } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/Badge";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Tabs } from "@/components/ui/Tabs";
import { DemoNotice, PageHeader } from "../PageHeader";

export type CommunityMessage = { id: string; author: string; role: string; time: string; text: string; pinned: boolean };
export type CommunityMember = { id: string; name: string; role: "Moderator" | "Member"; joined: string };
export type Community = { id: string; name: string; description: string; messages: CommunityMessage[]; members: CommunityMember[] };

export function CommunityPage({ communities: initial }: { communities: Community[] }) {
  const [communities, setCommunities] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id);
  const [tab, setTab] = useState<"messages" | "members" | "pins">("messages");
  const [draft, setDraft] = useState("");
  const [removing, setRemoving] = useState<CommunityMember | null>(null);
  const active = communities.find((c) => c.id === activeId);

  const update = (fn: (c: Community) => Community) => setCommunities((prev) => prev.map((c) => (c.id === activeId ? fn(c) : c)));

  const togglePin = (m: CommunityMessage) => {
    update((c) => ({ ...c, messages: c.messages.map((x) => (x.id === m.id ? { ...x, pinned: !x.pinned } : x)) }));
    toast.success(m.pinned ? "Message unpinned" : "Message pinned");
  };

  return (
    <>
      <PageHeader title="Community" description="Learner communities with members, messages and pinned posts." status="ready" />
      <DemoNotice />
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit p-2">
          <h2 className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted uppercase">Communities</h2>
          <ul>
            {communities.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  aria-current={c.id === activeId ? "true" : undefined}
                  className={cn("w-full rounded-xl px-3 py-2.5 text-left", c.id === activeId ? "bg-accent-soft" : "hover:bg-accent-soft/50")}
                >
                  <span className="block text-sm font-semibold">{c.name}</span>
                  <span className="block text-xs text-muted">
                    {c.members.length} members · {c.messages.length} messages
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Card>

        {active ? (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
              <div>
                <h2 className="font-serif text-2xl font-semibold">{active.name}</h2>
                <p className="text-sm text-muted">{active.description}</p>
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
                  { value: "messages", label: "Messages", count: active.messages.length },
                  { value: "members", label: "Members", count: active.members.length },
                  { value: "pins", label: "Pins", count: active.messages.filter((m) => m.pinned).length },
                ]}
              />
            </div>

            {tab === "members" ? (
              <ul className="divide-y divide-border">
                {active.members.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-lotus-pink/30 text-xs font-semibold" aria-hidden="true">
                      {m.name.split(" ").map((p) => p[0]).join("")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{m.name}</p>
                      <p className="text-xs text-muted">Joined {m.joined}</p>
                    </div>
                    <Badge tone={m.role === "Moderator" ? "accent" : "neutral"}>{m.role}</Badge>
                    <Button size="sm" variant="soft-danger" onClick={() => setRemoving(m)}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <MessageList messages={tab === "pins" ? active.messages.filter((m) => m.pinned) : active.messages} onTogglePin={togglePin} emptyPins={tab === "pins"} />
            )}

            {tab === "messages" ? (
              <form
                className="flex gap-2 border-t border-border p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  const text = draft.trim();
                  if (!text) return;
                  update((c) => ({
                    ...c,
                    messages: [...c.messages, { id: `m-${c.messages.length + 1}`, author: "Demo Admin", role: "Admin", time: "Just now", text, pinned: false }],
                  }));
                  setDraft("");
                }}
              >
                <label htmlFor="composer" className="sr-only">
                  Write a message
                </label>
                <input id="composer" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message to the community…" className={inputClass} />
                <Button type="submit" variant="primary" disabled={!draft.trim()}>
                  <Send className="size-4" aria-hidden="true" />
                  Send
                </Button>
              </form>
            ) : null}
          </Card>
        ) : null}
      </div>

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
    <ul className="flex max-h-[28rem] flex-col gap-1 overflow-y-auto p-4" aria-label="Messages">
      {messages.map((m) => (
        <li key={m.id} className="group flex gap-3 rounded-xl p-2 hover:bg-accent-soft/40">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent" aria-hidden="true">
            {m.author.split(" ").map((p) => p[0]).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold">{m.author}</span> <span className="text-xs text-muted">· {m.role} · {m.time}</span>
              {m.pinned ? (
                <Badge tone="gold" className="ml-2">
                  <Pin className="size-3" aria-hidden="true" /> Pinned
                </Badge>
              ) : null}
            </p>
            <p className="mt-0.5 text-sm text-foreground/90">{m.text}</p>
          </div>
          <IconButton label={m.pinned ? "Unpin message" : "Pin message"} onClick={() => onTogglePin(m)}>
            {m.pinned ? <PinOff className="size-4" aria-hidden="true" /> : <Pin className="size-4" aria-hidden="true" />}
          </IconButton>
        </li>
      ))}
    </ul>
  );
}
