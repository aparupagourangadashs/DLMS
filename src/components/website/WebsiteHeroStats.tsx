"use client";

import type { HeroStat } from "@/lib/website/site-defaults";
import { BookOpenCheck, Globe2, GraduationCap, UsersRound } from "lucide-react";
import { useEffect, useRef } from "react";

const icons = [GraduationCap, BookOpenCheck, Globe2, UsersRound];

const format = new Intl.NumberFormat("en-US");

export function WebsiteHeroStats({ stats }: { stats: HeroStat[] }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const numbers = root.current?.querySelectorAll<HTMLElement>("[data-count]");
    if (!numbers?.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const duration = 1800;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      numbers.forEach((item) => { item.textContent = format.format(Math.round(Number(item.dataset.count) * eased)); });
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    numbers.forEach((item) => { item.textContent = "0"; });
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      numbers.forEach((item) => { item.textContent = format.format(Number(item.dataset.count)); });
    };
  }, []);

  return <div className="web-hero-stats" ref={root}>
    <p className="web-hero-stats-title"><span aria-hidden="true" />IBMV at a glance</p>
    <ul aria-label="IBMV figures as reported by IBMV">
      {stats.map(({ value, suffix, label, detail }, index) => {
        const Icon = icons[index % icons.length]; return <li key={label}>
          <Icon size={20} aria-hidden="true" />
          <strong aria-hidden="true"><span data-count={value}>{format.format(value)}</span>{suffix}</strong>
          <span className="web-visually-hidden">{format.format(value)}{suffix} </span>
          <span className="web-hero-stat-label">{label}</span>
          <small>{detail}</small>
        </li>;
      })}
    </ul>
  </div>;
}
