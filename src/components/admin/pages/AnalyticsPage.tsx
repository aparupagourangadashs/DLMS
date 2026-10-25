"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Download, FileText } from "lucide-react";
import type { ScreenStatus } from "@/lib/admin/navigation";
import type { AnalyticsPageData, Report } from "@/lib/admin/analytics";
import { formatINR, formatNumber } from "@/lib/format";
import { BarChart } from "@/components/ui/BarChart";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { inputClass } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
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
          <select aria-label="Date range" value={range} onChange={(e) => setRange(e.target.value)} className={`${inputClass} w-auto`}>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">This year</option>
          </select>
        }
      />
      <DemoNotice>Sample figures for design review. Real numbers will come from the database, using the date range you choose.</DemoNotice>

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <StatCard key={k.label} label={k.label} value={k.value} hint={k.hint} tone={k.tone} />
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
        {data.reports.map((r) => (
          <li key={r.title}>
            <button
              type="button"
              onClick={() => setOpen(r)}
              className="group flex h-full w-full flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left shadow-card transition-colors hover:border-accent/50 hover:bg-accent-soft/30"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent" aria-hidden="true">
                <FileText className="size-4" />
              </span>
              <span className="font-semibold">{r.title}</span>
              <span className="flex-1 text-sm text-muted">{r.description}</span>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
                Open report <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </span>
            </button>
          </li>
        ))}
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
            <Button onClick={() => toast.info("Export will be enabled once reports read from the database.")}>
              <Download className="size-4" aria-hidden="true" />
              Export
            </Button>
          ) : undefined
        }
      >
        {open?.preview ? (
          <div className="relative overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <caption className="sr-only">{open.title} preview</caption>
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left text-xs text-muted uppercase">
                  {open.preview.columns.map((c) => (
                    <th key={c} scope="col" className="px-3 py-2">
                      {c}
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
          </div>
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
