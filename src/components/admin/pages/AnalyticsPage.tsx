"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, ArrowUpDown, BookOpen, Building2, CalendarDays, ChartColumn, ChevronLeft, ChevronRight, ClipboardList, Columns3, Download, FileSearch, FileText, Filter, GraduationCap, Hash, Layers3, MessageSquare, RotateCcw, Search, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import type { ScreenStatus } from "@/lib/admin/navigation";
import { getReportRows, REPORT_AS_OF, reportBranches, reportCourses, type AnalyticsPageData, type Report } from "@/lib/admin/analytics";
import { downloadDemoCsv } from "@/lib/admin/demo-csv";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import { Badge, toneFor } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ChartViewSwitch } from "@/components/ui/ChartViewSwitch";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, inputClass } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { BarChart, type ChartType } from "@/components/ui/BarChart";
import { StatCard } from "@/components/ui/StatCard";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import { DemoNotice, PageHeader } from "../PageHeader";

const reportIcons = [ChartColumn, GraduationCap, MessageSquare, Users, Wallet, ClipboardList];

export function AnalyticsPage({ title, description, status, data }: { title: string; description: string; status: ScreenStatus; data: AnalyticsPageData }) {
  const [range, setRange] = useState("30");
  const [open, setOpen] = useState<Report | null>(null);
  const [branch, setBranch] = useState("");
  const [course, setCourse] = useState("");
  const [query, setQuery] = useState("");
  const [recordStatus, setRecordStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ key: "date", ascending: false });
  const [hidden, setHidden] = useState<string[]>([]);
  const [chartType, setChartType] = useState<ChartType>("bar");
  const selected = open ?? data.reports[0];
  const rows = useMemo(() => getReportRows(selected, Number(range)).filter((row) =>
    (!branch || row.branch === branch) && (!course || row.course === course) &&
    (!recordStatus || row.status === recordStatus) &&
    (!query || Object.values(row).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))),
  ).sort((a, b) => {
    const left = a[sort.key], right = b[sort.key];
    const order = typeof left === "number" && typeof right === "number" ? left - right : String(left).localeCompare(String(right));
    return sort.ascending ? order : -order;
  }), [selected, range, branch, course, recordStatus, query, sort]);
  const columns = selected.columns.filter((column) => !hidden.includes(column.key));
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  const currentPage = Math.min(page, pages);
  const firstMetric = selected.columns[5];
  const metricValues = rows.map((row) => Number(row[firstMetric.key]));
  const metricTotal = metricValues.reduce((sum, value) => sum + value, 0);
  const meanMetric = firstMetric.unit === "%" || firstMetric.label === "Rating / 5";
  const metricSummary = meanMetric && rows.length ? metricTotal / rows.length : metricTotal;
  const chartBuckets = Array.from({ length: Math.min(7, Number(range)) }, (_, i) => {
    const start = Math.floor(i * Number(range) / 7);
    const finish = Math.floor((i + 1) * Number(range) / 7);
    const anchor = new Date(`${REPORT_AS_OF}T12:00:00Z`);
    anchor.setUTCDate(anchor.getUTCDate() - Number(range) + 1 + start);
    const date = anchor.toISOString().slice(0, 10);
    const last = new Date(anchor);
    last.setUTCDate(last.getUTCDate() + finish - start - 1);
    const lastDate = last.toISOString().slice(0, 10);
    const values = rows.filter((row) => String(row.date) >= date && String(row.date) <= lastDate).map((row) => Number(row[firstMetric.key]));
    const total = values.reduce((sum, value) => sum + value, 0);
    return { label: date.slice(5), value: meanMetric && values.length ? total / values.length : total };
  });
  const chartScale = Math.max(...chartBuckets.map((bucket) => bucket.value)) < 4 ? 1000 : 1;
  const end = new Date(`${REPORT_AS_OF}T12:00:00Z`);
  end.setUTCDate(end.getUTCDate() - Number(range) + 1);
  const startDate = end.toISOString().slice(0, 10);

  function openReport(report: Report) {
    setOpen(report); setPage(1); setHidden([]); setSort({ key: "date", ascending: false });
  }
  function exportCsv() {
    downloadDemoCsv(`demo-${selected.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}-${startDate}-${REPORT_AS_OF}.csv`,
      ["Dataset", "Range start", "Range end", ...columns.map((column) => `${column.label}${column.unit ? ` (${column.unit})` : ""}`)],
      rows.map((row) => ["SYNTHETIC DEMO", startDate, REPORT_AS_OF, ...columns.map((column) => row[column.key])]));
  }
  const activeFilters = [branch, course, recordStatus, query].filter(Boolean).length;
  const clearFilters = () => { setBranch(""); setCourse(""); setRecordStatus(""); setQuery(""); setPage(1); };
  const filters = (prefix: string) => (
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <Field id={`${prefix}-branch`} label="Branch"><Select id={`${prefix}-branch`} value={branch} onValueChange={(value) => { setBranch(value); setPage(1); }} options={[{ value: "", label: "All branches" }, ...reportBranches.map((value) => ({ value, label: value }))]} /></Field>
      <Field id={`${prefix}-course`} label="Course"><Select id={`${prefix}-course`} value={course} onValueChange={(value) => { setCourse(value); setPage(1); }} options={[{ value: "", label: "All courses" }, ...reportCourses.map((value) => ({ value, label: value }))]} /></Field>
      <Field id={`${prefix}-status`} label="Status"><Select id={`${prefix}-status`} value={recordStatus} onValueChange={(value) => { setRecordStatus(value); setPage(1); }} options={["", "Completed", "Pending", "Active", "Failed", "Unsubscribed", "Settled", "Issued"].map((value) => ({ value, label: value || "All statuses" }))} /></Field>
      <Field id={`${prefix}-query`} label="Search preview"><div className="relative"><Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" aria-hidden="true" /><input id={`${prefix}-query`} type="search" className={cn(inputClass, "pl-9")} value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Any displayed value" /></div></Field>
    </div>
  );
  return (
    <>
      <PageHeader title={title} description={description} status={status} actions={
        <Select aria-label="Date range" value={range} onValueChange={(value) => { setRange(value); setPage(1); }} className="w-48" options={[{ value: "7", label: "Last 7 demo days" }, { value: "30", label: "Last 30 demo days" }, { value: "90", label: "Last 90 demo days" }, { value: "365", label: "Last 365 demo days" }]} />
      } />
      <DemoNotice>All reports use deterministic synthetic fixtures, anchored to {REPORT_AS_OF}, not today or a connected database. Range, branch, course, status and search recalculate the preview and CSV. Daily cohorts are illustrative, not verified production metrics.</DemoNotice>
      {data.restricted && <p className="mb-4 flex items-start gap-2 rounded-xl border border-warning/25 bg-warning-soft p-4 text-sm text-warning"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Live Advanced Analytics was access restricted. These local previews are proposals, not reproduced or verified live functionality.</p>}
      <Card className="mb-6 overflow-hidden">
        <CardHeader className="bg-linear-to-r from-sky-50 to-violet-50 dark:from-sky-500/10 dark:to-violet-500/10" title={<span className="flex items-center gap-2.5"><span className={cn("flex size-9 items-center justify-center rounded-xl", palette.sky.solid)}><Filter className="size-4" aria-hidden="true" /></span>Report filters</span>} description="Choose your branch, course and reporting period." actions={<Button variant="soft-info" disabled={!activeFilters} onClick={clearFilters}><RotateCcw className="size-4" aria-hidden="true" />Clear filters{activeFilters ? <span className="rounded-full bg-info/10 px-1.5 text-xs">{activeFilters}</span> : null}</Button>} />
        <div className="space-y-4 p-5">
          {filters("report")}
          <p role="status" className="flex flex-wrap items-center gap-2 text-xs text-muted"><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5", palette.violet.tile)}><CalendarDays className="size-3.5" aria-hidden="true" />{startDate} through {REPORT_AS_OF}</span><span>{rows.length.toLocaleString("en-IN")} matching synthetic rows in {selected.title}</span></p>
          <p className="text-xs leading-relaxed text-muted">Counts and amounts are summed across filtered daily rows; percentage/rating summaries use unweighted row means, not organization-wide rates.</p>
        </div>
      </Card>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Matching daily records" value={rows.length.toLocaleString("en-IN")} hint="Synthetic rows, not unique users" color="blue" icon={<Layers3 />} />
        <StatCard label="Branch coverage" value={String(new Set(rows.map((row) => row.branch)).size)} color="emerald" icon={<Building2 />} />
        <StatCard label="Course coverage" value={String(new Set(rows.map((row) => row.course)).size)} color="violet" icon={<BookOpen />} />
        <StatCard label={`${meanMetric ? "Mean" : "Total"} ${firstMetric.label}`} value={`${metricSummary.toLocaleString("en-IN", { maximumFractionDigits: 2 })}${firstMetric.unit ? ` ${firstMetric.unit}` : ""}`} hint="Filtered synthetic rows only" color="orange" icon={<ChartColumn />} />
      </div>
      <Card className="mb-6 min-w-0 overflow-hidden">
        <CardHeader className="bg-linear-to-r from-violet-50 to-sky-50 dark:from-violet-500/10 dark:to-sky-500/10" title={<span className="flex items-center gap-2"><ChartColumn className={cn("size-5 shrink-0", palette.violet.text)} aria-hidden="true" />{selected.title}</span>} description={`${firstMetric.label} by period · filtered synthetic data`} actions={<ChartViewSwitch value={chartType} onChange={setChartType} />} />
        <div className="p-5">{rows.length ? <BarChart chartType={chartType} title={`Synthetic ${firstMetric.label}; periods start on the labeled dates`} labels={chartBuckets.map((bucket) => bucket.label)} format={(value) => (value / chartScale).toLocaleString("en-IN", { maximumFractionDigits: 2 })} series={[{ label: `${meanMetric ? "Mean" : "Total"} ${firstMetric.label}${firstMetric.unit ? ` (${firstMetric.unit})` : ""}`, values: chartBuckets.map((bucket) => bucket.value * chartScale), colorClass: "fill-accent", swatchClass: "bg-accent" }]} /> : <EmptyState icon={<FileSearch />} title="No matching data" description="Adjust the filters to explore another synthetic cohort." action={<Button variant="soft-info" onClick={clearFilters}>Clear filters</Button>} />}</div>
      </Card>
      <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><span className={cn("flex size-9 items-center justify-center rounded-xl", palette.amber.tile)}><ClipboardList className="size-5" aria-hidden="true" /></span>Reports<Badge tone="accent">{data.reports.length}</Badge></h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.reports.map((report, index) => {
          const color = palette[cardCycle[index % cardCycle.length]];
          const Icon = reportIcons[index % reportIcons.length];
          return <li key={report.title} className="min-w-0"><button type="button" aria-haspopup="dialog" onClick={() => openReport(report)} className="group relative flex h-full w-full flex-col items-start gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left shadow-card transition-colors hover:border-accent/40 hover:bg-accent-soft/30">
            <span className={cn("absolute inset-x-0 top-0 h-1", color.bar)} aria-hidden="true" />
            <span className="flex w-full items-center justify-between gap-2"><span className={cn("flex size-11 items-center justify-center rounded-2xl", color.solid)}><Icon className="size-5" aria-hidden="true" /></span><Badge tone="success">CSV ready</Badge></span>
            <span className="break-words font-semibold">{report.title}</span><span className="text-sm leading-relaxed text-muted">{report.description}</span>
            <span className="mt-auto flex items-center gap-2 pt-2 text-sm font-semibold text-accent">Preview &amp; export CSV<ArrowRight className="size-4" aria-hidden="true" /></span>
          </button></li>;
        })}
      </ul>
      <Modal open={open !== null} onClose={() => setOpen(null)} title={selected.title} description="Synthetic demo only. Export includes all matching rows, not just this page." variant="drawer" size="lg" footer={<Button variant="success" disabled={!rows.length || !columns.length} onClick={exportCsv}><Download className="size-4" aria-hidden="true" />Export {rows.length} rows</Button>}>
        <div className={cn("mb-4 flex items-start gap-3 rounded-xl border border-border p-4", palette.violet.tile)}><Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><p className="text-sm">{startDate} – {REPORT_AS_OF}. Change the date range on the main page. Exports are marked SYNTHETIC DEMO.</p></div>
        <div className="mb-4 rounded-xl border border-border bg-surface-muted/40 p-4">{filters("preview")}<Button size="sm" variant="soft-info" className="mt-3" disabled={!activeFilters} onClick={clearFilters}><RotateCcw className="size-3.5" aria-hidden="true" />Clear filters</Button></div>
        <details className="mb-4 rounded-xl border border-violet-200 bg-violet-50/40 p-3 dark:border-violet-500/25 dark:bg-violet-500/5"><summary className="cursor-pointer text-sm font-semibold text-violet-700 dark:text-violet-300"><Columns3 className="mr-2 inline-block size-4 align-text-bottom" aria-hidden="true" />Choose preview / CSV columns</summary><div className="mt-3 grid gap-2 sm:grid-cols-2">{selected.columns.map((column) => <label key={column.key} className="flex min-h-10 items-center gap-2 rounded-lg bg-surface p-2 text-sm"><input type="checkbox" className="size-4 accent-accent" checked={!hidden.includes(column.key)} disabled={!hidden.includes(column.key) && columns.length === 1} onChange={(event) => setHidden(event.target.checked ? hidden.filter((key) => key !== column.key) : [...hidden, column.key])} />{column.label}</label>)}</div></details>
        <p role="status" className="mb-3 flex items-center gap-2 text-sm font-medium"><span className={cn("flex size-8 items-center justify-center rounded-lg", palette.sky.tile)}><Layers3 className="size-4" aria-hidden="true" /></span>{rows.length} matching synthetic rows</p>
        <TableScroll label={`${selected.title} preview`} className="admin-table-card rounded-xl border border-border">
          <table className="admin-data-table"><caption className="sr-only">Synthetic {selected.title}</caption><thead><tr>{columns.map((column) => {
            const Icon = column.key === "date" ? CalendarDays : column.key === "branch" ? Building2 : column.key === "course" ? BookOpen : column.key === "status" ? ShieldCheck : column.key === "subject" ? FileText : Hash;
            const SortIcon = sort.key === column.key ? sort.ascending ? ArrowUp : ArrowDown : ArrowUpDown;
            return <th key={column.key} scope="col" aria-sort={sort.key === column.key ? sort.ascending ? "ascending" : "descending" : "none"}><button type="button" className="inline-flex min-h-8 w-full items-center justify-between gap-2 text-left" onClick={() => { setSort({ key: column.key, ascending: sort.key === column.key ? !sort.ascending : true }); setPage(1); }}><TableHeading icon={Icon}>{column.label}{column.unit ? ` (${column.unit})` : ""}</TableHeading><SortIcon className="size-3.5 shrink-0" aria-hidden="true" /></button></th>;
          })}</tr></thead>
            <tbody>{rows.slice((currentPage - 1) * 20, currentPage * 20).map((row, i) => <tr key={`${row.date}-${row.branch}-${i}`}>{columns.map((column) => <td key={column.key}>{column.key === "status" ? <Badge tone={toneFor(String(row[column.key]), { Settled: "success", Issued: "success", Unsubscribed: "warning" })}>{row[column.key]}</Badge> : column.key === "branch" ? <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium", palette.teal.tile)}><Building2 className="size-3.5" aria-hidden="true" />{row[column.key]}</span> : <span className={cn(column.key.startsWith("metric") && "font-semibold tabular-nums text-accent")}>{row[column.key]}</span>}</td>)}</tr>)}{!rows.length && <tr><td colSpan={columns.length} className="p-5 text-center">No synthetic rows match these filters. Try another status or search.</td></tr>}</tbody>
          </table>
        </TableScroll>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2"><Button variant="soft-info" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}><ChevronLeft className="size-4" aria-hidden="true" />Previous</Button><span className="rounded-lg bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">Page {currentPage} of {pages}</span><Button variant="soft-violet" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)}>Next<ChevronRight className="size-4" aria-hidden="true" /></Button></div>
      </Modal>
    </>
  );
}
