"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, inputClass, Select } from "@/components/ui/Field";
import { apiClient, ApiError } from "@/lib/api/client";
import type { SiteSettings } from "@/lib/website/site-defaults";
import { Globe, Link2, Mail, Plus, Save, Share2, Sparkles, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "../PageHeader";

const socialIcons = ["instagram", "facebook", "linkedin", "x", "whatsapp", "youtube", "telegram"];
const figureColors = ["teal", "gold", "blue", "rose"];
const linkLabels: Array<[keyof SiteSettings["links"], string]> = [
    ["donate", "Donate page"], ["officialSite", "Official IBMV website"], ["officialBooks", "Official book catalog"], ["app", "Learner app"],
    ["whatsappCommunity", "WhatsApp community"], ["telegramCommunity", "Telegram community"], ["videoPlaylist", "Video playlist"], ["testimonialsSource", "Full testimonials page"],
];

function SectionTitle({ icon: Icon, children }: { icon: typeof Mail; children: React.ReactNode }) {
    return <h2 className="mb-4 flex items-center gap-2 font-semibold"><span className="flex size-8 items-center justify-center rounded-lg bg-accent-soft text-accent" aria-hidden="true"><Icon className="size-4" /></span>{children}</h2>;
}

export function SiteSettingsPage({ initial }: { initial: SiteSettings }) {
    const [settings, setSettings] = useState<SiteSettings>(initial);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const err = (path: string) => errors[path];
    const update = (change: (draft: SiteSettings) => SiteSettings) => { setSettings((current) => change(structuredClone(current))); setErrors({}); };

    async function save() {
        setSaving(true);
        try {
            const result = await apiClient.put<SiteSettings>("/api/admin/site-settings", settings);
            setSettings(result.data);
            toast.success("Website settings saved", { description: "The public website shows the new values immediately." });
        } catch (error) {
            if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
                setErrors(error.fields);
                toast.error("Please correct the highlighted fields.");
            } else toast.error(error instanceof ApiError ? error.message : "Could not save the settings.");
        } finally {
            setSaving(false);
        }
    }

    const text = (id: string, label: string, path: string, value: string, set: (v: string) => void, help?: string, type = "text") => (
        <Field id={id} label={label} error={err(path)} help={help}>
            <input id={id} type={type} className={inputClass} value={value} onChange={(e) => set(e.target.value)} aria-invalid={Boolean(err(path))} />
        </Field>
    );

    return (
        <>
            <PageHeader
                title="Site Settings"
                description="Contact details, social links, official links and figures shown across the public website."
                status="ready"
                actions={<Button variant="gold" onClick={() => void save()} disabled={saving}><Save className="size-4" aria-hidden="true" />{saving ? "Saving…" : "Save settings"}</Button>}
            />
            <div className="grid gap-4 xl:grid-cols-2">
                <Card className="p-5">
                    <SectionTitle icon={Mail}>Contact details</SectionTitle>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {text("c-email", "Email", "contact.email", settings.contact.email, (v) => update((d) => { d.contact.email = v; return d; }), undefined, "email")}
                        {text("c-phone", "Phone (as shown)", "contact.phone", settings.contact.phone, (v) => update((d) => { d.contact.phone = v; return d; }))}
                        {text("c-dial", "Phone (dial link)", "contact.phoneDial", settings.contact.phoneDial, (v) => update((d) => { d.contact.phoneDial = v; return d; }), "International form, for example +919528006565.")}
                        {text("c-contact-url", "Official contact page", "contact.officialContactUrl", settings.contact.officialContactUrl, (v) => update((d) => { d.contact.officialContactUrl = v; return d; }))}
                        <div className="sm:col-span-2">{text("c-map", "Map link (optional)", "contact.mapUrl", settings.contact.mapUrl, (v) => update((d) => { d.contact.mapUrl = v; return d; }))}</div>
                        <div className="sm:col-span-2">
                            <Field id="c-address" label="Postal address (optional)" error={err("contact.address")}>
                                <textarea id="c-address" rows={3} className={`${inputClass} h-auto py-2`} value={settings.contact.address} onChange={(e) => update((d) => { d.contact.address = e.target.value; return d; })} />
                            </Field>
                        </div>
                    </div>
                </Card>

                <Card className="p-5">
                    <SectionTitle icon={Link2}>Official links</SectionTitle>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {linkLabels.map(([key, label]) => <div key={key}>{text(`l-${key}`, label, `links.${key}`, settings.links[key], (v) => update((d) => { d.links[key] = v; return d; }))}</div>)}
                    </div>
                </Card>

                <Card className="p-5">
                    <SectionTitle icon={Share2}>Social links</SectionTitle>
                    <ul className="space-y-3">
                        {settings.social.map((item, index) => (
                            <li key={index} className="grid items-end gap-2 sm:grid-cols-[9rem_1fr_1fr_auto]">
                                <Field id={`s-icon-${index}`} label="Icon" error={err(`social.${index}.icon`)}><Select id={`s-icon-${index}`} value={item.icon} onValueChange={(v) => update((d) => { d.social[index].icon = v; return d; })} options={socialIcons.map((v) => ({ value: v, label: v }))} /></Field>
                                {text(`s-label-${index}`, "Label", `social.${index}.label`, item.label, (v) => update((d) => { d.social[index].label = v; return d; }))}
                                {text(`s-href-${index}`, "Link", `social.${index}.href`, item.href, (v) => update((d) => { d.social[index].href = v; return d; }))}
                                <Button size="sm" variant="soft-danger" aria-label={`Remove ${item.label}`} onClick={() => update((d) => { d.social.splice(index, 1); return d; })}><Trash2 className="size-4" aria-hidden="true" /></Button>
                            </li>
                        ))}
                    </ul>
                    <Button className="mt-3" size="sm" variant="soft-success" disabled={settings.social.length >= 12} onClick={() => update((d) => { d.social.push({ icon: "instagram", label: "", href: "https://" }); return d; })}><Plus className="size-4" aria-hidden="true" />Add social link</Button>
                </Card>

                <Card className="p-5">
                    <SectionTitle icon={Sparkles}>Home page figures</SectionTitle>
                    {text("h-learners", "Learners reported by IBMV", "hero.reportedLearners", settings.hero.reportedLearners, (v) => update((d) => { d.hero.reportedLearners = v; return d; }), "Shown under the hero, for example 31,500+.")}
                    <p className="mt-4 mb-2 text-sm font-medium">Hero statistics</p>
                    <ul className="space-y-3">
                        {settings.hero.stats.map((stat, index) => (
                            <li key={index} className="grid items-end gap-2 sm:grid-cols-[6rem_4rem_1fr_1fr_auto]">
                                {text(`st-v-${index}`, "Number", `hero.stats.${index}.value`, String(stat.value), (v) => update((d) => { d.hero.stats[index].value = Number(v.replace(/\D/g, "")) || 0; return d; }))}
                                {text(`st-s-${index}`, "Suffix", `hero.stats.${index}.suffix`, stat.suffix, (v) => update((d) => { d.hero.stats[index].suffix = v; return d; }))}
                                {text(`st-l-${index}`, "Label", `hero.stats.${index}.label`, stat.label, (v) => update((d) => { d.hero.stats[index].label = v; return d; }))}
                                {text(`st-d-${index}`, "Detail", `hero.stats.${index}.detail`, stat.detail, (v) => update((d) => { d.hero.stats[index].detail = v; return d; }))}
                                <Button size="sm" variant="soft-danger" aria-label={`Remove ${stat.label}`} onClick={() => update((d) => { d.hero.stats.splice(index, 1); return d; })}><Trash2 className="size-4" aria-hidden="true" /></Button>
                            </li>
                        ))}
                    </ul>
                    <Button className="mt-3" size="sm" variant="soft-success" disabled={settings.hero.stats.length >= 6} onClick={() => update((d) => { d.hero.stats.push({ value: 0, suffix: "+", label: "", detail: "" }); return d; })}><Plus className="size-4" aria-hidden="true" />Add statistic</Button>
                </Card>

                <Card className="p-5 xl:col-span-2">
                    <SectionTitle icon={Users}>Community figures (testimonials section)</SectionTitle>
                    <ul className="grid gap-3 md:grid-cols-2">
                        {settings.communityFigures.map((figure, index) => (
                            <li key={index} className="grid items-end gap-2 sm:grid-cols-[7rem_1fr_7rem_auto]">
                                {text(`f-v-${index}`, "Figure", `communityFigures.${index}.value`, figure.value, (v) => update((d) => { d.communityFigures[index].value = v; return d; }))}
                                {text(`f-l-${index}`, "Label", `communityFigures.${index}.label`, figure.label, (v) => update((d) => { d.communityFigures[index].label = v; return d; }))}
                                <Field id={`f-c-${index}`} label="Color"><Select id={`f-c-${index}`} value={figure.color} onValueChange={(v) => update((d) => { d.communityFigures[index].color = v; return d; })} options={figureColors.map((v) => ({ value: v, label: v }))} /></Field>
                                <Button size="sm" variant="soft-danger" aria-label={`Remove ${figure.label}`} onClick={() => update((d) => { d.communityFigures.splice(index, 1); return d; })}><Trash2 className="size-4" aria-hidden="true" /></Button>
                            </li>
                        ))}
                    </ul>
                    <Button className="mt-3" size="sm" variant="soft-success" disabled={settings.communityFigures.length >= 8} onClick={() => update((d) => { d.communityFigures.push({ value: "", label: "", color: "teal" }); return d; })}><Plus className="size-4" aria-hidden="true" />Add figure</Button>
                    <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Globe className="size-3.5" aria-hidden="true" />These are figures reported by IBMV, not live counts. Keep the wording honest.</p>
                </Card>

                {([
                    ["institution", "About IBMV", "The public About IBMV page"],
                    ["prabhupada", "Srila Prabhupada", "The public inspiration page"],
                ] as const).map(([key, title, help]) => (
                    <Card className="p-5 xl:col-span-2" key={key}>
                        <SectionTitle icon={Sparkles}>{title}</SectionTitle>
                        <p className="-mt-2 mb-4 text-xs text-muted">{help}</p>
                        <div className="grid gap-3 md:grid-cols-2">
                            {text(`${key}-eyebrow`, "Eyebrow", `${key}.eyebrow`, settings[key].eyebrow, (v) => update((d) => { d[key].eyebrow = v; return d; }))}
                            {text(`${key}-title`, "Page title", `${key}.title`, settings[key].title, (v) => update((d) => { d[key].title = v; return d; }))}
                            <div className="md:col-span-2"><Field id={`${key}-description`} label="Introduction"><textarea id={`${key}-description`} rows={2} className={`${inputClass} h-auto py-2`} value={settings[key].description} onChange={(e) => update((d) => { d[key].description = e.target.value; return d; })} /></Field></div>
                            {text(`${key}-intro-heading`, "First heading", `${key}.introHeading`, settings[key].introHeading, (v) => update((d) => { d[key].introHeading = v; return d; }))}
                            <div className="md:col-span-2"><Field id={`${key}-intro`} label="Main copy"><textarea id={`${key}-intro`} rows={5} className={`${inputClass} h-auto py-2`} value={settings[key].intro} onChange={(e) => update((d) => { d[key].intro = e.target.value; return d; })} /></Field></div>
                            {text(`${key}-closing-heading`, "Closing heading", `${key}.closingHeading`, settings[key].closingHeading, (v) => update((d) => { d[key].closingHeading = v; return d; }))}
                            <div className="md:col-span-2"><Field id={`${key}-closing`} label="Closing copy"><textarea id={`${key}-closing`} rows={4} className={`${inputClass} h-auto py-2`} value={settings[key].closing} onChange={(e) => update((d) => { d[key].closing = e.target.value; return d; })} /></Field></div>
                        </div>
                    </Card>
                ))}
            </div>
        </>
    );
}
