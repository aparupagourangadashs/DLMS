"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Popover } from "./Popover";

type Option<T extends string> = { value: T; label: string; disabled?: boolean };
type Props<T extends string> = Omit<React.ComponentProps<"button">, "value" | "onChange" | "children" | "role"> & {
  value: T;
  options: Option<T>[];
  onValueChange: (value: T) => void;
  placeholder?: string;
  icon?: LucideIcon;
  required?: boolean;
};

export function Select<T extends string>({
  value, options, onValueChange, placeholder = "Select an option",
  icon: Icon, className, id, name, required, disabled, ...props
}: Props<T>) {
  const generatedId = useId();
  const listId = `${id ?? generatedId}-options`;
  const [active, setActive] = useState(0);
  const typed = useRef({ text: "", time: 0 });
  const selected = options.find((option) => option.value === value);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const enabled = options.map((option, index) => option.disabled ? -1 : index).filter((index) => index >= 0);

  return (
    <Popover
      id={listId}
      label={props["aria-label"] ?? "Options"}
      role="listbox"
      matchTriggerWidth
      className={className}
      panelClassName="admin-select-panel"
      trigger={({ open, toggle, close, ref }) => (
        <>
          {name ? <input type="hidden" name={name} value={value} disabled={disabled} /> : null}
          <button
            {...props}
            id={id}
            ref={ref}
            type="button"
            role="combobox"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
            aria-required={required}
            title={selected?.label ?? placeholder}
            disabled={disabled}
            className="admin-select-trigger"
            onClick={() => {
              setActive(selectedIndex >= 0 ? selectedIndex : (enabled[0] ?? 0));
              toggle();
            }}
            onKeyDown={(event) => {
              if (event.key === "Tab") { close(); return; }
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                if (open) {
                  if (options[active] && !options[active].disabled) onValueChange(options[active].value);
                  close();
                } else {
                  setActive(selectedIndex >= 0 ? selectedIndex : (enabled[0] ?? 0));
                  toggle();
                }
                return;
              }
              if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                if (!enabled.length) return;
                const index = enabled.indexOf(active);
                if (!open) {
                  setActive(event.key === "Home" ? enabled[0] : event.key === "End" ? enabled[enabled.length - 1] : selectedIndex >= 0 ? selectedIndex : event.key === "ArrowUp" ? enabled[enabled.length - 1] : enabled[0]);
                  toggle();
                } else {
                  setActive(event.key === "Home" ? enabled[0] : event.key === "End" ? enabled[enabled.length - 1] : enabled[(index + (event.key === "ArrowUp" ? enabled.length - 1 : 1)) % enabled.length]);
                }
                return;
              }
              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
                const now = Date.now();
                typed.current = { text: now - typed.current.time < 700 ? typed.current.text + event.key : event.key, time: now };
                const match = options.findIndex((option) => !option.disabled && option.label.toLocaleLowerCase().startsWith(typed.current.text.toLocaleLowerCase()));
                if (match >= 0) {
                  setActive(match);
                  if (!open) toggle();
                }
              }
            }}
          >
            {Icon ? <Icon className="size-4 shrink-0 text-accent" aria-hidden="true" /> : null}
            <span className={cn("min-w-0 flex-1 truncate text-left", !selected && "text-muted")}>{selected?.label ?? placeholder}</span>
            <ChevronDown className={cn("size-4 shrink-0 text-accent transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        </>
      )}
    >
      {(close, open) => open ? (
        <SelectOptions
          options={options}
          value={value}
          active={active}
          listId={listId}
          onChoose={(option) => {
            onValueChange(option);
            close();
          }}
        />
      ) : null}
    </Popover>
  );
}

function SelectOptions<T extends string>({
  options, value, active, listId, onChoose,
}: { options: Option<T>[]; value: T; active: number; listId: string; onChoose: (value: T) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }, [active]);
  return (
    <div ref={ref} className="admin-select-options">
      {options.length ? options.map((option, index) => (
        <div
          key={option.value}
          id={`${listId}-${index}`}
          role="option"
          aria-selected={option.value === value}
          aria-disabled={option.disabled || undefined}
          data-active={index === active}
          className="admin-select-option"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => { if (!option.disabled) onChoose(option.value); }}
        >
          <span className="min-w-0 flex-1">{option.label}</span>
          {option.value === value ? <Check className="size-4 shrink-0 text-accent" aria-hidden="true" /> : null}
        </div>
      )) : <p className="px-3 py-4 text-sm text-muted">No options available</p>}
    </div>
  );
}
