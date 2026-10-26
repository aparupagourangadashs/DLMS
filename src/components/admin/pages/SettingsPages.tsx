"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Activity, ArrowDown, ArrowUp, Banknote, BookOpen, CalendarDays, CheckCircle2, CircleDollarSign, CreditCard, Eye, EyeOff, FileText, Globe2, GripVertical, Layers3, Link2, Plus, Save, Settings2, ShieldCheck, Tags, Trash2, Users, Wallet, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, inputClass, Select } from "@/components/ui/Field";
import { DatePicker } from "@/components/ui/DatePicker";
import { StatCard } from "@/components/ui/StatCard";
import { TableHeading, TableScroll } from "@/components/ui/Table";
import { cardCycle, palette, type ColorKey } from "@/lib/colors";
import { DemoNotice, PageHeader } from "../PageHeader";

const labelClass = "mb-1 block text-sm font-medium";
const currencies = ["INR", "USD", "EUR", "GBP", "AUD", "CAD", "SGD", "AED"];

type SummaryItem = { label: string; value: string; hint: string; icon: LucideIcon; color: ColorKey };

function SettingsSummary({ items }: { items: SummaryItem[] }) {
  return <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Settings summary">
    {items.map(({ icon: Icon, ...item }) => <StatCard key={item.label} {...item} icon={<Icon />} />)}
  </section>;
}

function IconTileHeading({ icon: Icon, children, tone = "violet" }: { icon: LucideIcon; children: React.ReactNode; tone?: "violet" | "blue" | "emerald" | "gold" }) {
  const toneClasses = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    gold: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  };
  return <h2 className="mb-4 flex items-center gap-3 text-base font-semibold"><span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}><Icon className="size-5" aria-hidden="true" /></span>{children}</h2>;
}

function CardIconHeader({ icon: Icon, title, description, tone = "violet" }: { icon: LucideIcon; title: React.ReactNode; description?: React.ReactNode; tone?: "violet" | "blue" | "emerald" | "gold" }) {
  const toneClasses = {
    violet: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    gold: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  };
  return <CardHeader title={<span className="inline-flex items-center gap-3"><span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${toneClasses[tone]}`}><Icon className="size-4" aria-hidden="true" /></span>{title}</span>} description={description} className="bg-linear-to-r from-accent-soft/50 via-surface to-surface" />;
}

function SaveButton({ onSave, disabled = false }: { onSave: () => void; disabled?: boolean }) {
  return (
    <Button variant="success" disabled={disabled} onClick={onSave}>
      <Save className="size-4" aria-hidden="true" /> Save changes
    </Button>
  );
}

function notifySaved(title: string) {
  toast.success("Demo settings updated", {
    description: `${title} changes are local to this page and are not connected to a backend.`,
  });
}

function Toggle({
  label,
  checked,
  onChange,
  description,
  color = "emerald",
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  description?: string;
  color?: ColorKey;
}) {
  const colorClasses = palette[color];
  return (
    <label className={`group relative flex min-h-14 cursor-pointer items-center justify-between gap-4 rounded-xl border px-4 py-3 transition-colors ${checked ? `${colorClasses.tile} border-current/20` : "border-border bg-surface hover:bg-surface-muted/50"}`}>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full p-1 shadow-inner ring-1 ring-border transition-colors group-focus-within:outline-2 group-focus-within:outline-offset-2 group-focus-within:outline-accent ${checked ? colorClasses.bar : "bg-surface-muted"}`}>
        <input type="checkbox" role="switch" checked={checked} onChange={(event) => onChange(event.target.checked)} aria-label={label} className="absolute inset-0 z-10 h-full w-full cursor-pointer rounded-full opacity-0" />
        <span className={`inline-flex size-5 items-center justify-center rounded-full bg-white text-slate-500 shadow transition-transform ${checked ? `translate-x-5 ${colorClasses.text}` : "translate-x-0"}`}>
          {checked ? <CheckCircle2 className="size-3.5" /> : null}
        </span>
      </span>
    </label>
  );
}

export function InternationalSellingPage() {
  const [enabled, setEnabled] = useState(true);
  const [branches, setBranches] = useState({ "Head Office – Mumbai": true, "Pune Centre": true, Online: false });
  const [base, setBase] = useState("INR");
  const [fallback, setFallback] = useState("USD");
  const [pricing, setPricing] = useState<"fixed" | "automatic">("fixed");
  const [adjustment, setAdjustment] = useState("0");
  const [precision, setPrecision] = useState("2");
  const [error, setError] = useState("");

  const save = () => {
    const rate = Number(adjustment);
    const digits = Number(precision);
    if (!Number.isFinite(rate) || rate < -50 || rate > 100) {
      setError("Adjustment must be between -50% and 100%.");
      return;
    }
    if (base === fallback) {
      setError("Choose a fallback currency different from the base currency.");
      return;
    }
    if (!Number.isInteger(digits) || digits < 0 || digits > 4) {
      setError("Currency precision must be a whole number from 0 to 4.");
      return;
    }
    setError("");
    notifySaved("International selling");
  };

  return (
    <>
      <PageHeader title="International Selling" description="Configure branch availability and display currency options." status="ready" actions={<SaveButton onSave={save} />} />
      <DemoNotice>Payment gateway connections and live exchange rates are not configured in this local demo. These controls only preview settings.</DemoNotice>
      <SettingsSummary items={[
        { label: "International selling", value: enabled ? "Enabled" : "Paused", hint: "Demo storefront setting", icon: Globe2, color: "violet" },
        { label: "Branches enabled", value: String(Object.values(branches).filter(Boolean).length), hint: `of ${Object.keys(branches).length} branches`, icon: Users, color: "teal" },
        { label: "Currency pair", value: `${base} → ${fallback}`, hint: "Base and fallback currency", icon: CircleDollarSign, color: "amber" },
        { label: "Gateway", value: "Not connected", hint: "No payment integration", icon: ShieldCheck, color: "rose" },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card className="p-5">
          <IconTileHeading icon={Settings2} tone="blue">Selling availability</IconTileHeading>
          <Toggle label="Enable international selling" checked={enabled} onChange={setEnabled} description="Allow eligible branches to show international checkout options." />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field id="selling-base-currency" label="Base currency"><Select id="selling-base-currency" value={base} onValueChange={setBase} options={currencies.map((currency) => ({ value: currency, label: currency }))} /></Field>
            <Field id="selling-fallback-currency" label="Fallback currency"><Select id="selling-fallback-currency" value={fallback} onValueChange={setFallback} options={currencies.map((currency) => ({ value: currency, label: currency }))} /></Field>
          </div>
          <div className="mt-5">
            <h3 className="mb-2 text-sm font-semibold">Branch enablement</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.keys(branches).map((branch) => (
                <Toggle key={branch} color={cardCycle[Object.keys(branches).indexOf(branch) % cardCycle.length]} label={branch} checked={branches[branch as keyof typeof branches]} onChange={(value) => setBranches((current) => ({ ...current, [branch]: value }))} description={branch === "Online" ? "Branch availability is shown for demo only." : undefined} />
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <IconTileHeading icon={Banknote} tone="gold">Payment gateway</IconTileHeading>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted/40 p-4">
            <div><p className="font-medium">International gateway</p><p className="mt-1 text-xs text-muted">Provider account is not connected.</p></div>
            <span className="rounded-full border border-amber-300/60 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">Not configured</span>
          </div>
          <p className="mt-3 text-xs text-muted">No connection or payment action is available in this demo.</p>
        </Card>
        <Card className="p-5 xl:col-span-2">
          <IconTileHeading icon={CircleDollarSign} tone="emerald">Currency display</IconTileHeading>
          <p className="mb-4 text-sm text-muted">Set how non-base prices are calculated and rounded.</p>
          <fieldset className="grid gap-3 md:grid-cols-2">
            <legend className="sr-only">Pricing method</legend>
            <label className={`cursor-pointer rounded-xl border p-4 ${pricing === "fixed" ? "border-accent bg-accent-soft" : "border-border"}`}>
              <input type="radio" name="pricing-method" value="fixed" checked={pricing === "fixed"} onChange={() => setPricing("fixed")} className="mr-2 accent-accent" />
              <span className="font-medium">Fixed prices</span><span className="mt-1 block pl-6 text-xs text-muted">Enter a separate price for each currency.</span>
            </label>
            <label className={`cursor-pointer rounded-xl border p-4 ${pricing === "automatic" ? "border-accent bg-accent-soft" : "border-border"}`}>
              <input type="radio" name="pricing-method" value="automatic" checked={pricing === "automatic"} onChange={() => setPricing("automatic")} className="mr-2 accent-accent" />
              <span className="font-medium">Automatic conversion</span><span className="mt-1 block pl-6 text-xs text-muted">Preview conversion using a future provider rate feed.</span>
            </label>
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label><span className={labelClass}>Price adjustment (%)</span><input className={inputClass} type="number" min="-50" max="100" step="0.1" value={adjustment} onChange={(e) => setAdjustment(e.target.value)} aria-describedby={error ? "selling-error" : undefined} /></label>
            <Field id="selling-precision" label="Decimal precision"><Select id="selling-precision" value={precision} onValueChange={setPrecision} options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n} decimal places` }))} /></Field>
          </div>
          {error ? <p id="selling-error" className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
        </Card>
      </div>
    </>
  );
}

type SidebarItem = { label: string; visible: boolean; custom?: boolean; url?: string };
const defaultSidebar: SidebarItem[] = [
  { label: "Overview", visible: true },
  { label: "My Courses", visible: true },
  { label: "Live Classes", visible: true },
  { label: "Assessments", visible: true },
  { label: "Certificates", visible: true },
  { label: "My Profile", visible: true },
];

export function LearnerExperiencePage() {
  const [items, setItems] = useState(defaultSidebar);
  const [newItem, setNewItem] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [message, setMessage] = useState("");
  const [visibility, setVisibility] = useState({ classRecords: true, overview: true, password: true, preferences: true, profile: true });
  const move = (index: number, offset: number) => setItems((current) => {
    const next = [...current];
    const target = index + offset;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const addItem = () => {
    const label = newItem.trim();
    if (!label) { setMessage("Enter a label for the custom sidebar item."); return; }
    if (items.some((item) => item.label.toLocaleLowerCase() === label.toLocaleLowerCase())) { setMessage("That sidebar item already exists."); return; }
    let url: URL;
    try { url = new URL(newUrl.trim()); } catch { setMessage("Enter a complete HTTPS destination URL."); return; }
    if (url.protocol !== "https:" || url.username || url.password) { setMessage("Use an HTTPS destination without embedded credentials."); return; }
    setItems((current) => [...current, { label, url: url.href, visible: true, custom: true }]);
    setNewItem("");
    setNewUrl("");
    setMessage(`${label} added to the preview.`);
  };

  return (
    <>
      <PageHeader title="Learner Experience" description="Arrange learner navigation and control which profile areas are visible." status="ready" actions={<SaveButton onSave={() => notifySaved("Learner experience")} />} />
      <DemoNotice>Ordering, visibility, and custom items are an in-page preview; they are not published to learner accounts.</DemoNotice>
      <SettingsSummary items={[
        { label: "Visible sidebar items", value: String(items.filter((item) => item.visible).length), hint: `${items.length} configured`, icon: Eye, color: "blue" },
        { label: "Custom destinations", value: String(items.filter((item) => item.custom).length), hint: "HTTPS links in the preview", icon: Link2, color: "violet" },
        { label: "Profile areas shown", value: String(Object.values(visibility).filter(Boolean).length), hint: `of ${Object.keys(visibility).length} visibility controls`, icon: Users, color: "teal" },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <Card>
          <CardIconHeader icon={Eye} title="Learner sidebar" description="Reorder items and preview visibility." tone="blue" />
          <div className="space-y-2 p-4">
            {items.map((item, index) => (
              <div key={item.label} className={`flex flex-wrap items-center gap-2 rounded-xl border p-3 ${palette[cardCycle[index % cardCycle.length]].tile}`}>
                <GripVertical className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0 flex-1 text-sm font-medium">{item.label}{item.custom ? <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent">Custom</span> : null}</span>
                <Button size="sm" variant="soft-info" aria-label={`Move ${item.label} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Button>
                <Button size="sm" variant="soft-violet" aria-label={`Move ${item.label} down`} disabled={index === items.length - 1} onClick={() => move(index, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Button>
                <Button size="sm" variant={item.visible ? "soft-success" : "secondary"} aria-label={`${item.visible ? "Hide" : "Show"} ${item.label}`} onClick={() => setItems((current) => current.map((candidate) => candidate.label === item.label ? { ...candidate, visible: !candidate.visible } : candidate))}>{item.visible ? <Eye className="size-4" aria-hidden="true" /> : <EyeOff className="size-4" aria-hidden="true" />}</Button>
                {item.custom ? <Button size="sm" variant="soft-danger" aria-label={`Remove ${item.label}`} onClick={() => setItems((current) => current.filter((candidate) => candidate.label !== item.label))}><Trash2 className="size-4" aria-hidden="true" /></Button> : null}
              </div>
            ))}
          </div>
          <form className="grid gap-3 border-t border-border p-4" noValidate onSubmit={(event) => { event.preventDefault(); addItem(); }}>
            <Field id="learner-custom-item" label="New custom item" required>
              <input id="learner-custom-item" className={inputClass} value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder="Custom item label" maxLength={40} required />
            </Field>
            <Field id="learner-custom-url" label="Destination URL" required help="HTTPS only. Custom links open in a new tab from the preview.">
              <input id="learner-custom-url" className={inputClass} type="url" value={newUrl} onChange={(event) => setNewUrl(event.target.value)} placeholder="https://example.org/resources" required />
            </Field>
            <Button variant="gold" type="submit"><Plus className="size-4" aria-hidden="true" /> Add custom item</Button>
          </form>
          {message ? <p className="px-4 pb-4 text-sm text-muted" role="status">{message}</p> : null}
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <IconTileHeading icon={EyeOff} tone="gold">Additional visibility</IconTileHeading>
            <div className="space-y-2">
              {([
                ["classRecords", "Class records"],
                ["overview", "Learner overview"],
                ["password", "Password controls"],
                ["preferences", "Preferences"],
                ["profile", "Profile"],
              ] as const).map(([key, label]) => <Toggle key={key} label={label} checked={visibility[key]} onChange={(value) => setVisibility((current) => ({ ...current, [key]: value }))} />)}
            </div>
          </Card>
          <Card className="p-5">
            <IconTileHeading icon={Users} tone="emerald">Learner preview</IconTileHeading>
            <nav aria-label="Preview of learner sidebar" className="space-y-1 rounded-xl border border-violet-200/70 bg-linear-to-br from-violet-50 via-white to-sky-50 p-3 dark:border-violet-500/20 dark:from-violet-500/10 dark:via-surface dark:to-sky-500/10">
              {items.filter((item) => item.visible).map((item, index) => item.url ? <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 break-words rounded-lg px-3 py-2 text-sm ${palette[cardCycle[index % cardCycle.length]].tile} underline underline-offset-4`}>{item.label}<span className="sr-only"> (opens in a new tab)</span><span className="ml-auto text-xs text-muted" aria-hidden="true">↗</span></a> : <div key={item.label} className={`rounded-lg px-3 py-2 text-sm ${palette[cardCycle[index % cardCycle.length]].tile}`}>{item.label}</div>)}
              {items.every((item) => !item.visible) ? <p className="p-3 text-sm text-muted">No items are visible.</p> : null}
            </nav>
          </Card>
        </div>
      </div>
    </>
  );
}

type Category = { id: number; name: string; children: string[] };
const initialCategories: Category[] = [
  { id: 1, name: "Bhagavata Mahavidyalaya", children: ["Bhakti Shastri", "Bhakti Vaibhava"] },
  { id: 2, name: "Self-study Courses", children: ["Introductory", "Advanced"] },
  { id: 3, name: "Ancient Wisdom", children: ["Bhagavad Gita", "Bhagavatam"] },
  { id: 4, name: "Kids & Parents", children: [] },
];

export function CategoriesSettingsPage() {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [parentId, setParentId] = useState("1");
  const [error, setError] = useState("");
  const addCategory = (event: React.FormEvent) => {
    event.preventDefault();
    const name = categoryName.trim();
    if (!name) { setError("Category name is required."); return; }
    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) { setError("A category with this name already exists."); return; }
    setCategories((current) => [...current, { id: Date.now(), name, children: [] }]);
    setCategoryName("");
    setError("");
  };
  const addSubcategory = (event: React.FormEvent) => {
    event.preventDefault();
    const name = subcategoryName.trim();
    if (!name) { setError("Subcategory name is required."); return; }
    const parent = categories.find((category) => category.id === Number(parentId));
    if (!parent || parent.children.some((child) => child.toLowerCase() === name.toLowerCase())) { setError("Choose a valid parent and a new subcategory name."); return; }
    setCategories((current) => current.map((category) => category.id === parent.id ? { ...category, children: [...category.children, name] } : category));
    setSubcategoryName("");
    setError("");
  };
  const reorder = (index: number, direction: number) => setCategories((current) => {
    const next = [...current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  return (
    <>
      <PageHeader title="Categories" description="Organize catalog categories, subcategories, and their order." status="ready" actions={<SaveButton onSave={() => notifySaved("Categories")} />} />
      <DemoNotice>Changes update this local demo view only; they do not alter the live catalog.</DemoNotice>
      <SettingsSummary items={[
        { label: "Categories", value: String(categories.length), hint: "Catalog groupings", icon: Tags, color: "amber" },
        { label: "Subcategories", value: String(categories.reduce((sum, category) => sum + category.children.length, 0)), hint: "Nested under categories", icon: Layers3, color: "violet" },
        { label: "Catalog order", value: "Custom", hint: "Use arrows to rearrange", icon: ArrowUp, color: "teal" },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <Card className="min-w-0 overflow-hidden">
          <CardIconHeader icon={Tags} title="Category structure" description={`${categories.length} categories`} tone="gold" />
          <ol className="min-w-0 divide-y divide-border">
            {categories.map((category, index) => (
              <li key={category.id} className={`m-3 min-w-0 rounded-2xl border p-4 shadow-sm ${palette[cardCycle[index % cardCycle.length]].tile}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${palette[cardCycle[index % cardCycle.length]].solid}`} aria-hidden="true"><Tags className="size-4" /></span>
                  <span className="min-w-0 flex-1 font-semibold text-foreground">{category.name}</span>
                  <Button size="sm" variant="soft-info" aria-label={`Move ${category.name} up`} disabled={!index} onClick={() => reorder(index, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Button>
                  <Button size="sm" variant="soft-violet" aria-label={`Move ${category.name} down`} disabled={index === categories.length - 1} onClick={() => reorder(index, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Button>
                  <Button size="sm" variant="soft-danger" aria-label={`Remove ${category.name}`} onClick={() => { setCategories((current) => current.filter((item) => item.id !== category.id)); if (parentId === String(category.id)) setParentId(String(categories.find((item) => item.id !== category.id)?.id ?? "")); }}><Trash2 className="size-4" aria-hidden="true" /></Button>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                  {category.children.length ? category.children.map((child, childIndex) => <li key={child} className={`flex min-w-0 items-center gap-1 rounded-xl border border-current/10 px-2 py-1 ${palette[cardCycle[(index + childIndex + 1) % cardCycle.length]].tile}`}><span className="min-w-0 flex-1 break-words">{child}</span><Button size="sm" variant="soft-info" aria-label={`Move ${child} up`} disabled={!childIndex} onClick={() => setCategories((current) => current.map((item) => { if (item.id !== category.id) return item; const children = [...item.children]; [children[childIndex - 1], children[childIndex]] = [children[childIndex], children[childIndex - 1]]; return { ...item, children }; }))}><ArrowUp className="size-4" aria-hidden="true" /></Button><Button size="sm" variant="soft-violet" aria-label={`Move ${child} down`} disabled={childIndex === category.children.length - 1} onClick={() => setCategories((current) => current.map((item) => { if (item.id !== category.id) return item; const children = [...item.children]; [children[childIndex], children[childIndex + 1]] = [children[childIndex + 1], children[childIndex]]; return { ...item, children }; }))}><ArrowDown className="size-4" aria-hidden="true" /></Button><Button size="sm" variant="soft-danger" aria-label={`Remove subcategory ${child}`} onClick={() => setCategories((current) => current.map((item) => item.id === category.id ? { ...item, children: item.children.filter((name) => name !== child) } : item))}><Trash2 className="size-4" aria-hidden="true" /></Button></li>) : <li className="rounded-full bg-surface px-3 py-1 text-xs text-muted">No subcategories</li>}
                </ul>
              </li>
            ))}
            {!categories.length ? <li className="p-5 text-sm text-muted">No categories yet. Add one to start the catalog structure.</li> : null}
          </ol>
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <IconTileHeading icon={Plus} tone="blue">Add category</IconTileHeading>
            <form className="space-y-3" onSubmit={addCategory}>
              <label><span className={labelClass}>Category name</span><input className={inputClass} value={categoryName} onChange={(e) => setCategoryName(e.target.value)} maxLength={80} /></label>
              <Button type="submit" variant="gold"><Plus className="size-4" aria-hidden="true" /> Add category</Button>
            </form>
          </Card>
          <Card className="p-5">
            <IconTileHeading icon={Tags} tone="violet">Add subcategory</IconTileHeading>
            <form className="space-y-3" onSubmit={addSubcategory}>
              <Field id="category-parent" label="Parent category"><Select id="category-parent" value={parentId} onValueChange={setParentId} disabled={!categories.length} options={categories.map((category) => ({ value: String(category.id), label: category.name }))} /></Field>
              <label><span className={labelClass}>Subcategory name</span><input className={inputClass} value={subcategoryName} onChange={(e) => setSubcategoryName(e.target.value)} maxLength={80} /></label>
              <Button type="submit" variant="soft-violet" disabled={!categories.length}><Plus className="size-4" aria-hidden="true" /> Add subcategory</Button>
            </form>
          </Card>
          {error ? <p className="text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
        </div>
      </div>
    </>
  );
}

const fieldEntities = ["Learner", "Instructor", "Course", "Batch", "Certificate", "Question", "Announcement", "Enquiry"];
type CustomField = { id: number; name: string; type: string; required: boolean; entity: string; placement: string };
const seedFields: CustomField[] = [
  { id: 1, name: "Preferred language", type: "Dropdown", required: true, entity: "Learner", placement: "Signup" },
  { id: 2, name: "Spiritual name", type: "Text", required: false, entity: "Learner", placement: "Offline admission" },
  { id: 3, name: "Instructor speciality", type: "Text", required: false, entity: "Instructor", placement: "Signup" },
  { id: 4, name: "Course level", type: "Dropdown", required: true, entity: "Course", placement: "Signup" },
];

export function CustomFieldsSettingsPage() {
  const [entity, setEntity] = useState("Learner");
  const [placement, setPlacement] = useState("Signup");
  const [fields, setFields] = useState(seedFields);
  const [name, setName] = useState("");
  const [type, setType] = useState("Text");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState("");
  const scopedFields = fields.filter((field) => field.entity === entity && field.placement === placement);
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) { setError("Field label is required."); return; }
    if (fields.some((field) => field.entity === entity && field.placement === placement && field.name.toLowerCase() === clean.toLowerCase())) { setError("This scope already has a field with that label."); return; }
    setFields((current) => [...current, { id: Date.now(), name: clean, type, required, entity, placement }]);
    setName("");
    setError("");
  };
  return (
    <>
      <PageHeader title="Custom Fields" description="Define extra fields for supported entities and form placements." status="ready" actions={<SaveButton onSave={() => notifySaved("Custom fields")} />} />
      <DemoNotice>Field definitions are demo-only and do not change signup, admission, or entity forms.</DemoNotice>
      <SettingsSummary items={[
        { label: "Configured fields", value: String(fields.length), hint: "Across supported entities", icon: FileText, color: "violet" },
        { label: `${entity} · ${placement}`, value: String(scopedFields.length), hint: "In the selected scope", icon: Users, color: "blue" },
        { label: "Supported entities", value: String(fieldEntities.length), hint: "Signup and offline admission", icon: Layers3, color: "teal" },
      ]} />
      <Card className="mb-4 overflow-hidden">
        <CardIconHeader icon={Layers3} title="Field scopes" description="Choose an entity and where its extra data appears." tone="violet" />
        <div className="p-4">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Custom field entity">
          {fieldEntities.map((item, index) => <button key={item} type="button" role="tab" aria-selected={entity === item} onClick={() => setEntity(item)} className={`min-h-10 rounded-xl border px-3 text-sm transition-colors ${entity === item ? `${palette[cardCycle[index % cardCycle.length]].tile} border-current/30 font-semibold` : "border-border bg-surface hover:bg-accent-soft"}`}>{item}</button>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Field placement">
          {["Signup", "Offline admission"].map((item, index) => <button key={item} type="button" aria-pressed={placement === item} onClick={() => setPlacement(item)} className={`min-h-10 rounded-xl border px-3 text-sm font-medium ${placement === item ? palette[index ? "teal" : "violet"].solid : "border-border bg-surface hover:bg-accent-soft"}`}>{item}</button>)}
        </div>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,1fr)]">
        <Card>
          <CardIconHeader icon={FileText} title={`${entity} fields`} description={`${placement} placement · ${scopedFields.length} fields`} tone="blue" />
          {scopedFields.length ? <ol className="grid gap-2 p-4 sm:grid-cols-2">{scopedFields.map((field, index) => <li key={field.id} className={`flex min-w-0 flex-wrap items-center gap-2 rounded-xl border p-3 ${palette[cardCycle[index % cardCycle.length]].tile}`}><GripVertical className="size-4 shrink-0 text-muted" aria-hidden="true" /><span className="min-w-0 flex-1"><strong className="block break-words text-sm text-foreground">{field.name}</strong><span className="text-xs text-muted">{field.type} · {field.required ? "Required" : "Optional"}</span></span><Button size="sm" variant="soft-info" aria-label={`Move ${field.name} up`} disabled={!index} onClick={() => setFields((current) => { const ids = scopedFields.map((item) => item.id); [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]]; return [...current].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)); })}><ArrowUp className="size-4" aria-hidden="true" /></Button><Button size="sm" variant="soft-danger" aria-label={`Remove ${field.name}`} onClick={() => setFields((current) => current.filter((item) => item.id !== field.id))}><Trash2 className="size-4" aria-hidden="true" /></Button></li>)}</ol> : <p className="p-5 text-sm text-muted">No fields for this entity and placement yet.</p>}
        </Card>
        <Card className="p-5">
          <IconTileHeading icon={Plus} tone="violet">Add field</IconTileHeading>
          <form className="space-y-3" onSubmit={add}>
            <label><span className={labelClass}>Field label</span><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            <Field id="custom-field-type" label="Field type"><Select id="custom-field-type" value={type} onValueChange={setType} options={["Text", "Number", "Date", "Dropdown", "Phone", "Email", "Checkbox"].map((option) => ({ value: option, label: option }))} /></Field>
            <Toggle label="Required" checked={required} onChange={setRequired} />
            <Button type="submit" variant="gold"><Plus className="size-4" aria-hidden="true" /> Add field</Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
        </Card>
      </div>
    </>
  );
}

type Organization = { id: number; name: string; location: string; manager: string; learners: number; activity: string; status: "Active" | "Paused" };
const organizations: Organization[] = [
  { id: 1, name: "Head Office – Mumbai", location: "Mumbai", manager: "Ananda Das", learners: 1840, activity: "Course enrolment updated · 2 hours ago", status: "Active" },
  { id: 2, name: "Pune Centre", location: "Pune", manager: "Madhava Rao", learners: 420, activity: "New learner registered · Yesterday", status: "Active" },
  { id: 3, name: "Online", location: "Online", manager: "Radhika Devi", learners: 3100, activity: "Manager assigned · 3 days ago", status: "Active" },
];

export function SubOrganizationsSettingsPage() {
  const [items, setItems] = useState(organizations);
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [manager, setManager] = useState("");
  const [error, setError] = useState("");
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !manager.trim()) { setError("Organization name and manager are required."); return; }
    if (items.some((item) => item.name.toLowerCase() === name.trim().toLowerCase())) { setError("That organization name already exists."); return; }
    setItems((current) => [...current, { id: Date.now(), name: name.trim(), location: location.trim() || "—", manager: manager.trim(), learners: 0, activity: "Created in this demo just now", status: "Active" }]);
    setName(""); setLocation(""); setManager(""); setError("");
  };
  return (
    <>
      <PageHeader title="Sub-Organizations" description="Manage branches, their managers, and recent activity." status="ready" actions={<SaveButton onSave={() => notifySaved("Sub-organizations")} />} />
      <DemoNotice>Branch records and activity are synthetic demo data. No users or organization accounts are provisioned.</DemoNotice>
      <SettingsSummary items={[
        { label: "Organizations", value: String(items.length), hint: "Branches in this demo", icon: Users, color: "teal" },
        { label: "Active branches", value: String(items.filter((item) => item.status === "Active").length), hint: "Can be paused or reactivated", icon: CheckCircle2, color: "emerald" },
        { label: "Learners", value: items.reduce((sum, item) => sum + item.learners, 0).toLocaleString(), hint: "Synthetic branch totals", icon: BookOpen, color: "violet" },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
        <Card>
          <CardIconHeader icon={Users} title="Organizations" description={`${items.length} branches`} tone="emerald" />
          <ul className="grid gap-3 p-4">
            {items.map((item, index) => <li key={item.id} className={`grid min-w-0 gap-3 rounded-2xl border p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center ${palette[cardCycle[index % cardCycle.length]].tile}`}>
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${palette[cardCycle[index % cardCycle.length]].solid}`} aria-hidden="true"><Users className="size-4" /></span><h3 className="min-w-0 flex-1 break-words font-semibold text-foreground">{item.name}</h3><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "Active" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300" : "bg-surface-muted text-muted"}`}>{item.status}</span></div><p className="mt-2 text-sm text-muted">{item.location} · Manager: {item.manager} · {item.learners.toLocaleString()} learners</p><p className="mt-1 text-xs text-muted"><Activity className="mr-1 inline size-3.5" aria-hidden="true" />Recent activity: {item.activity}</p></div>
              <Button size="sm" variant={item.status === "Active" ? "soft-warning" : "soft-success"} onClick={() => setItems((current) => current.map((branch) => branch.id === item.id ? { ...branch, status: branch.status === "Active" ? "Paused" : "Active", activity: `Status changed in demo · just now` } : branch))}>{item.status === "Active" ? "Pause branch" : "Reactivate branch"}</Button>
            </li>)}
          </ul>
        </Card>
        <Card className="p-5">
          <IconTileHeading icon={Plus} tone="blue">Add sub-organization</IconTileHeading>
          <form className="space-y-3" onSubmit={add}>
            <label><span className={labelClass}>Organization name</span><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            <label><span className={labelClass}>City or location</span><input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80} /></label>
            <label><span className={labelClass}>Manager</span><input className={inputClass} value={manager} onChange={(e) => setManager(e.target.value)} maxLength={80} /></label>
            <Button type="submit" variant="gold"><Plus className="size-4" aria-hidden="true" /> Add branch</Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
        </Card>
      </div>
    </>
  );
}

type GradeBand = { id: number; name: string; min: number; max: number; remark: string };
const initialGrades: GradeBand[] = [
  { id: 1, name: "A+", min: 90, max: 100, remark: "Distinction" },
  { id: 2, name: "A", min: 75, max: 89, remark: "First class" },
  { id: 3, name: "B", min: 60, max: 74, remark: "Second class" },
  { id: 4, name: "C", min: 40, max: 59, remark: "Pass" },
  { id: 5, name: "Not passed", min: 0, max: 39, remark: "Retake required" },
];

export function GradingSystemSettingsPage() {
  const [grades, setGrades] = useState(initialGrades);
  const [error, setError] = useState("");
  const sorted = useMemo(() => [...grades].sort((a, b) => a.min - b.min), [grades]);
  const passingThreshold = Math.min(...grades.filter((grade) => grade.name !== "Not passed").map((grade) => grade.min), 100);
  const validation = (): string => {
    if (!grades.length) return "Add at least one grade band.";
    const names = new Set<string>();
    for (const band of sorted) {
      if (!band.name.trim()) return "Every band needs a grade label.";
      if (names.has(band.name.trim().toLowerCase())) return "Grade labels must be unique.";
      names.add(band.name.trim().toLowerCase());
      if (!Number.isInteger(band.min) || !Number.isInteger(band.max) || band.min < 0 || band.max > 100 || band.min > band.max) return "Each band must use whole-number limits from 0 to 100, with From less than or equal to To.";
    }
    if (sorted[0].min !== 0 || sorted[sorted.length - 1].max !== 100) return "Grade bands must cover the full 0–100 range.";
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].min !== sorted[index - 1].max + 1) return "Grade bands must be continuous with no gaps or overlaps.";
    }
    return "";
  };
  const update = (id: number, key: keyof GradeBand, value: string) => setGrades((current) => current.map((grade) => grade.id === id ? { ...grade, [key]: key === "min" || key === "max" ? Number(value) : value } : grade));
  const save = () => {
    const result = validation();
    setError(result);
    if (!result) notifySaved("Grading system");
  };
  return (
    <>
      <PageHeader title="Grading System" description="Set percentage bands for assessment outcomes." status="ready" actions={<SaveButton onSave={save} />} />
      <DemoNotice>Validation requires whole-number bands covering 0–100 without gaps or overlaps. Changes are not applied to assessments.</DemoNotice>
      <SettingsSummary items={[
        { label: "Grade bands", value: String(grades.length), hint: "Assessment outcomes", icon: Layers3, color: "violet" },
        { label: "Score coverage", value: validation() ? "Needs review" : "0–100%", hint: validation() ? "Fix gaps or overlaps before saving" : "Continuous, non-overlapping bands", icon: CheckCircle2, color: validation() ? "amber" : "emerald" },
        { label: "Passing threshold", value: `${passingThreshold}%`, hint: "Lowest passing band in the demo", icon: ShieldCheck, color: "blue" },
      ]} />
      <Card>
        <CardIconHeader icon={Settings2} title="Grade bands" description="Edit labels, percentage limits, and learner-facing remarks." tone="violet" />
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4"><p className="text-sm text-muted">Ordered automatically by their lower percentage.</p><Button variant="gold" onClick={() => setGrades((current) => [...current, { id: Date.now(), name: "", min: 0, max: 0, remark: "" }])}><Plus className="size-4" aria-hidden="true" /> Add band</Button></div>
        <div className="space-y-3 p-4">
          {grades.map((grade, index) => <div key={grade.id} className={`grid min-w-0 gap-3 rounded-2xl border p-3 shadow-sm sm:grid-cols-[minmax(0,1fr)_100px_100px_minmax(0,1.2fr)_auto] sm:items-end ${palette[cardCycle[index % cardCycle.length]].tile}`}>
            <label><span className={labelClass}>Grade</span><input className={inputClass} value={grade.name} onChange={(e) => update(grade.id, "name", e.target.value)} maxLength={30} /></label>
            <label><span className={labelClass}>From (%)</span><input className={inputClass} type="number" min="0" max="100" step="1" value={grade.min} onChange={(e) => update(grade.id, "min", e.target.value)} /></label>
            <label><span className={labelClass}>To (%)</span><input className={inputClass} type="number" min="0" max="100" step="1" value={grade.max} onChange={(e) => update(grade.id, "max", e.target.value)} /></label>
            <label><span className={labelClass}>Remark</span><input className={inputClass} value={grade.remark} onChange={(e) => update(grade.id, "remark", e.target.value)} maxLength={80} /></label>
            <Button variant="soft-danger" aria-label={`Remove grade ${grade.name || "band"}`} onClick={() => setGrades((current) => current.filter((item) => item.id !== grade.id))}><Trash2 className="size-4" aria-hidden="true" /></Button>
          </div>)}
          {error ? <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p> : null}
        </div>
      </Card>
    </>
  );
}

type Fee = { id: number; name: string; description: string; amount: number; appliesTo: string; active: boolean };
const initialFees: Fee[] = [
  { id: 1, name: "Printed study material", description: "Printed course material and workbook.", amount: 600, appliesTo: "Bhakti Shastri", active: true },
  { id: 2, name: "Exam re-evaluation", description: "Administrative fee for one re-evaluation request.", amount: 250, appliesTo: "All assessments", active: true },
  { id: 3, name: "Courier charges", description: "Domestic delivery of physical learning materials.", amount: 120, appliesTo: "Book orders", active: true },
];

export function MiscellaneousFeesSettingsPage() {
  const [fees, setFees] = useState(initialFees);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [appliesTo, setAppliesTo] = useState("");
  const [error, setError] = useState("");
  const add = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!name.trim() || !description.trim()) { setError("Fee name and description are required."); return; }
    if (!Number.isFinite(value) || value <= 0 || value > 10000000) { setError("Enter a fee amount greater than 0 and no more than ₹1,00,00,000."); return; }
    if (fees.some((fee) => fee.name.toLowerCase() === name.trim().toLowerCase())) { setError("A fee template with this name already exists."); return; }
    setFees((current) => [...current, { id: Date.now(), name: name.trim(), description: description.trim(), amount: value, appliesTo: appliesTo.trim() || "Any eligible product", active: true }]);
    setName(""); setDescription(""); setAmount(""); setAppliesTo(""); setError("");
  };
  return (
    <>
      <PageHeader title="Miscellaneous Fees" description="Maintain reusable fee templates that may be added during checkout." status="ready" actions={<SaveButton onSave={() => notifySaved("Miscellaneous fees")} />} />
      <DemoNotice>Fee templates are local demo data. No checkout or payment is initiated.</DemoNotice>
      <SettingsSummary items={[
        { label: "Fee templates", value: String(fees.length), hint: "Reusable checkout options", icon: Banknote, color: "amber" },
        { label: "Active templates", value: String(fees.filter((fee) => fee.active).length), hint: "Demo status only", icon: CheckCircle2, color: "emerald" },
        { label: "Average amount", value: `₹${fees.length ? Math.round(fees.reduce((sum, fee) => sum + fee.amount, 0) / fees.length).toLocaleString("en-IN") : "0"}`, hint: "Across displayed templates", icon: CircleDollarSign, color: "violet" },
      ]} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,1fr)]">
        <Card>
          <CardIconHeader icon={Banknote} title="Fee templates" description={`${fees.length} templates`} tone="gold" />
          <ul className="grid gap-3 p-4">{fees.map((fee, index) => <li key={fee.id} className={`grid min-w-0 gap-3 rounded-2xl border p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_auto] ${palette[cardCycle[index % cardCycle.length]].tile}`}><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><span className={`inline-flex size-9 items-center justify-center rounded-xl ${palette[cardCycle[index % cardCycle.length]].solid}`} aria-hidden="true"><Banknote className="size-4" /></span><span className="min-w-0 flex-1 break-words font-semibold text-foreground">{fee.name}</span><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-success">{fee.active ? "Active" : "Inactive"}</span></span><span className="mt-2 block break-words text-sm text-muted">{fee.description}</span><span className="mt-2 inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted"><span className="rounded-full bg-surface/80 px-2 py-1">Applies to: {fee.appliesTo}</span></span></span><span className="flex items-start justify-between gap-3 sm:flex-col sm:items-end"><strong className="whitespace-nowrap text-lg text-foreground">₹{fee.amount.toLocaleString("en-IN")}</strong><Button size="sm" variant="soft-danger" aria-label={`Remove ${fee.name}`} onClick={() => setFees((current) => current.filter((item) => item.id !== fee.id))}><Trash2 className="size-4" aria-hidden="true" /> Remove</Button></span></li>)}</ul>
          {!fees.length ? <p className="p-5 text-sm text-muted">No fee templates have been added.</p> : null}
        </Card>
        <Card className="p-5">
          <IconTileHeading icon={FileText} tone="blue">Create fee template</IconTileHeading>
          <form className="space-y-3" onSubmit={add}>
            <label><span className={labelClass}>Fee name</span><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></label>
            <label><span className={labelClass}>Description</span><textarea className={`${inputClass} min-h-24`} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} /></label>
            <label><span className={labelClass}>Amount (₹)</span><input className={inputClass} type="number" min="0.01" max="10000000" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label><span className={labelClass}>Applies to</span><input className={inputClass} value={appliesTo} onChange={(e) => setAppliesTo(e.target.value)} maxLength={100} placeholder="Optional product or service" /></label>
            <Button type="submit" variant="gold"><Plus className="size-4" aria-hidden="true" /> Add fee</Button>
          </form>
          {error ? <p className="mt-3 text-sm text-red-700 dark:text-red-300" role="alert">{error}</p> : null}
        </Card>
      </div>
    </>
  );
}

type WalletEntry = { id: number; date: string; description: string; type: "Recharge" | "Usage"; channel: "SMS" | "WhatsApp" | "Email"; credits: number; balance: number };
const walletEntries: WalletEntry[] = [
  { id: 1, date: "2026-10-24", description: "Wallet recharge", type: "Recharge", channel: "Email", credits: 10000, balance: 28470 },
  { id: 2, date: "2026-10-23", description: "Session reminders", type: "Usage", channel: "WhatsApp", credits: -420, balance: 18470 },
  { id: 3, date: "2026-10-22", description: "Kartik reminder campaign", type: "Usage", channel: "SMS", credits: -680, balance: 18890 },
  { id: 4, date: "2026-10-20", description: "Batch launch announcement", type: "Usage", channel: "Email", credits: -120, balance: 19570 },
  { id: 5, date: "2026-10-18", description: "Wallet recharge", type: "Recharge", channel: "Email", credits: 10000, balance: 19690 },
  { id: 6, date: "2026-10-16", description: "Enrolment update", type: "Usage", channel: "WhatsApp", credits: -310, balance: 9690 },
];

export function UtilityWalletSettingsPage() {
  const [tab, setTab] = useState<"notifications" | "ai">("notifications");
  const [channel, setChannel] = useState("All channels");
  const [kind, setKind] = useState("All activity");
  const [filterDate, setFilterDate] = useState("");
  const visibleEntries = walletEntries.filter((entry) => (channel === "All channels" || entry.channel === channel) && (kind === "All activity" || (kind === "Recharges" ? entry.type === "Recharge" : entry.type === "Usage")) && (!filterDate || entry.date === filterDate));
  const usage = walletEntries.filter((entry) => entry.type === "Usage").reduce((sum, entry) => sum + Math.abs(entry.credits), 0);
  return (
    <>
      <PageHeader title="Utility Wallet" description="Review notification credits, usage, and recharge history." status="ready" />
      <DemoNotice>The ledger is synthetic. Recharges, provider sends, and AI credits are not available from this demo.</DemoNotice>
      <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2" role="tablist" aria-label="Wallet credit type">
        <button type="button" role="tab" aria-selected={tab === "notifications"} onClick={() => setTab("notifications")} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${tab === "notifications" ? "border-emerald-300/50 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300" : "border-transparent text-muted hover:bg-surface-muted/50"}`}><Wallet className="mr-2 inline size-4" aria-hidden="true" />Notification credits</button>
        <button type="button" role="tab" aria-selected={tab === "ai"} onClick={() => setTab("ai")} className={`min-h-11 rounded-xl border px-4 text-sm font-semibold transition-colors ${tab === "ai" ? "border-amber-300/50 bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-300" : "border-transparent text-muted hover:bg-surface-muted/50"}`}><span className="mr-2 inline-flex size-5 items-center justify-center rounded-full bg-amber-200 text-[10px] text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">AI</span>AI credits <span className="ml-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs">Unavailable</span></button>
      </div>
      {tab === "ai" ? <Card className="overflow-hidden" role="tabpanel"><CardIconHeader icon={Wallet} title="AI credits are unavailable" description="This capability is marked Coming Soon." tone="gold" /><div className="p-5"><p className="max-w-2xl text-sm text-muted">There is no AI balance, usage history, provider connection, or recharge action in this demo.</p><div className="mt-4 rounded-xl border border-amber-300/40 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200"><ShieldCheck className="mr-2 inline size-4" aria-hidden="true" />No credit balance or provider status is being represented as live.</div></div></Card> : (
        <div role="tabpanel">
          <SettingsSummary items={[
            { label: "Wallet balance", value: "₹28,470", hint: "Available demo balance", icon: Wallet, color: "emerald" },
            { label: "Spent this month", value: "₹3,120", hint: "Sample monthly total", icon: CreditCard, color: "violet" },
            { label: "WhatsApp", value: "4,812", hint: "Messages this month", icon: Users, color: "teal" },
            { label: "SMS", value: "2,104", hint: "Messages this month", icon: Activity, color: "orange" },
          ]} />
          <Card className="mb-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="flex items-center gap-3 font-semibold"><span className="inline-flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><Wallet className="size-4" aria-hidden="true" /></span>Usage overview</h2><p className="mt-1 text-sm text-muted">Sample usage totals across {walletEntries.filter((entry) => entry.type === "Usage").length} transactions.</p></div><p className="text-sm"><span className="font-semibold">{usage.toLocaleString()}</span> demo credits used</p></div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">{["SMS", "WhatsApp", "Email"].map((name) => <p key={name} className="rounded-lg bg-surface-muted/40 px-3 py-2 text-sm">{name} <span className="float-right text-muted">{walletEntries.filter((entry) => entry.channel === name && entry.type === "Usage").length} transactions</span></p>)}</div>
          </Card>
          <Card>
            <CardIconHeader icon={Wallet} title="Credit history" description="Recharge and usage transactions with channel and running balance." tone="emerald" />
            <p className="px-5 pb-3 text-sm text-muted">{visibleEntries.length} entries</p>
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row">
              <Field id="wallet-channel" label="Channel"><Select id="wallet-channel" value={channel} onValueChange={setChannel} options={["All channels", "SMS", "WhatsApp", "Email"].map((value) => ({ value, label: value }))} /></Field>
              <Field id="wallet-activity" label="Activity"><Select id="wallet-activity" value={kind} onValueChange={setKind} options={["All activity", "Recharges", "Usage"].map((value) => ({ value, label: value }))} /></Field>
              <Field id="wallet-date" label="Specific date"><DatePicker id="wallet-date" value={filterDate} onValueChange={setFilterDate} placeholder="Any date" /></Field>
              {filterDate ? <div className="flex items-end"><Button variant="soft-info" onClick={() => setFilterDate("")}>Clear date</Button></div> : null}
            </div>
            <TableScroll label="Notification credit history">
              <table className="admin-data-table min-w-[760px]">
                <caption className="sr-only">Notification credit transaction history</caption>
                <thead><tr><th scope="col"><TableHeading icon={CalendarDays}>Date</TableHeading></th><th scope="col"><TableHeading icon={FileText}>Description</TableHeading></th><th scope="col"><TableHeading icon={Activity}>Type</TableHeading></th><th scope="col"><TableHeading icon={Globe2}>Channel</TableHeading></th><th scope="col"><TableHeading icon={Banknote}>Amount</TableHeading></th><th scope="col"><TableHeading icon={Wallet}>Balance after</TableHeading></th></tr></thead>
                <tbody>{visibleEntries.map((entry, index) => <tr key={entry.id} className="border-b border-border last:border-0"><td>{entry.date}</td><th scope="row" className="font-medium">{entry.description}</th><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${entry.type === "Recharge" ? palette.emerald.tile : palette.violet.tile}`}>{entry.type}</span></td><td><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${palette[cardCycle[index % cardCycle.length]].tile}`}>{entry.channel}</span></td><td className={entry.credits < 0 ? "text-muted" : "font-semibold text-emerald-700 dark:text-emerald-300"}>{entry.credits > 0 ? "+" : "−"}₹{Math.abs(entry.credits).toLocaleString("en-IN")}</td><td className="font-medium">₹{entry.balance.toLocaleString("en-IN")}</td></tr>)}</tbody>
              </table>
              {!visibleEntries.length ? <p className="p-5 text-sm text-muted">No history matches these filters.</p> : null}
            </TableScroll>
          </Card>
        </div>
      )}
    </>
  );
}
