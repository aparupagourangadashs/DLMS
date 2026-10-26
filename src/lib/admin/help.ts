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
  const customManaged = ["marketing/promotional-templates", "marketing/promo-codes", "sales/cheque-management"].includes(key);
  const customSettings = sectionSlug === "settings" && pageSlug !== "my-profile";
  const list = decision || customManaged || customSettings ? null : getListConfig(key);
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
    screen.push({ heading: "Synthetic report controls", items: ["Last 7, 30, 90 or 365 demo days, anchored to 26 October 2026", "Branch, course, status and text search", "Sortable preview, column selection and pagination", "CSV download of all matching rows, labeled SYNTHETIC DEMO"] });
    screen.push({ heading: "Reports", items: report.reports.map((r) => `${r.title}: ${r.description}`) });
    if (report.restricted) screen.push({ heading: "Verification limit", items: ["The live Advanced Analytics route was access restricted. These local reports are proposals, not verified live functionality."] });
    tasks = [{ title: "Preview and export a synthetic report", steps: ["Choose a demo date range and optional branch, course, status or search filters.", "Open a report card to see its calculated synthetic rows. Change filters in the drawer if needed.", "Select a column heading to sort and use Choose preview / CSV columns to choose fields.", "Select Export to download every matching row, not only the visible page. No database or live provider is queried."] }];
  }

  if (customManaged) {
    screen.push({ heading: "Local demo storage", items: ["Changes are saved only in this browser, separately from production data. No delivery, checkout or banking integration is connected."] });
    if (key === "marketing/promotional-templates") {
      screen.push({ heading: "Template manager", items: ["Email, SMS, WhatsApp and Push tabs with search", "Add, edit, duplicate and delete local drafts", "Subject, reply-to and required unsubscribe footer for promotional email", "Safe text / Markdown import and sample-personalized preview; no arbitrary HTML"] });
      tasks = [{ title: "Edit a local message draft", steps: ["Choose a channel and select Add Template or Edit & preview.", "Enter the name and content. Email also requires a subject, reply-to and unsubscribe footer.", "Review sample personalization and select Save local draft. No message is sent."] }];
    } else if (key === "marketing/promo-codes") {
      screen.push({ heading: "Structured promo codes", items: ["Single-use and multiple-use tabs", "Start and expiry, website/app display, system-wide and per-user limits", "Percentage or fixed discount, minimum spend, optional percentage cap and product applicability", "Example order simulator; no redemption or checkout effects"] });
      tasks = [{ title: "Configure a demo discount", steps: ["Create or edit a code. Set its type, dates, limits and display options.", "Single use fixes both limits at one. The per-user limit cannot exceed the system-wide limit.", "Continue to Discount. Configure the amount and applicability, then try an example order.", "Save local code to update this browser only. Marketing reports use independent synthetic fixtures."] }];
    } else {
      screen.push({ heading: "Cheque register", items: ["Student, parent, bank, cheque date, amount, status and remark", "Date, bank and status filters plus text search", "Export filtered CSV", "Proposed demo status transitions with required remarks and local history"] });
      tasks = [{ title: "Explore a demo cheque status", steps: ["Filter the register by cheque date, bank, status or text.", "Select Update demo status. Choose an allowed next status and enter a reason.", "Save demo status. No bank deposit, ledger update or actual settlement occurs.", "Cleared is final in this proposed local workflow."] }];
    }
  }

  if (customSettings) {
    screen.push({ heading: "Local settings demo", items: ["Controls update this page's synthetic configuration only and reset on navigation.", "Where available, Save changes validates configuration; it does not connect providers or write to the production database.", "Payment, delivery, student-portal and catalog effects require backend integration."] });
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
    summary: report ? "Filter, preview and export deterministic synthetic reports. These are not live figures or verified production calculations." : customManaged ? found.page.description : content.summary,
    whoUses: content.whoUses,
    screen,
    formFields,
    tasks: [...tasks, ...(report || customManaged ? [] : content.tasks ?? [])],
    tips: content.tips ?? [],
    decision,
    related,
  };
}
