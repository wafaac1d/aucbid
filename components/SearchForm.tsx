"use client";

import type { FormEvent } from "react";
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

function setAndSubmit(form: HTMLFormElement, name: string, value: string) {
  const field = form.elements.namedItem(name) as HTMLInputElement | null;
  if (field) field.value = value;
  if (name === "category" || name === "source" || name === "make") {
    const model = form.elements.namedItem("model") as HTMLSelectElement | null;
    if (model) model.value = "";
  }
  if (name === "category" || name === "source") {
    const make = form.elements.namedItem("make") as HTMLSelectElement | null;
    if (make) make.value = "";
  }
  form.requestSubmit();
}

export function SearchForm({
  values,
  makes,
  models,
  yearMin,
  yearTo,
  total,
  variant = "hero",
}: {
  values: Filters;
  makes: NamedCount[];
  models: NamedCount[];
  yearMin: number;
  yearTo: number;
  total: number;
  variant?: "hero" | "page";
}) {
  const years: number[] = [];
  for (let year = yearTo; year >= yearMin; year -= 1) years.push(year);
  const countLabel = new Intl.NumberFormat("ru-RU").format(total);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    for (const element of Array.from(event.currentTarget.elements)) {
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
        if (!element.value) element.disabled = true;
      }
    }
  }

  function onMakeChange(event: FormEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const model = form.elements.namedItem("model") as HTMLSelectElement | null;
    if (model) model.value = "";
    form.requestSubmit();
  }

  return (
    <form key={`${values.category}|${values.source}|${values.make}|${values.model}|${values.yearFrom}|${values.yearTo}|${values.q}`} className={`search-panel search-panel--${variant}`} action="/search" method="get" onSubmit={onSubmit}>
      <input type="hidden" name="category" defaultValue={values.category} />
      <input type="hidden" name="source" defaultValue={values.source} />
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
        <label>
          Марка
          <select name="make" defaultValue={values.make} aria-label="Марка" onChange={onMakeChange}>
            <option value="">Все марки</option>
            {makes.map((make) => (
              <option key={make.key} value={make.key}>
                {make.name} ({make.count})
              </option>
            ))}
          </select>
        </label>
        <label>
          Модель
          <select name="model" defaultValue={values.model} aria-label="Модель" disabled={!values.make}>
            <option value="">{values.make ? "Все модели" : "Сначала марка"}</option>
            {models.map((model) => (
              <option key={model.key} value={model.key}>
                {model.name} ({model.count})
              </option>
            ))}
          </select>
        </label>
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
