"use client";

import { useEffect, useRef, useState } from "react";
import { formatNumber } from "@/lib/format";

export type Series = { label: string; colorClass: string; swatchClass: string; values: number[] };

/** Accessible grouped bar chart rendered as SVG, with a screen-reader data table. */
export function BarChart({
  title,
  labels,
  series,
  format = formatNumber,
  height = 240,
}: {
  title: string;
  labels: string[];
  series: Series[];
  format?: (n: number) => string;
  height?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);

  // Render at the container's real pixel width so text and bars keep a constant size.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const pad = { top: 12, right: 8, bottom: 28, left: 52 };
  const max = Math.max(1, ...series.flatMap((s) => s.values));
  const niceMax = Math.ceil(max / 10 ** Math.floor(Math.log10(max))) * 10 ** Math.floor(Math.log10(max));
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const groupW = plotW / labels.length;
  const barW = Math.min(28, (groupW * 0.7) / series.length);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(niceMax * t));

  return (
    <figure className="relative">
      <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted" aria-hidden="true">
        {series.map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${s.swatchClass}`} />
            {s.label}
          </span>
        ))}
      </div>
      <div ref={boxRef}>
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="block max-w-full" role="img" aria-label={title}>
        {ticks.map((t) => {
          const y = pad.top + plotH - (t / niceMax) * plotH;
          return (
            <g key={t}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="stroke-border" strokeDasharray={t === 0 ? undefined : "3 4"} />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-muted text-[11px]">
                {format(t)}
              </text>
            </g>
          );
        })}
        {labels.map((label, i) => {
          const gx = pad.left + i * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={label}>
              {series.map((s, j) => {
                const v = s.values[i] ?? 0;
                const h = (v / niceMax) * plotH;
                return (
                  <rect key={s.label} x={gx + j * barW} y={pad.top + plotH - h} width={barW - 3} height={h} rx={3} className={s.colorClass}>
                    <title>{`${label} · ${s.label}: ${format(v)}`}</title>
                  </rect>
                );
              })}
              <text x={pad.left + i * groupW + groupW / 2} y={height - 8} textAnchor="middle" className="fill-muted text-[11px]">
                {label}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            {series.map((s) => (
              <th key={s.label} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={l}>
              <th scope="row">{l}</th>
              {series.map((s) => (
                <td key={s.label}>{format(s.values[i] ?? 0)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
