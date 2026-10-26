"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Download, FileText } from "lucide-react";
import type { ScreenStatus } from "@/lib/admin/navigation";
import type { AnalyticsPageData, Report } from "@/lib/admin/analytics";
import { formatINR, formatNumber } from "@/lib/format";
import { cn } from "@/lib/cn";
import { cardCycle, palette } from "@/lib/colors";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { StatCard, statColor } from "@/components/ui/StatCard";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import { DemoNotice, PageHeader } from "../PageHeader";

export function AnalyticsPage({ title, description, status, data }: { title: string; description: string; status: ScreenStatus; data: AnalyticsPageData }) {
  const [range, setRange] = useState("30");
  const [open, setOpen] = useState<Report | null>(null);

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        status={status}
        actions={
          <Select aria-label="Date range" value={range} onValueChange={setRange} className="w-44 max-w-full" options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }, { value: "365", label: "This year" }]} />
        }
      />
      <DemoNotice>Sample figures for design review. Real numbers will come from the database, using the date range you choose.</DemoNotice>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.kpis.map((k, i) => (
          <StatCard key={k.label} label={k.label} value={k.value} hint={k.hint} tone={k.tone} color={statColor(k.tone, cardCycle[i % cardCycle.length])} />
        ))}
      </div>

      {data.chart ? (
        <Card className="mb-6">
          <CardHeader title={data.chart.title} />
          <div className="p-5">
            <BarChart title={data.chart.title} labels={data.chart.labels} series={data.chart.series} format={data.chart.currency ? formatINR : formatNumber} />
          </div>
        </Card>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold">Reports</h2>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {data.reports.map((r, i) => {
          const c = palette[cardCycle[i % cardCycle.length]];
          return (
            <li key={r.title}>
              <button
                type="button"
                onClick={() => setOpen(r)}
                className="group relative flex h-full w-full flex-col gap-2 overflow-hidden rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <span className={cn("absolute inset-y-0 left-0 w-1", c.bar)} aria-hidden="true" />
                <span className={cn("flex size-9 items-center justify-center rounded-xl", c.tile)} aria-hidden="true">
                  <FileText className="size-4" />
                </span>
                <span className="font-semibold">{r.title}</span>
                <span className="flex-1 text-sm text-muted">{r.description}</span>
                <span className={cn("inline-flex items-center gap-1 text-sm font-medium", c.text)}>
                  Open report <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Modal
        open={open !== null}
        onClose={() => setOpen(null)}
        title={open?.title ?? ""}
        description={open?.description}
        variant="drawer"
        size="lg"
        footer={
          open?.preview ? (
            <Button variant="soft-success" onClick={() => toast.info("Export will be enabled once reports read from the database.")}>
              <Download className="size-4" aria-hidden="true" />
              Export
            </Button>
          ) : undefined
        }
      >
        {open?.preview ? (
          <TableScroll label={`${open.title} preview`} className="admin-table-card rounded-xl border border-border">
            <table className="admin-data-table">
              <caption className="sr-only">{open.title} preview</caption>
              <thead>
                <tr>
                  {open.preview.columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2">
                      <TableHeading>{c}</TableHeading>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {open.preview.rows.map((row, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        ) : (
          <p className="text-sm text-muted">
            The columns and filters for this report will be agreed with IBMV in discovery. The layout will match the other reports: filters at
            the top, a sortable table, and CSV export limited by role.
          </p>
        )}
      </Modal>
    </>
  );
}
