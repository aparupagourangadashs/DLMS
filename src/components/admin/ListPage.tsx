"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Columns3,
  Copy,
  Download,
  Ellipsis,
  Eye,
  Inbox,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { ScreenStatus } from "@/lib/admin/navigation";
import type { CellValue, Column, ListConfig, Row } from "@/lib/admin/types";
import { cn } from "@/lib/cn";
import { cardCycle } from "@/lib/colors";
import { useAdminUi } from "@/store/admin-ui";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { Popover } from "@/components/ui/Popover";
import { StatCard, statColor } from "@/components/ui/StatCard";
import { Tabs } from "@/components/ui/Tabs";
import { CellView, cellText } from "./CellView";
import { FormDrawer } from "./FormDrawer";
import { DemoNotice, PageHeader } from "./PageHeader";

const PAGE_SIZE = 10;
const ALL = "__all__";

type Action = NonNullable<ListConfig["rowActions"]>[number];
const actionLabel: Record<Action, string> = {
  view: "View details",
  edit: "Edit",
  duplicate: "Duplicate",
  archive: "Archive",
  delete: "Delete",
  review: "Review",
};

const actionIcon: Record<Action, LucideIcon> = {
  view: Eye,
  edit: Pencil,
  duplicate: Copy,
  archive: Archive,
  delete: Trash2,
  review: ClipboardCheck,
};

// Colour by meaning: view = sky, edit = blue, duplicate = violet, archive = amber, delete = red, review = green.
const actionColor: Record<Action, string> = {
  view: "text-sky-600 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-500/15",
  edit: "text-blue-600 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/15",
  duplicate: "text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/15",
  archive: "text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-500/15",
  delete: "text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/15",
  review: "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-500/15",
};

const inlineActions: Action[] = ["view", "edit", "delete"];

function matches(value: CellValue, wanted: string) {
  return Array.isArray(value) ? value.includes(wanted) : String(value ?? "") === wanted;
}

function compare(a: CellValue, b: CellValue) {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "en-IN", { numeric: true });
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function plural(s: string) {
  if (/[^aeiou]y$/i.test(s)) return `${s.slice(0, -1)}ies`;
  if (/(s|x|ch|sh)$/i.test(s)) return `${s}es`;
  return `${s}s`;
}

export function ListPage({ pageKey, status, config }: { pageKey: string; status: ScreenStatus; config: ListConfig }) {
  const [rows, setRows] = useState<Row[]>(config.rows);
  const [tab, setTab] = useState<string>(config.tabs?.items[0]?.value ?? ALL);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(1);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set(config.columns.filter((c) => c.hidden).map((c) => c.key)));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);
  const [confirm, setConfirm] = useState<{ row: Row; action: "archive" | "delete" } | null>(null);
  const [reviewing, setReviewing] = useState<Row | null>(null);

  const pendingCreate = useAdminUi((s) => s.pendingCreate === pageKey);
  const setPendingCreate = useAdminUi((s) => s.setPendingCreate);
  const formOpen = editing !== null || (pendingCreate && Boolean(config.form));
  const formRow = editing === "new" || editing === null ? undefined : editing;

  const entity = config.entityName;
  const visibleColumns = config.columns.filter((c) => !hidden.has(c.key));
  const tabKey = config.tabs?.key;

  const baseFiltered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !(config.searchKeys ?? []).some((k) => String(r[k] ?? "").toLowerCase().includes(q))) return false;
      for (const [k, v] of Object.entries(filters)) if (v && !matches(r[k], v)) return false;
      if (config.dateFilterKey) {
        const d = String(r[config.dateFilterKey] ?? "").slice(0, 10);
        if (dateFrom && d < dateFrom) return false;
        if (dateTo && d > dateTo) return false;
      }
      return true;
    });
  }, [rows, query, filters, dateFrom, dateTo, config.searchKeys, config.dateFilterKey]);

  const filtered = useMemo(() => {
    const list = tabKey && tab !== ALL ? baseFiltered.filter((r) => matches(r[tabKey], tab)) : baseFiltered;
    if (!sort) return list;
    const sorted = [...list].sort((a, b) => compare(a[sort.key], b[sort.key]));
    return sort.dir === "desc" ? sorted.reverse() : sorted;
  }, [baseFiltered, tab, tabKey, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hasActiveFilters = Boolean(query || dateFrom || dateTo || Object.values(filters).some(Boolean));

  const resetPage = () => setPage(1);
  const clearFilters = () => {
    setQuery("");
    setFilters({});
    setDateFrom("");
    setDateTo("");
    resetPage();
  };

  const closeForm = () => {
    setEditing(null);
    if (pendingCreate) setPendingCreate(null);
  };

  const exportCsv = () => {
    const header = visibleColumns.map((c) => c.label);
    const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [header, ...filtered.map((r) => visibleColumns.map((c) => cellText(c, r[c.key])))].map((l) => l.map(escape).join(","));
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${config.title.toLowerCase().replace(/\W+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} ${filtered.length === 1 ? entity : plural(entity)}`, {
      description: "Export includes the current filters and visible columns.",
    });
  };

  const runAction = (row: Row, action: Action) => {
    if (action === "edit") setEditing(row);
    else if (action === "view") setViewing(row);
    else if (action === "review") setReviewing(row);
    else if (action === "duplicate") {
      const nameKey = config.columns[0].key;
      const copy: Row = { ...row, id: `copy-${row.id}-${rows.length + 1}`, [nameKey]: `${row[nameKey]} (copy)` };
      setRows((prev) => [copy, ...prev]);
      toast.success(`${cap(entity)} duplicated`);
    } else setConfirm({ row, action });
  };

  const applyConfirm = () => {
    if (!confirm) return;
    const { row, action } = confirm;
    const stateKey = ["status", "state"].find((k) => k in row);
    if (action === "archive" && stateKey) {
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, [stateKey]: "Archived" } : r)));
    } else {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
    toast.success(`${cap(entity)} ${action === "archive" ? "archived" : "deleted"}`);
    setConfirm(null);
  };

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(r.id));
  const nameOf = (row: Row) => String(row[config.columns[0].key] ?? entity);

  return (
    <>
      <PageHeader
        title={config.title}
        description={config.description}
        status={status}
        actions={
          <>
            {config.exportable ? (
              <Button variant="soft-success" onClick={exportCsv} disabled={filtered.length === 0}>
                <Download className="size-4" aria-hidden="true" />
                Export
              </Button>
            ) : null}
            {config.configurableColumns ? (
              <Popover
                label="Choose columns"
                trigger={({ open, toggle, ref }) => (
                  <Button ref={ref} onClick={toggle} aria-expanded={open}>
                    <Columns3 className="size-4" aria-hidden="true" />
                    Columns
                  </Button>
                )}
              >
                {() => (
                  <fieldset className="p-2">
                    <legend className="px-1 pb-1 text-xs font-semibold text-muted uppercase">Visible columns</legend>
                    {config.columns.map((c, i) => (
                      <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-md px-1 py-1.5 text-sm hover:bg-accent-soft">
                        <input
                          type="checkbox"
                          className="size-4 accent-accent"
                          checked={!hidden.has(c.key)}
                          disabled={i === 0}
                          onChange={() =>
                            setHidden((prev) => {
                              const next = new Set(prev);
                              if (next.has(c.key)) next.delete(c.key);
                              else next.add(c.key);
                              return next;
                            })
                          }
                        />
                        {c.label}
                      </label>
                    ))}
                  </fieldset>
                )}
              </Popover>
            ) : null}
            {config.primaryAction && config.form ? (
              <Button variant="gold" onClick={() => setEditing("new")}>
                <Plus className="size-4" aria-hidden="true" />
                {config.primaryAction}
              </Button>
            ) : null}
          </>
        }
      />

      <DemoNotice />

      {config.summary ? (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {config.summary.map((s, i) => (
            <StatCard key={s.label} label={s.label} value={s.value} hint={s.hint} tone={s.tone} color={statColor(s.tone, cardCycle[i % cardCycle.length])} />
          ))}
        </div>
      ) : null}

      <Card>
        <div className="flex flex-col gap-3 border-b border-border p-4">
          {config.tabs && config.tabs.items.length > 1 ? (
            <Tabs
              label={`${config.title} status`}
              value={tab}
              onChange={(v) => {
                setTab(v);
                resetPage();
              }}
              items={config.tabs.items.map((t) => ({
                value: t.value ?? ALL,
                label: t.label,
                count: t.value && tabKey ? baseFiltered.filter((r) => matches(r[tabKey], t.value!)).length : baseFiltered.length,
              }))}
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            {config.searchKeys ? (
              <div className="relative min-w-56 flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPage();
                  }}
                  placeholder={config.searchPlaceholder ?? `Search ${plural(entity)}`}
                  aria-label={config.searchPlaceholder ?? `Search ${plural(entity)}`}
                  className={cn(inputClass, "pl-9")}
                />
              </div>
            ) : null}
            {config.filters?.map((f) => (
              <select
                key={f.key}
                aria-label={`Filter by ${f.label.toLowerCase()}`}
                value={filters[f.key] ?? ""}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, [f.key]: e.target.value }));
                  resetPage();
                }}
                className={cn(inputClass, "w-auto max-w-52")}
              >
                <option value="">All {plural(f.label.toLowerCase())}</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ))}
            {config.dateFilterKey ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  aria-label="From date"
                  value={dateFrom}
                  max={dateTo || undefined}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    resetPage();
                  }}
                  className={cn(inputClass, "w-auto")}
                />
                <span className="text-sm text-muted" aria-hidden="true">
                  to
                </span>
                <input
                  type="date"
                  aria-label="To date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    resetPage();
                  }}
                  className={cn(inputClass, "w-auto")}
                />
              </div>
            ) : null}
            {hasActiveFilters ? (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="size-3.5" aria-hidden="true" />
                Clear filters
              </Button>
            ) : null}
            {selected.size > 0 ? (
              <div className="ml-auto flex items-center gap-2 rounded-lg bg-accent-soft px-3 py-1 text-sm" role="status">
                <span className="font-medium">{selected.size} selected</span>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                  Clear
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        {filtered.length === 0 ? (
          rows.length === 0 ? (
            <EmptyState
              icon={<Inbox className="size-5" />}
              title={`No ${plural(entity)} yet`}
              description={`When you add ${plural(entity)} they will appear here.`}
              action={
                config.primaryAction && config.form ? (
                  <Button variant="gold" onClick={() => setEditing("new")}>
                    <Plus className="size-4" aria-hidden="true" />
                    {config.primaryAction}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={<SearchX className="size-5" />}
              title={`No ${plural(entity)} match`}
              description="Try a different search term, tab or filter."
              action={hasActiveFilters ? <Button onClick={clearFilters}>Clear filters</Button> : undefined}
            />
          )
        ) : (
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">
                {config.title}, {filtered.length} results, page {currentPage} of {pageCount}
              </caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left text-xs font-semibold tracking-wide text-muted uppercase">
                  {config.selectable ? (
                    <th scope="col" className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="size-4 accent-accent"
                        aria-label="Select all rows on this page"
                        checked={allOnPageSelected}
                        onChange={() =>
                          setSelected((prev) => {
                            const next = new Set(prev);
                            pageRows.forEach((r) => (allOnPageSelected ? next.delete(r.id) : next.add(r.id)));
                            return next;
                          })
                        }
                      />
                    </th>
                  ) : null}
                  {config.showIndex ? (
                    <th scope="col" className="w-12 px-4 py-3">
                      #
                    </th>
                  ) : null}
                  {visibleColumns.map((c) => (
                    <SortableHeader key={c.key} column={c} sort={sort} onSort={setSort} />
                  ))}
                  {config.rowActions?.length ? (
                    <th scope="col" className="w-16 px-4 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.id} className={cn("border-b border-border last:border-0 hover:bg-accent-soft/40", selected.has(r.id) && "bg-accent-soft/60")}>
                    {config.selectable ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="size-4 accent-accent"
                          aria-label={`Select ${nameOf(r)}`}
                          checked={selected.has(r.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(r.id)) next.delete(r.id);
                              else next.add(r.id);
                              return next;
                            })
                          }
                        />
                      </td>
                    ) : null}
                    {config.showIndex ? <td className="px-4 py-3 text-muted tabular-nums">{(currentPage - 1) * PAGE_SIZE + i + 1}</td> : null}
                    {visibleColumns.map((c) => (
                      <td key={c.key} className="px-4 py-3 align-middle">
                        <CellView column={c} row={r} />
                      </td>
                    ))}
                    {config.rowActions?.length ? (
                      <td className="px-4 py-2 text-right">
                        {config.rowActions.length === 1 ? (
                          (() => {
                            const a = config.rowActions[0];
                            const Icon = actionIcon[a];
                            return (
                              <Button size="sm" variant={a === "review" ? "soft-success" : "soft-info"} onClick={() => runAction(r, a)}>
                                <Icon className="size-3.5" aria-hidden="true" />
                                {actionLabel[a]}
                                <span className="sr-only"> {nameOf(r)}</span>
                              </Button>
                            );
                          })()
                        ) : (
                          <div className="flex items-center justify-end gap-0.5">
                            {config.rowActions
                              .filter((a) => inlineActions.includes(a))
                              .map((a) => {
                                const Icon = actionIcon[a];
                                return (
                                  <IconButton key={a} label={`${actionLabel[a]} ${nameOf(r)}`} onClick={() => runAction(r, a)} className={actionColor[a]}>
                                    <Icon className="size-4" aria-hidden="true" />
                                  </IconButton>
                                );
                              })}
                            {config.rowActions.some((a) => !inlineActions.includes(a)) ? (
                              <Popover
                                label={`More actions for ${nameOf(r)}`}
                                panelClassName="min-w-40"
                                trigger={({ open, toggle, ref }) => (
                                  <IconButton ref={ref} label={`More actions for ${nameOf(r)}`} aria-expanded={open} onClick={toggle}>
                                    <Ellipsis className="size-4" aria-hidden="true" />
                                  </IconButton>
                                )}
                              >
                                {(close) =>
                                  config.rowActions!
                                    .filter((a) => !inlineActions.includes(a))
                                    .map((a) => {
                                      const Icon = actionIcon[a];
                                      return (
                                        <button
                                          key={a}
                                          type="button"
                                          onClick={() => {
                                            close();
                                            runAction(r, a);
                                          }}
                                          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-accent-soft"
                                        >
                                          <Icon className={cn("size-4", actionColor[a].split(" ")[0])} aria-hidden="true" />
                                          {actionLabel[a]}
                                        </button>
                                      );
                                    })
                                }
                              </Popover>
                            ) : null}
                          </div>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm text-muted">
            <p>
              Showing <span className="font-medium text-foreground">{(currentPage - 1) * PAGE_SIZE + 1}</span>–
              <span className="font-medium text-foreground">{Math.min(currentPage * PAGE_SIZE, filtered.length)}</span> of{" "}
              <span className="font-medium text-foreground">{filtered.length}</span>
            </p>
            <nav aria-label="Pagination" className="flex items-center gap-1">
              <IconButton label="Previous page" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                <ChevronLeft className="size-4" aria-hidden="true" />
              </IconButton>
              <span className="px-2 tabular-nums">
                Page {currentPage} of {pageCount}
              </span>
              <IconButton label="Next page" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>
                <ChevronRight className="size-4" aria-hidden="true" />
              </IconButton>
            </nav>
          </div>
        ) : null}
      </Card>

      {config.form ? (
        <FormDrawer
          open={formOpen}
          title={formRow ? `Edit ${entity}` : config.primaryAction ?? `New ${entity}`}
          description={formRow ? nameOf(formRow) : `Fields marked * are required.`}
          fields={config.form.fields}
          initial={formRow}
          submitLabel={formRow ? "Save changes" : `Create ${entity}`}
          onClose={closeForm}
          onSubmit={(values) => {
            if (formRow) {
              setRows((prev) => prev.map((r) => (r.id === formRow.id ? { ...r, ...values } : r)));
              toast.success(`${cap(entity)} updated`);
            } else {
              const row = { ...config.form!.defaults, ...values, id: `new-${rows.length + 1}` } as Row;
              setRows((prev) => [row, ...prev]);
              const hasAllTab = config.tabs?.items.some((t) => !t.value) ?? true;
              setTab(hasAllTab || !tabKey ? ALL : String(row[tabKey] ?? ALL));
              setPage(1);
              toast.success(`${cap(entity)} created`, { description: "Demo only: it isn't saved to the database yet." });
            }
            closeForm();
          }}
        />
      ) : null}

      <Modal
        open={viewing !== null}
        onClose={() => setViewing(null)}
        title={viewing ? nameOf(viewing) : ""}
        description={`${cap(entity)} details`}
        variant="drawer"
      >
        {viewing ? (
          <dl className="divide-y divide-border">
            {config.columns.map((c) => (
              <div key={c.key} className="grid grid-cols-5 gap-3 py-3 text-sm">
                <dt className="col-span-2 text-muted">{c.label}</dt>
                <dd className="col-span-3">
                  <CellView column={c} row={viewing} />
                </dd>
              </div>
            ))}
          </dl>
        ) : null}
      </Modal>

      <Modal
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm ? `${cap(confirm.action)} ${entity}?` : ""}
        footer={
          <>
            <Button onClick={() => setConfirm(null)}>Cancel</Button>
            <Button variant={confirm?.action === "delete" ? "danger" : "warning"} onClick={applyConfirm}>
              {confirm ? cap(confirm.action) : ""}
            </Button>
          </>
        }
      >
        {confirm ? (
          <p className="text-sm">
            {confirm.action === "delete"
              ? `“${nameOf(confirm.row)}” will be permanently removed. This can't be undone.`
              : `“${nameOf(confirm.row)}” will move to Archived. You can restore it later.`}
          </p>
        ) : null}
      </Modal>

      <ReviewDialog
        row={reviewing}
        onClose={() => setReviewing(null)}
        onSave={(marks) => {
          if (!reviewing) return;
          const total = Number(reviewing.total) || 100;
          setRows((prev) =>
            prev.map((r) =>
              r.id === reviewing.id ? { ...r, marks, percentage: Math.round((marks / total) * 100), evaluation: "Evaluated" } : r,
            ),
          );
          toast.success("Submission evaluated", { description: `${reviewing.learner}: ${marks}/${total}` });
          setReviewing(null);
        }}
      />
    </>
  );
}

function SortableHeader({
  column,
  sort,
  onSort,
}: {
  column: Column;
  sort: { key: string; dir: "asc" | "desc" } | null;
  onSort: (s: { key: string; dir: "asc" | "desc" } | null) => void;
}) {
  const sortable = "sortable" in column && column.sortable;
  const active = sort?.key === column.key;
  const numeric = column.type === "number" || column.type === "currency" || column.type === "percent";
  if (!sortable) {
    return (
      <th scope="col" className={cn("px-4 py-3 whitespace-nowrap", numeric && "text-left")}>
        {column.label}
      </th>
    );
  }
  const Icon = active ? (sort.dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th scope="col" className="px-4 py-3 whitespace-nowrap" aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
        onClick={() => onSort(active && sort.dir === "desc" ? null : { key: column.key, dir: active ? "desc" : "asc" })}
      >
        {column.label}
        <Icon className="size-3.5" aria-hidden="true" />
      </button>
    </th>
  );
}

function ReviewDialog({ row, onClose, onSave }: { row: Row | null; onClose: () => void; onSave: (marks: number) => void }) {
  return (
    <Modal open={row !== null} onClose={onClose} title="Review submission" description={row ? `${row.learner} · ${row.assessment}` : undefined}>
      {row ? <ReviewForm key={row.id} row={row} onCancel={onClose} onSave={onSave} /> : null}
    </Modal>
  );
}

function ReviewForm({ row, onCancel, onSave }: { row: Row; onCancel: () => void; onSave: (marks: number) => void }) {
  const total = Number(row.total) || 100;
  const [marks, setMarks] = useState(row.marks === null ? "" : String(row.marks));
  const [error, setError] = useState("");
  return (
    <form
      noValidate
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const n = Number(marks);
        if (marks.trim() === "" || Number.isNaN(n) || n < 0 || n > total) {
          setError(`Enter marks between 0 and ${total}.`);
          return;
        }
        onSave(n);
      }}
    >
      <div className="rounded-lg border border-border bg-surface-muted/50 p-3 text-sm">
        <p className="font-medium">Submitted file</p>
        <p className="text-muted">answer-sheet.pdf · preview arrives with media storage</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="marks" className="text-sm font-medium">
          Marks obtained (out of {total})
        </label>
        <input
          id="marks"
          type="number"
          min={0}
          max={total}
          value={marks}
          autoFocus
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "marks-error" : undefined}
          onChange={(e) => {
            setMarks(e.target.value);
            setError("");
          }}
          className={inputClass}
        />
        {error ? (
          <p id="marks-error" role="alert" className="text-xs text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex justify-end gap-2">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="success">
          Save evaluation
        </Button>
      </div>
    </form>
  );
}
