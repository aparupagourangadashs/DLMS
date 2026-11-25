"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { StatCard } from "@/components/ui/StatCard";
import type { CellValue, FormField } from "@/lib/admin/types";
import { ApiError, apiClient } from "@/lib/api/client";
import { useResourceList } from "@/lib/api/hooks";
import { cardCycle, palette } from "@/lib/colors";
import { ArrowDown, ArrowUp, Eye, EyeOff, Layers3, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormDrawer } from "../FormDrawer";
import { PageHeader } from "../PageHeader";

type Category = {
    id: string;
    slug: string;
    title: string;
    shortLabel: string;
    description: string;
    color: string;
    status: string;
    courseCount: number;
    parentId: string | null;
    children: Category[];
};

const statusField: FormField = { key: "status", label: "Status", type: "select", options: ["Published", "Draft", "Archived"], required: true, defaultValue: "Published", help: "Only published top-level categories appear on the website." };
const topFields: FormField[] = [
    { key: "title", label: "Category name", type: "text", required: true },
    { key: "slug", label: "URL name", type: "text", placeholder: "self-study", help: "Used in the website address. Leave blank to create it from the name." },
    { key: "shortLabel", label: "Short label", type: "text", help: "A few words shown above the name on the website." },
    { key: "description", label: "Description", type: "textarea", required: true, help: "Shown at the top of the collection page and on the home page." },
    { key: "color", label: "Color", type: "select", options: ["teal", "gold", "blue", "rose", "plum"], required: true, defaultValue: "teal" },
    statusField,
];
const subFields: FormField[] = [
    { key: "title", label: "Sub-category name", type: "text", required: true },
    { key: "slug", label: "URL name", type: "text", help: "Leave blank to create it from the name." },
    statusField,
];

type Drawer = { category?: Category; parent?: Category } | null;

export function CategoriesPage() {
    const list = useResourceList<Category>("/api/admin/categories");
    const [drawer, setDrawer] = useState<Drawer>(null);
    const [removing, setRemoving] = useState<Category | null>(null);
    const [busy, setBusy] = useState(false);
    const categories = list.rows ?? [];
    const subCount = categories.reduce((sum, c) => sum + c.children.length, 0);

    const report = (error: unknown) => toast.error(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");

    async function move(siblings: Category[], parentId: string | null, index: number, direction: -1 | 1) {
        const ids = siblings.map((s) => s.id);
        [ids[index], ids[index + direction]] = [ids[index + direction], ids[index]];
        try {
            await apiClient.post("/api/admin/categories/reorder", { parentId, ids });
            list.refetch();
        } catch (error) {
            report(error);
        }
    }

    async function remove() {
        if (!removing) return;
        setBusy(true);
        try {
            await apiClient.delete(`/api/admin/categories/${removing.id}`);
            toast.success("Category deleted");
            setRemoving(null);
            list.refetch();
        } catch (error) {
            report(error);
        } finally {
            setBusy(false);
        }
    }

    async function toggleVisibility(category: Category) {
        const next = category.status === "Published" ? "Draft" : "Published";
        try {
            await apiClient.patch(`/api/admin/categories/${category.id}`, { ...category, status: next });
            toast.success(next === "Published" ? "Category published" : "Category hidden");
            list.refetch();
        } catch (error) {
            report(error);
        }
    }

    async function submit(values: Record<string, CellValue>) {
        const editing = drawer?.category;
        try {
            if (editing) await apiClient.patch(`/api/admin/categories/${editing.id}`, values);
            else await apiClient.post("/api/admin/categories", { ...values, parentId: drawer?.parent?.id ?? null });
        } catch (error) {
            if (error instanceof ApiError && Object.keys(error.fields).length > 0) return error.fields;
            report(error);
            return;
        }
        toast.success(editing ? "Category updated" : "Category added");
        setDrawer(null);
        list.refetch();
    }

    const isSub = Boolean(drawer?.parent ?? drawer?.category?.parentId);

    return (
        <>
            <PageHeader
                title="Categories"
                description="Top-level categories are the course collections on the public website, and each course belongs to one. Sub-categories group topics inside a collection."
                status="ready"
                actions={<Button variant="gold" onClick={() => setDrawer({})}><Plus className="size-4" aria-hidden="true" />Add category</Button>}
            />

            {list.status === "error" ? (
                <EmptyState title="Could not load categories" description={list.error?.message ?? "Something went wrong."} action={<Button onClick={list.refetch}>Try again</Button>} />
            ) : list.status === "loading" && !list.rows ? (
                <p role="status" className="py-12 text-center text-sm text-muted">Loading categories…</p>
            ) : (
                <>
                    <section className="mb-5 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 xl:grid-cols-4" aria-label="Category summary">
                        <StatCard label="Categories" value={String(categories.length)} hint="Website collections" icon={<Tags />} color="amber" />
                        <StatCard label="Sub-categories" value={String(subCount)} hint="Nested under categories" icon={<Layers3 />} color="violet" />
                        <StatCard label="On the website" value={String(categories.filter((c) => c.status === "Published").length)} hint="Published collections" icon={<Eye />} color="teal" />
                    </section>

                    <Card className="min-w-0 overflow-hidden">
                        <ol className="min-w-0 divide-y divide-border">
                            {categories.map((category, index) => {
                                const color = palette[cardCycle[index % cardCycle.length]];
                                return (
                                    <li key={category.id} className={`m-3 min-w-0 rounded-2xl border p-4 shadow-sm ${color.tile}`}>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${color.solid}`} aria-hidden="true"><Tags className="size-4" /></span>
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-foreground">{category.title} <span className="ml-1 rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-muted">{category.status}</span></p>
                                                <p className="text-xs text-muted">/website/{category.slug} · {category.courseCount} {category.courseCount === 1 ? "course" : "courses"}</p>
                                            </div>
                                            <Button size="sm" variant="soft-info" aria-label={`Move ${category.title} up`} disabled={index === 0} onClick={() => void move(categories, null, index, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Button>
                                            <Button size="sm" variant="soft-violet" aria-label={`Move ${category.title} down`} disabled={index === categories.length - 1} onClick={() => void move(categories, null, index, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Button>
                                            <Button size="sm" variant="soft-success" aria-label={`${category.status === "Published" ? "Hide" : "Publish"} ${category.title}`} onClick={() => void toggleVisibility(category)}>{category.status === "Published" ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}</Button>
                                            <Button size="sm" variant="soft-info" aria-label={`Edit ${category.title}`} onClick={() => setDrawer({ category })}><Pencil className="size-4" aria-hidden="true" /></Button>
                                            <Button size="sm" variant="soft-danger" aria-label={`Delete ${category.title}`} onClick={() => setRemoving(category)}><Trash2 className="size-4" aria-hidden="true" /></Button>
                                        </div>
                                        <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                                            {category.children.map((child, childIndex) => (
                                                <li key={child.id} className="flex min-w-0 items-center gap-1 rounded-xl border border-current/10 bg-surface/70 px-2 py-1">
                                                    <span className="min-w-0 flex-1 break-words">{child.title}<span className="ml-1 text-xs text-muted">({child.courseCount})</span></span>
                                                    <Button size="sm" variant="soft-info" aria-label={`Move ${child.title} up`} disabled={childIndex === 0} onClick={() => void move(category.children, category.id, childIndex, -1)}><ArrowUp className="size-3.5" aria-hidden="true" /></Button>
                                                    <Button size="sm" variant="soft-violet" aria-label={`Move ${child.title} down`} disabled={childIndex === category.children.length - 1} onClick={() => void move(category.children, category.id, childIndex, 1)}><ArrowDown className="size-3.5" aria-hidden="true" /></Button>
                                                    <Button size="sm" variant="soft-info" aria-label={`Edit ${child.title}`} onClick={() => setDrawer({ category: child })}><Pencil className="size-3.5" aria-hidden="true" /></Button>
                                                    <Button size="sm" variant="soft-danger" aria-label={`Delete sub-category ${child.title}`} onClick={() => setRemoving(child)}><Trash2 className="size-3.5" aria-hidden="true" /></Button>
                                                </li>
                                            ))}
                                            <li><Button size="sm" variant="soft-success" onClick={() => setDrawer({ parent: category })}><Plus className="size-3.5" aria-hidden="true" />Add sub-category</Button></li>
                                        </ul>
                                    </li>
                                );
                            })}
                            {categories.length === 0 ? <li className="p-5 text-sm text-muted">No categories yet. Add one to start the catalog structure.</li> : null}
                        </ol>
                    </Card>
                </>
            )}

            <FormDrawer
                open={drawer !== null}
                title={drawer?.category ? `Edit ${drawer.category.title}` : drawer?.parent ? `Add sub-category to ${drawer.parent.title}` : "Add category"}
                description="Fields marked * are required."
                fields={isSub ? subFields : topFields}
                initial={drawer?.category ? { title: drawer.category.title, slug: drawer.category.slug, shortLabel: drawer.category.shortLabel, description: drawer.category.description, color: drawer.category.color, status: drawer.category.status } : drawer?.parent ? { status: "Published" } : { color: "teal", status: "Published" }}
                submitLabel={drawer?.category ? "Save changes" : "Add category"}
                onClose={() => setDrawer(null)}
                onSubmit={submit}
            />

            <Modal
                open={removing !== null}
                onClose={() => setRemoving(null)}
                title={removing ? `Delete ${removing.title}?` : ""}
                footer={<><Button onClick={() => setRemoving(null)}>Cancel</Button><Button variant="danger" disabled={busy} onClick={() => void remove()}>Delete</Button></>}
            >
                {removing ? <p className="text-sm">A category that still has sub-categories or courses cannot be deleted; archive it instead. This can&apos;t be undone.</p> : null}
            </Modal>
        </>
    );
}
