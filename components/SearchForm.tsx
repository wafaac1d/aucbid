"use client";

import type { FormEvent } from "react";
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
    const form = event.currentTarget;
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

  function onMakeChange(event: FormEvent<HTMLSelectElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const model = form.elements.namedItem("model") as HTMLSelectElement | null;
    if (model) model.value = "";
    form.requestSubmit();
  }

  return (
    <form key={`${values.category}|${values.source}|${values.make}|${values.model}|${values.yearFrom}|${values.yearTo}|${values.fuel}|${values.drive}|${values.milesFrom}|${values.milesTo}|${values.q}`} className={`search-panel search-panel--${variant}`} action="/search" method="get" onSubmit={onSubmit}>
      <input type="hidden" name="category" defaultValue={values.category} />
      <input type="hidden" name="source" defaultValue={values.source} />
      <input type="hidden" name="fuel" defaultValue={values.fuel} />
      <input type="hidden" name="drive" defaultValue={values.drive} />
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
