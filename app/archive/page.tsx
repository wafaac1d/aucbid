import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/Pagination";
import { listArchiveMakes, listArchiveModels, saleSummary, searchSales } from "@/lib/db";
import { formatMoney, formatNumber, formatOdometer, sourceLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Архив продаж" };

const PAGE_SIZE = 40;

function one(params: Record<string, string | string[] | undefined>, key: string): string {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value || "").trim();
}

function saleDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Дата не указана";
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Minsk" }).format(date);
}

export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const make = one(params, "make");
  const model = one(params, "model");
  const page = Math.max(1, Number(one(params, "page")) || 1);
  const makes = await listArchiveMakes();
  const models = make ? await listArchiveModels(make) : [];
  const makeName = makes.find((item) => item.key === make)?.name || make;
  const modelName = models.find((item) => item.key === model)?.name || model;
  const summary = make && model ? await saleSummary(make, model) : null;
  const result = make && model ? await searchSales(make, model, page, PAGE_SIZE) : null;
  const pages = result ? Math.max(1, Math.ceil(result.total / PAGE_SIZE)) : 1;
  const query = new URLSearchParams();
  if (make) query.set("make", make);
  if (model) query.set("model", model);

  return (
    <main className="page">
      <section className="section">
        <div className="section-head">
          <div>
            <h1>Архив продаж</h1>
            <p className="crumbs">
              {make ? <Link href="/archive">Все марки</Link> : "Выберите марку и модель"}
              {make ? ` · ${makeName}` : ""}
              {model ? ` · ${modelName}` : ""}
            </p>
          </div>
        </div>
        {!make ? (
          makes.length === 0 ? (
            <div className="empty">
              <h2>Продаж ещё нет</h2>
              <p>Когда лот уходит с торгов и у него была ставка, цена сохраняется здесь. По марке и модели можно посмотреть, за сколько такие машины уходили.</p>
            </div>
          ) : (
            <div className="make-cloud">
              {makes.map((item) => (
                <Link key={item.key} href={`/archive?make=${item.key}`}>
                  {item.name}
                  <span>{item.count}</span>
                </Link>
              ))}
            </div>
          )
        ) : !model ? (
          models.length === 0 ? (
            <div className="empty">
              <h2>По этой марке продаж нет</h2>
              <p>
                <Link href="/archive">Вернуться к маркам</Link>
              </p>
            </div>
          ) : (
            <div className="make-cloud">
              {models.map((item) => (
                <Link key={item.key} href={`/archive?make=${make}&model=${item.key}`}>
                  {item.name}
                  <span>
                    {item.count}
                    {item.average != null ? ` · ${formatMoney(item.average)}` : ""}
                  </span>
                </Link>
              ))}
            </div>
          )
        ) : (
          <>
            <div className="archive-stats">
              <div>
                <strong>{formatNumber(summary?.count || 0)}</strong>
                <span>продаж</span>
              </div>
              <div>
                <strong>{formatMoney(summary?.average ?? null)}</strong>
                <span>средняя цена</span>
              </div>
              <div>
                <strong>{formatMoney(summary?.min ?? null)}</strong>
                <span>минимум</span>
              </div>
              <div>
                <strong>{formatMoney(summary?.max ?? null)}</strong>
                <span>максимум</span>
              </div>
            </div>
            {result && result.items.length > 0 ? (
              <div className="sales-wrap">
                <table className="sales">
                  <thead>
                    <tr>
                      <th>Дата</th>
                      <th>Авто</th>
                      <th>Пробег</th>
                      <th>Аукцион</th>
                      <th>Цена</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.items.map((sale) => {
                      const title = sale.name || [sale.year || null, sale.make, sale.model].filter(Boolean).join(" ");
                      return (
                        <tr key={sale.id}>
                          <td>{saleDate(sale.auctionAt)}</td>
                          <td>{sale.url ? <a href={sale.url} target="_blank" rel="noreferrer">{title}</a> : title}</td>
                          <td>{formatOdometer(sale.odometer, sale.odometerUnit)}</td>
                          <td>{sourceLabel(sale.source)}</td>
                          <td className="price">{formatMoney(sale.price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty">
                <h2>Таких продаж нет</h2>
                <p>Для этой модели ещё не сохранена ни одна ставка с завершённых торгов.</p>
              </div>
            )}
            <Pagination page={Math.min(page, pages)} pages={pages} query={query.toString()} path="/archive" />
          </>
        )}
      </section>
    </main>
  );
}
