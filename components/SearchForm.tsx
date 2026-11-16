"use client";

import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { driveName, fuelName, MILES_MAX } from "@/lib/format";
import type { Filters, NamedCount } from "@/lib/types";

const TABS = [
  { id: "car", label: "Автомобили" },
  { id: "motorcycle", label: "Мотоциклы" },
  { id: "atv", label: "ATV" },
] as const;

const SOURCES = [
  { id: "", label: "Все аукционы" },
  { id: "copart", label: "Copart" },
  { id: "iaai", label: "IAAI" },
] as const;

const FUELS = ["", "gas", "diesel", "hybrid", "electric"] as const;
const DRIVES = ["", "awd", "rwd", "fwd"] as const;
const MILE_STEPS = [0, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000, 250_000, 300_000, 400_000, 500_000];

function setAndSubmit(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name) as HTMLInputElement | null;
  if (field) field.value = value;
  if (name === "category" || name === "source" || name === "make") {
    const model = form.elements.namedItem("model") as HTMLInputElement | null;
    if (model) model.value = "";
  }
  if (name === "category" || name === "source") {
    const make = form.elements.namedItem("make") as HTMLInputElement | null;
    if (make) make.value = "";
  }
  form.requestSubmit();
}

function applyTyped(form: HTMLFormElement, name: string, items: NamedCount[]) {
  const hidden = form.elements.namedItem(name) as HTMLInputElement | null;
  const visible = form.querySelector(`input[data-suggest="${name}"]`) as HTMLInputElement | null;
  if (!hidden || !visible || visible.disabled) return;
  const typed = visible.value.trim();
  if (!typed) {
    hidden.value = "";
    return;
  }
  const chosen = items.find((item) => item.key === hidden.value);
  if (chosen && chosen.name.toLowerCase() === typed.toLowerCase()) return;
  const needle = typed.toLowerCase();
  const exact = items.find((item) => item.name.toLowerCase() === needle);
  const starts = items.filter((item) => item.name.toLowerCase().startsWith(needle));
  const hit = exact || (starts.length === 1 ? starts[0] : null);
  if (hit) hidden.value = hit.key;
}

function filteredItems(items: NamedCount[], needle: string): NamedCount[] {
  if (!needle) return items;
  const starts: NamedCount[] = [];
  const rest: NamedCount[] = [];
  for (const item of items) {
    const name = item.name.toLowerCase();
    if (name.startsWith(needle)) starts.push(item);
    else if (name.includes(needle)) rest.push(item);
  }
  return [...starts, ...rest];
}

function SuggestField({
  name,
  label,
  items,
  value,
  placeholder,
  disabled,
  onPick,
}: {
  name: string;
  label: string;
  items: NamedCount[];
  value: string;
  placeholder: string;
  disabled?: boolean;
  onPick?: (form: HTMLFormElement) => void;
}) {
  const listId = useId();
  const chosen = items.find((item) => item.key === value);
  const [text, setText] = useState(chosen?.name ?? "");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const visibleRef = useRef<HTMLInputElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const needle = text.trim().toLowerCase();
  const editing = needle !== (chosen?.name.toLowerCase() ?? "");
  const list = editing ? filteredItems(items, needle) : items;
  const options = editing ? list : [{ key: "", name: placeholder, count: 0 }, ...list];

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [cursor, open]);

  function commit(key: string) {
    const hidden = hiddenRef.current;
    const visible = visibleRef.current;
    if (!hidden?.form || !visible) return;
    const next = items.find((item) => item.key === key);
    hidden.value = key;
    visible.value = next?.name ?? "";
    setText(visible.value);
    setOpen(false);
    onPick?.(hidden.form);
    hidden.form.requestSubmit();
  }

  return (
    <label>
      {label}
      <span className={`suggest${open ? " is-open" : ""}`}>
        <input type="hidden" ref={hiddenRef} name={name} defaultValue={value} />
        <input
          ref={visibleRef}
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          data-suggest={name}
          value={text}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          onFocus={(event) => {
            event.currentTarget.select();
            setCursor(0);
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
            setText(chosen?.name ?? "");
          }}
          onChange={(event) => {
            setText(event.target.value);
            setCursor(0);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setCursor((current) => Math.min(current + 1, Math.max(options.length - 1, 0)));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setCursor((current) => Math.max(current - 1, 0));
            } else if (event.key === "Escape") {
              setOpen(false);
              setText(chosen?.name ?? "");
            } else if (event.key === "Enter" && open) {
              event.preventDefault();
              const option = options[cursor];
              if (option) commit(option.key);
            }
          }}
        />
        {open && !disabled ? (
          <span className="suggest-list" id={listId} role="listbox">
            {options.length === 0 ? <span className="suggest-empty">Ничего не найдено</span> : null}
            {options.map((option, index) => (
              <button
                key={option.key || "all"}
                ref={index === cursor ? activeRef : undefined}
                type="button"
                role="option"
                id={`${listId}-${index}`}
                aria-selected={index === cursor}
                className={index === cursor ? "is-active" : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setCursor(index)}
                onClick={() => commit(option.key)}
              >
                {option.name}
                {option.key ? <span>{option.count}</span> : null}
              </button>
            ))}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function SearchForm({
  values,
  makes,
  models,
  yearMin,
  yearTo,
  total,
  variant = "hero",
  view,
}: {
  values: Filters;
  makes: NamedCount[];
  models: NamedCount[];
  yearMin: number;
  yearTo: number;
  total: number;
  variant?: "hero" | "page";
  view?: 1 | 2 | 4;
}) {
  const years: number[] = [];
  for (let year = yearTo; year >= yearMin; year -= 1) years.push(year);
  const countLabel = new Intl.NumberFormat("ru-RU").format(total);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    applyTyped(form, "make", makes);
    const make = form.elements.namedItem("make") as HTMLInputElement | null;
    if (make && make.value !== values.make) {
      const model = form.elements.namedItem("model") as HTMLInputElement | null;
      if (model) model.value = "";
    } else {
      applyTyped(form, "model", models);
    }
    const from = form.elements.namedItem("milesFrom") as HTMLInputElement | null;
    const to = form.elements.namedItem("milesTo") as HTMLInputElement | null;
    if (from && (from.value === "" || Number(from.value) <= 0)) from.disabled = true;
    if (to && to.value === "") to.disabled = true;
    for (const element of Array.from(form.elements)) {
      if (!(element instanceof HTMLInputElement || element instanceof HTMLSelectElement)) continue;
      if (element.name === "milesFrom" || element.name === "milesTo") continue;
      if (!element.value) element.disabled = true;
    }
  }

  return (
    <form key={`${values.category}|${values.source}|${values.make}|${values.model}|${values.yearFrom}|${values.yearTo}|${values.fuel}|${values.drive}|${values.milesFrom}|${values.milesTo}|${values.q}|${view || ""}`} className={`search-panel search-panel--${variant}`} action="/search" method="get" onSubmit={onSubmit}>
      <input type="hidden" name="category" defaultValue={values.category} />
      <input type="hidden" name="source" defaultValue={values.source} />
      <input type="hidden" name="fuel" defaultValue={values.fuel} />
      <input type="hidden" name="drive" defaultValue={values.drive} />
      {view && view !== 4 ? <input type="hidden" name="view" defaultValue={String(view)} /> : null}
      <div className="tabs" role="tablist" aria-label="Категория">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={values.category === tab.id ? "is-active" : undefined}
            aria-pressed={values.category === tab.id}
            onClick={(event) => {
              const form = event.currentTarget.form;
              if (form) setAndSubmit(form, "category", tab.id);
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="source-row">
        <span>Аукцион</span>
        <div className="chips">
          {SOURCES.map((source) => (
            <button
              key={source.id || "all"}
              type="button"
              className={values.source === source.id ? "is-active" : undefined}
              aria-pressed={values.source === source.id}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) setAndSubmit(form, "source", source.id);
              }}
            >
              {source.label}
            </button>
          ))}
        </div>
      </div>
      <div className="fields">
        <SuggestField
          name="make"
          label="Марка"
          items={makes}
          value={values.make}
          placeholder="Все марки"
          onPick={(form) => {
            const model = form.elements.namedItem("model") as HTMLInputElement | null;
            if (model) model.value = "";
          }}
        />
        <SuggestField
          name="model"
          label="Модель"
          items={models}
          value={values.model}
          placeholder={values.make ? "Все модели" : "Сначала марка"}
          disabled={!values.make}
        />
        <label>
          Год от
          <select name="yearFrom" defaultValue={values.yearFrom || ""} aria-label="Год от">
            <option value="">От</option>
            {years.map((year) => (
              <option key={`from-${year}`} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Год до
          <select name="yearTo" defaultValue={values.yearTo || ""} aria-label="Год до">
            <option value="">До</option>
            {years.map((year) => (
              <option key={`to-${year}`} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="source-row">
        <span>Двигатель</span>
        <div className="chips">
          {FUELS.map((fuel) => (
            <button
              key={fuel || "any-fuel"}
              type="button"
              className={values.fuel === fuel ? "is-active" : undefined}
              aria-pressed={values.fuel === fuel}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) setAndSubmit(form, "fuel", fuel);
              }}
            >
              {fuel ? fuelName(fuel) : "Любой"}
            </button>
          ))}
        </div>
      </div>
      <div className="source-row">
        <span>Привод</span>
        <div className="chips">
          {DRIVES.map((drive) => (
            <button
              key={drive || "any-drive"}
              type="button"
              className={values.drive === drive ? "is-active" : undefined}
              aria-pressed={values.drive === drive}
              onClick={(event) => {
                const form = event.currentTarget.form;
                if (form) setAndSubmit(form, "drive", drive);
              }}
            >
              {drive ? driveName(drive).replace(" привод", "") : "Любой"}
            </button>
          ))}
        </div>
      </div>
      <div className="miles">
        <div className="range-head">
          <span>Пробег, мили</span>
        </div>
        <div className="miles-fields">
          <label>
            От
            <input
              name="milesFrom"
              type="number"
              inputMode="numeric"
              min={0}
              max={MILES_MAX}
              step={1000}
              list="mile-steps"
              defaultValue={values.milesFrom ?? ""}
              placeholder="0"
              aria-label="Пробег от, мили"
            />
          </label>
          <label>
            До
            <input
              name="milesTo"
              type="number"
              inputMode="numeric"
              min={0}
              max={MILES_MAX}
              step={1000}
              list="mile-steps"
              defaultValue={values.milesTo ?? ""}
              placeholder="500 000"
              aria-label="Пробег до, мили"
            />
          </label>
        </div>
        <datalist id="mile-steps">
          {MILE_STEPS.map((step) => (
            <option key={step} value={step} />
          ))}
        </datalist>
      </div>
      <div className="query-row">
        <label className="query-label">
          VIN или номер лота
          <input name="q" defaultValue={values.q} placeholder="Например, 1FTZR45 или 46591729" autoComplete="off" />
        </label>
        <button className="submit" type="submit">
          Показать {countLabel}
        </button>
      </div>
    </form>
  );
}
