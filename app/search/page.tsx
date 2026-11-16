import type { Metadata } from "next";
import { LotCard } from "@/components/LotCard";
import { Pagination } from "@/components/Pagination";
import { SearchForm } from "@/components/SearchForm";
import { ViewSwitch } from "@/components/ViewSwitch";
import { filtersFromParams, filtersToQuery, listMakes, listModels, searchLots, yearBounds } from "@/lib/db";
import { categoryLabel, driveName, formatNumber, fuelName, sourceLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Каталог" };

const PAGE_SIZE = 24;

function listView(value: string | string[] | undefined): 1 | 2 | 4 {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "1" || raw === "2" || raw === "4" ? (Number(raw) as 1 | 2 | 4) : 4;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = filtersFromParams(params);
  const view = listView(params.view);
  const result = searchLots(filters, PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const safePage = Math.min(filters.page, pages);
  const items = safePage === filters.page ? result.items : searchLots({ ...filters, page: safePage }, PAGE_SIZE).items;
  const scope = { category: filters.category, source: filters.source };
  const makes = listMakes(scope);
  const models = listModels({ ...scope, make: filters.make });
  const years = yearBounds(scope);
  const queryParams = new URLSearchParams(filtersToQuery({ ...filters, page: 1 }));
  if (view !== 4) queryParams.set("view", String(view));
  const query = queryParams.toString();

  const crumbs = [
    filters.category ? categoryLabel(filters.category) : "Все категории",
    filters.source ? sourceLabel(filters.source) : "",
    makes.find((make) => make.key === filters.make)?.name || "",
    models.find((model) => model.key === filters.model)?.name || "",
    filters.yearFrom || filters.yearTo ? `${filters.yearFrom || "…"}–${filters.yearTo || "…"}` : "",
    fuelName(filters.fuel),
    driveName(filters.drive),
    filters.milesFrom || filters.milesTo != null
      ? `${filters.milesFrom ? filters.milesFrom.toLocaleString("ru-RU") : "0"}–${filters.milesTo != null ? filters.milesTo.toLocaleString("ru-RU") : "500 000+"} миль`
      : "",
    filters.q ? `«${filters.q}»` : "",
  ].filter(Boolean);

  return (
    <main className="page">
      <SearchForm
        variant="page"
        values={{ ...filters, page: safePage }}
        makes={makes}
        models={models}
        yearMin={years.min}
        yearTo={years.max}
        total={result.total}
        view={view}
      />
      <section className="section section--tight">
        <div className="section-head">
          <div className="result-block">
            <div className="result-line">
              <h1>Найдено {formatNumber(result.total)}</h1>
              <ViewSwitch query={filtersToQuery(filters, safePage)} view={view} />
            </div>
            <p className="crumbs">{crumbs.join(" · ")}</p>
          </div>
        </div>
        {items.length === 0 ? (
          <div className="empty">
            <h2>Таких лотов нет</h2>
            <p>Смените марку, модель, годы или запрос. В каталоге остаются только лоты с датой торгов.</p>
          </div>
        ) : (
          <div className={`cards cards--${view}`}>
            {items.map((lot) => (
              <LotCard key={lot.id} lot={lot} />
            ))}
          </div>
        )}
        <Pagination page={safePage} pages={pages} query={query} />
      </section>
    </main>
  );
}
