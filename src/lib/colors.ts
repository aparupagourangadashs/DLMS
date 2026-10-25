/**
 * Shared colour palette for section icons, stat cards and tiles.
 * Class strings are written out in full so Tailwind can detect them.
 */
export type ColorKey = "indigo" | "violet" | "blue" | "teal" | "rose" | "orange" | "emerald" | "amber" | "slate" | "sky";

export type ColorClasses = {
  /** Soft tinted tile with coloured icon. */
  tile: string;
  /** Solid tile with white icon (active state). */
  solid: string;
  /** Coloured text. */
  text: string;
  /** Thin accent strip. */
  bar: string;
};

export const palette: Record<ColorKey, ColorClasses> = {
  indigo: {
    tile: "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300",
    solid: "bg-indigo-600 text-white shadow-md shadow-indigo-600/30",
    text: "text-indigo-600 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  violet: {
    tile: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300",
    solid: "bg-violet-600 text-white shadow-md shadow-violet-600/30",
    text: "text-violet-600 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  blue: {
    tile: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
    solid: "bg-blue-600 text-white shadow-md shadow-blue-600/30",
    text: "text-blue-600 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  teal: {
    tile: "bg-teal-50 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300",
    solid: "bg-teal-600 text-white shadow-md shadow-teal-600/30",
    text: "text-teal-600 dark:text-teal-300",
    bar: "bg-teal-500",
  },
  rose: {
    tile: "bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300",
    solid: "bg-rose-600 text-white shadow-md shadow-rose-600/30",
    text: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  orange: {
    tile: "bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300",
    solid: "bg-orange-500 text-white shadow-md shadow-orange-500/30",
    text: "text-orange-600 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  emerald: {
    tile: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300",
    solid: "bg-emerald-600 text-white shadow-md shadow-emerald-600/30",
    text: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  amber: {
    tile: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300",
    solid: "bg-amber-500 text-white shadow-md shadow-amber-500/30",
    text: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  slate: {
    tile: "bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300",
    solid: "bg-slate-700 text-white shadow-md shadow-slate-700/30",
    text: "text-slate-600 dark:text-slate-300",
    bar: "bg-slate-500",
  },
  sky: {
    tile: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300",
    solid: "bg-sky-600 text-white shadow-md shadow-sky-600/30",
    text: "text-sky-600 dark:text-sky-300",
    bar: "bg-sky-500",
  },
};

export const sectionColor: Record<string, ColorKey> = {
  home: "indigo",
  products: "violet",
  learning: "blue",
  users: "teal",
  engage: "rose",
  marketing: "orange",
  sales: "emerald",
  analytics: "amber",
  settings: "slate",
  help: "sky",
};

export const colorFor = (section: string) => palette[sectionColor[section] ?? "indigo"];

/** Rotating colours for card grids without a semantic colour. */
export const cardCycle: ColorKey[] = ["indigo", "sky", "violet", "teal", "amber", "rose"];
