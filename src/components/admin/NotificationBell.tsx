"use client";

import { Popover } from "@/components/ui/Popover";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import type { NotificationList } from "@/server/services/notifications";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const POLL_MS = 60_000;
const LIST_URL = "/api/admin/notifications";
const itemClass = "flex w-full rounded-lg px-3 py-2 text-left hover:bg-accent-soft";

type Loaded = NotificationList & { at: number };

function ago(now: number, iso: string) {
    const minutes = Math.floor((now - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} ${days === 1 ? "day" : "days"} ago`;
}

/** The staff member's own notifications: refreshed when the menu opens, when the window regains focus and once a minute while it is visible. */
export function NotificationBell() {
    const [data, setData] = useState<Loaded | null>(null);
    const [failed, setFailed] = useState(false);
    const [nonce, setNonce] = useState(0);
    const refresh = () => setNonce((value) => value + 1);

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            apiClient
                .get<NotificationList>(LIST_URL)
                .then((result) => {
                    if (cancelled) return;
                    setData({ ...result.data, at: Date.now() });
                    setFailed(false);
                })
                .catch(() => {
                    if (!cancelled) setFailed(true);
                });
        void load();
        const timer = window.setInterval(() => {
            if (document.visibilityState === "visible") void load();
        }, POLL_MS);
        const onFocus = () => void load();
        window.addEventListener("focus", onFocus);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
            window.removeEventListener("focus", onFocus);
        };
    }, [nonce]);

    // Marks them read on screen at once, then on the server; a failed call is put right by the next refresh.
    const markRead = (ids?: string[]) => {
        setData((current) =>
            current && {
                ...current,
                unread: ids ? Math.max(0, current.unread - current.items.filter((item) => !item.read && ids.includes(item.id)).length) : 0,
                items: current.items.map((item) => (!ids || ids.includes(item.id) ? { ...item, read: true } : item)),
            },
        );
        apiClient.post("/api/admin/notifications/read", ids ? { ids } : {}).catch(refresh);
    };

    const unread = data?.unread ?? 0;

    return (
        <Popover
            label="Notifications"
            panelClassName="w-80"
            trigger={({ open, toggle, ref }) => (
                <button
                    ref={ref}
                    type="button"
                    onClick={() => {
                        if (!open) refresh();
                        toggle();
                    }}
                    aria-expanded={open}
                    aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
                    className="relative inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface hover:bg-surface-muted"
                >
                    <Bell className="size-4" aria-hidden="true" />
                    {unread > 0 ? (
                        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white" aria-hidden="true">
                            {unread > 9 ? "9+" : unread}
                        </span>
                    ) : null}
                </button>
            )}
        >
            {(close) => (
                <div>
                    <div className="flex items-center justify-between gap-2 px-3 pt-2 pb-1">
                        <p className="text-sm font-semibold">Notifications</p>
                        <button type="button" disabled={unread === 0} onClick={() => markRead()} className="text-xs font-medium text-accent hover:underline disabled:text-muted disabled:no-underline">
                            Mark all as read
                        </button>
                    </div>
                    {data === null ? (
                        failed ? (
                            <p role="alert" className="px-3 py-6 text-center text-sm text-muted">
                                Could not load notifications.{" "}
                                <button type="button" onClick={refresh} className="font-medium text-accent underline">
                                    Try again
                                </button>
                            </p>
                        ) : (
                            <p role="status" className="px-3 py-6 text-center text-sm text-muted">
                                Loading…
                            </p>
                        )
                    ) : data.items.length === 0 ? (
                        <p className="px-3 py-6 text-center text-sm text-muted">You are all caught up.</p>
                    ) : (
                        <ul className="max-h-96 overflow-y-auto">
                            {data.items.map((item) => {
                                const content = (
                                    <span className="flex w-full items-start gap-2">
                                        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-danger")} aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            <span className={cn("block text-sm break-words", item.read ? "text-muted" : "font-semibold")}>
                                                {item.read ? null : <span className="sr-only">Unread: </span>}
                                                {item.title}
                                            </span>
                                            {item.body ? <span className="line-clamp-2 block text-xs break-words text-muted">{item.body}</span> : null}
                                            <span className="block text-xs text-muted">{ago(data.at, item.createdAt)}</span>
                                        </span>
                                    </span>
                                );
                                return (
                                    <li key={item.id}>
                                        {item.href ? (
                                            <Link
                                                href={item.href}
                                                className={itemClass}
                                                onClick={() => {
                                                    if (!item.read) markRead([item.id]);
                                                    close();
                                                }}
                                            >
                                                {content}
                                            </Link>
                                        ) : (
                                            <button type="button" className={itemClass} onClick={() => !item.read && markRead([item.id])}>
                                                {content}
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            )}
        </Popover>
    );
}
