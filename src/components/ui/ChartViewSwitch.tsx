"use client";

import { ChartArea, ChartColumn, ChartLine } from "lucide-react";
import { cn } from "@/lib/cn";
import { palette } from "@/lib/colors";
import type { ChartType } from "./BarChart";

const views = [
  { type: "bar", label: "Bar", Icon: ChartColumn, color: "blue" },
  { type: "line", label: "Line", Icon: ChartLine, color: "emerald" },
  { type: "area", label: "Area", Icon: ChartArea, color: "violet" },
] as const;

export function ChartViewSwitch({ value, onChange }: { value: ChartType; onChange: (value: ChartType) => void }) {
  return (
    <div role="group" aria-label="Chart type" className="chart-view-switch">
      {views.map(({ type, label, Icon, color }) => (
        <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)} className={cn("chart-view-button", value === type ? palette[color].solid : palette[color].tile)}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
