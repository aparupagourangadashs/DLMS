import type { FormField, ListConfig } from "./types";

/** Adds database-derived choices (for example categories) to the static filter and form options of a screen. Choices for a field inside a repeat are keyed `repeatKey.fieldKey`. */
export function withOptions(config: ListConfig, options: Record<string, string[]>): ListConfig {
    const merge = (existing: string[] | undefined, extra: string[]) => [...new Set([...(existing ?? []), ...extra])];
    const fill = (field: FormField): FormField => ({
        ...field,
        ...(options[field.key] ? { options: merge(field.options, options[field.key]) } : {}),
        ...(field.itemFields
            ? { itemFields: field.itemFields.map((child) => (options[`${field.key}.${child.key}`] ? { ...child, options: merge(child.options, options[`${field.key}.${child.key}`]) } : child)) }
            : {}),
    });
    return {
        ...config,
        filters: config.filters?.map((filter) => (options[filter.key] ? { ...filter, options: merge(filter.options, options[filter.key]) } : filter)),
        form: config.form ? { ...config.form, fields: config.form.fields.map(fill) } : undefined,
    };
}
