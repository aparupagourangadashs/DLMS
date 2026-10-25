import type { DecisionInfo } from "@/components/admin/pages/DecisionPage";
import { analytics } from "./analytics";
import { decisions } from "./decisions";
import { helpContent, type HelpTask } from "./help-content";
import { getListConfig } from "./list-configs";
import { adminNav, findPage, quickCreate, type NavPage, type NavSection } from "./navigation";
import type { ListConfig } from "./types";

export type HelpArticleData = {
  key: string;
  section: NavSection;
  page: NavPage;
  summary: string;
  whoUses?: string;
  screen: Array<{ heading: string; items: string[] }>;
  formFields: Array<{ label: string; required: boolean; note?: string }>;
  tasks: HelpTask[];
  tips: string[];
  decision?: DecisionInfo;
  related: Array<{ section: NavSection; page: NavPage }>;
};

const searchKeyLabels: Record<string, string> = {
  name: "name",
  email: "email",
  phone: "phone",
  regNo: "registration number",
  fileName: "file name",
  code: "code",
  course: "course",
  subject: "subject",
  topic: "topic",
  learner: "learner name",
};

const humanize = (key: string) => searchKeyLabels[key] ?? key.replace(/([A-Z])/g, " $1").toLowerCase();
const an = (word: string) => (/^[aeiou]/i.test(word) ? `an ${word}` : `a ${word}`);
const bold = (items: string[]) => items.map((i) => `**${i}**`);

function joinWords(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function listTasks(key: string, cfg: ListConfig): HelpTask[] {
  const tasks: HelpTask[] = [];
  const entity = cfg.entityName;
  const columnLabel = (k: string) => cfg.columns.find((c) => c.key === k)?.label ?? humanize(k);

  const find: string[] = [];
  if (cfg.tabs && cfg.tabs.items.length > 1) {
    find.push(`Use the tabs above the list (${joinWords(bold(cfg.tabs.items.map((t) => t.label)))}) to switch between groups. The number on each tab is how many rows match.`);
  }
  if (cfg.searchKeys?.length) find.push(`Type in the search box. It matches ${joinWords(cfg.searchKeys.map(humanize))}.`);
  if (cfg.filters?.length) {
    find.push(`Narrow the list with the ${joinWords(cfg.filters.map((f) => f.label.toLowerCase()))} filter${cfg.filters.length > 1 ? "s" : ""}.`);
  }
  if (cfg.dateFilterKey) find.push(`Set the **From** and **To** dates to limit the list by ${columnLabel(cfg.dateFilterKey).toLowerCase()}.`);
  const sortable = cfg.columns.filter((c) => "sortable" in c && c.sortable).map((c) => c.label);
  if (sortable.length) {
    find.push(`To sort, select a column heading that shows arrows (${joinWords(bold(sortable))}). Select it again to reverse the order, and a third time to remove sorting.`);
  }
  if (cfg.searchKeys?.length || cfg.filters?.length || cfg.dateFilterKey) find.push("Select **Clear filters** to reset the search, filters and dates.");
  if (find.length) tasks.push({ title: `Find ${an(entity)}`, steps: find });

  if (cfg.primaryAction && cfg.form) {
    const quick = quickCreate.find((q) => q.key === key);
    const required = cfg.form.fields.filter((f) => f.required).map((f) => f.label);
    tasks.push({
      title: `Add ${an(entity)}`,
      steps: [
        `Select **${cfg.primaryAction}** at the top right${quick ? `, or choose **New → ${quick.label}** in the top bar from any page` : ""}.`,
        required.length ? `Fill in the form. The required fields, marked *, are ${joinWords(bold(required))}.` : "Fill in the form.",
        `Select **Create ${entity}**. The new ${entity} appears at the top of the list.`,
        "If a field is missing or invalid, a message appears under it and the cursor moves to it.",
      ],
    });
  }

  const actions = cfg.rowActions ?? [];
  if (actions.length && !(actions.length === 1 && actions[0] === "review")) {
    const describe: Record<string, string | null> = {
      view: "**View details** opens a side panel with all the information for that row.",
      edit: cfg.form ? "**Edit** opens the form with the current values. Change what you need and select **Save changes**." : null,
      duplicate: "**Duplicate** adds a copy named “… (copy)” at the top of the list, ready to edit.",
      archive: `**Archive** marks the ${entity} as archived after you confirm. Archived records are kept for history.`,
      delete: `**Delete** permanently removes the ${entity} after you confirm. This can't be undone.`,
      review: "**Review** opens the evaluation form.",
    };
    tasks.push({
      title: `Work with an existing ${entity}`,
      steps: [
        actions.length === 1
          ? `Select **${actions[0] === "view" ? "View details" : actions[0]}** at the end of the row.`
          : "Select the **⋯** button at the end of a row to see what you can do.",
        ...actions.map((a) => describe[a]).filter((s): s is string => Boolean(s)),
      ],
    });
  }

  if (cfg.exportable) {
    tasks.push({
      title: "Export the list",
      steps: [
        "Choose the tab, search and filters for the rows you need.",
        ...(cfg.configurableColumns ? ["Use **Columns** to choose which columns to include."] : []),
        "Select **Export**. A CSV file downloads with every matching row (from all pages) and the visible columns. Open it in Excel or Google Sheets.",
      ],
    });
  } else if (cfg.configurableColumns) {
    tasks.push({
      title: "Show or hide columns",
      steps: ["Select **Columns** at the top right.", "Tick or untick columns. The first column is always shown."],
    });
  }

  if (cfg.selectable) {
    tasks.push({
      title: `Select ${plural(entity)}`,
      steps: [
        "Tick the checkbox at the start of a row, or the checkbox in the header to select every row on the current page.",
        "The number selected appears above the list. Select **Clear** to unselect them all.",
      ],
    });
  }
  return tasks;
}

function plural(s: string) {
  if (/[^aeiou]y$/i.test(s)) return `${s.slice(0, -1)}ies`;
  return /(s|x|ch|sh)$/i.test(s) ? `${s}es` : `${s}s`;
}

export function helpKeys() {
  return adminNav.flatMap((s) => s.pages.map((p) => ({ section: s.slug, page: p.slug })));
}

export function buildHelp(sectionSlug: string, pageSlug: string): HelpArticleData | null {
  const found = findPage(sectionSlug, pageSlug);
  if (!found) return null;
  const key = `${sectionSlug}/${pageSlug}`;
  const content = helpContent[key] ?? { summary: found.page.description };
  const screen: HelpArticleData["screen"] = [];
  let formFields: HelpArticleData["formFields"] = [];
  let tasks: HelpTask[] = [];

  const decision = found.page.status === "decision" ? decisions[key] : undefined;
  const list = decision ? null : getListConfig(key);
  const report = sectionSlug === "analytics" ? analytics[pageSlug] : undefined;

  if (list) {
    if (list.summary?.length) screen.push({ heading: "Summary cards", items: list.summary.map((s) => s.label) });
    if (list.tabs && list.tabs.items.length > 1) screen.push({ heading: "Tabs", items: list.tabs.items.map((t) => t.label) });
    if (list.filters?.length || list.dateFilterKey || list.searchKeys?.length) {
      screen.push({
        heading: "Search and filters",
        items: [
          ...(list.searchKeys?.length ? [`Search by ${joinWords(list.searchKeys.map(humanize))}`] : []),
          ...(list.filters ?? []).map((f) => `${f.label} filter`),
          ...(list.dateFilterKey ? ["From / To date range"] : []),
        ],
      });
    }
    screen.push({
      heading: "Columns",
      items: list.columns.map((c) => (c.hidden ? `${c.label} (hidden until you turn it on in Columns)` : c.label)),
    });
    formFields = (list.form?.fields ?? []).map((f) => ({ label: f.label, required: Boolean(f.required), note: f.help }));
    tasks = listTasks(key, list);
  }

  if (report) {
    screen.push({ heading: "Key figures", items: report.kpis.map((k) => k.label) });
    if (report.chart) screen.push({ heading: "Chart", items: [report.chart.title] });
    screen.push({ heading: "Reports", items: report.reports.map((r) => `${r.title}: ${r.description}`) });
  }

  const relatedKeys = content.related ?? found.section.pages.filter((p) => p.slug !== pageSlug).slice(0, 3).map((p) => `${sectionSlug}/${p.slug}`);
  const related = relatedKeys
    .map((k) => {
      const [s, p] = k.split("/");
      return findPage(s, p);
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return {
    key,
    section: found.section,
    page: found.page,
    summary: content.summary,
    whoUses: content.whoUses,
    screen,
    formFields,
    tasks: [...tasks, ...(content.tasks ?? [])],
    tips: content.tips ?? [],
    decision,
    related,
  };
}
