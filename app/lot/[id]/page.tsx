import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LotCard } from "@/components/LotCard";
import { LotGallery } from "@/components/LotGallery";
import { getLot, getSale, relatedLots, searchSales } from "@/lib/db";
import type { Sale } from "@/lib/types";
import { auctionPlace, categoryLabel, displayName, formatMoney, formatOdometer, formatOdometerDetail, modelKey, nameKey, sourceLabel, translate, vehicleTitle } from "@/lib/format";
import { AuctionTime } from "@/components/AuctionTime";

export const dynamic = "force-dynamic";

function saleTitle(sale: Sale): string {
  return sale.name.trim() || [sale.year || null, sale.make, sale.model].filter(Boolean).join(" ");
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const id = (await params).id;
  const lot = await getLot(id);
  if (lot) return { title: `${vehicleTitle(lot)}, лот ${lot.lotNumber}` };
  const sale = await getSale(id);
  if (!sale) return { title: "Лот не найден" };
  return { title: `${saleTitle(sale)}, лот ${sale.lotNumber}` };
}

function textValue(value: string): string {
  const text = value.trim();
  if (!text || text === "—") return "";
  return text;
}

function SpecPanel({ rows }: { rows: { label: string; value: ReactNode; price?: boolean }[] }) {
  const visible = rows.filter((row) => row.value !== "" && row.value != null);
  if (visible.length === 0) return null;
  return (
    <dl className="spec-panel">
      {visible.map((row) => (
        <div key={row.label} className={row.price ? "is-price" : undefined}>
          <dt>{row.label}</dt>
          <dd>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ArchivedSale({ sale }: { sale: Sale }) {
  const title = saleTitle(sale);
  const place = auctionPlace(sale);
  const when = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Minsk" }).format(new Date(sale.auctionAt));
  return (
    <main className="page lot-page">
      <header className="lot-head">
        <p className="back">
          <Link href={`/archive?make=${nameKey(sale.make)}&model=${modelKey(sale.model)}`}>← Архив {sale.make}</Link>
        </p>
        <div className="lot-badges">
          <span className={`badge badge--${sale.source}`}>{sourceLabel(sale.source)}</span>
          <span className="badge badge--plain">Архив</span>
        </div>
        <h1>{title}</h1>
      </header>
      <div className="lot-layout">
        <LotGallery lotId={sale.id} source={sale.source} image={sale.image} alt={title} badges={null} />
        <aside className="lot-aside">
          <SpecPanel
            rows={[
              { label: "VIN", value: sale.vin || "Скрыт аукционом" },
              { label: "Год", value: sale.year ? String(sale.year) : "" },
              { label: "Пробег", value: formatOdometerDetail(sale.odometer, sale.odometerUnit) },
              { label: "Документ", value: textValue(displayName(sale.titleDoc)) },
            ]}
          />
          <SpecPanel
            rows={[
              { label: "Аукцион", value: sourceLabel(sale.source) },
              { label: "Номер лота", value: sale.lotNumber },
              { label: "Дата торгов", value: Number.isNaN(new Date(sale.auctionAt).getTime()) ? "" : when },
              { label: "Локация", value: place },
              { label: "Цена продажи", value: sale.price != null ? formatMoney(sale.price) : "Не объявлена", price: true },
            ]}
          />
          <p className="crumbs">Открытая лента аукциона не публикует итоговую цену. Ставку, которая была до торгов, мы ценой продажи не записываем.</p>
          {sale.url ? (
            <a className="external" href={sale.url} target="_blank" rel="noreferrer">
              Открыть лот на {sourceLabel(sale.source)}
            </a>
          ) : null}
        </aside>
      </div>
    </main>
  );
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const lot = await getLot(id);
  if (!lot) {
    const sale = await getSale(id);
    if (!sale) notFound();
    return <ArchivedSale sale={sale} />;
  }
  const title = vehicleTitle(lot);
  const related = await relatedLots(lot);
  const historyMake = nameKey(lot.make);
  const historyModel = modelKey(lot.model);
  const history = historyModel ? await searchSales(historyMake, historyModel, 1, 6) : { items: [], total: 0 };
  const place = auctionPlace(lot);
  const startsIn = new Date(lot.auctionAt).getTime() - Date.now();
  const soon = startsIn > 0 && startsIn < 48 * 60 * 60 * 1000;

  return (
    <main className="page lot-page">
      <header className="lot-head">
        <p className="back">
          <Link href={`/search?category=${lot.category}&make=${nameKey(lot.make)}`}>← {lot.make}</Link>
        </p>
        <div className="lot-badges">
          <span className={`badge badge--${lot.source}`}>{sourceLabel(lot.source)}</span>
          <span className="badge badge--plain">{categoryLabel(lot.category)}</span>
        </div>
        <h1>{title}</h1>
        {lot.series && !title.toLowerCase().includes(lot.series.toLowerCase()) && lot.series.toLowerCase() !== lot.model.toLowerCase() ? <p className="series">{lot.series}</p> : null}
      </header>
      <div className="lot-layout">
        <LotGallery
          lotId={lot.id}
          source={lot.source}
          image={lot.image}
          alt={title}
          badges={
            <div className="card-badges">
              <span className={`badge badge--${lot.source}`}>{sourceLabel(lot.source)}</span>
              {soon ? <span className="badge badge--soon">Скоро</span> : null}
            </div>
          }
        />
        <aside className="lot-aside">
          <SpecPanel
            rows={[
              { label: "VIN", value: lot.vin || "Скрыт аукционом" },
              { label: "Год", value: lot.year ? String(lot.year) : "" },
              { label: "Топливо", value: textValue(translate(lot.fuel)) },
              { label: "Двигатель", value: textValue(lot.engine) },
              { label: "КПП", value: textValue(translate(lot.transmission)) },
              { label: "Привод", value: textValue(translate(lot.drive)) },
              { label: "Цвет", value: textValue(translate(lot.color)) },
            ]}
          />
          <SpecPanel
            rows={[
              { label: "Основное повреждение", value: textValue(translate(lot.primaryDamage)) },
              { label: "Второе повреждение", value: textValue(translate(lot.secondaryDamage)) },
              { label: "Пробег", value: formatOdometerDetail(lot.odometer, lot.odometerUnit) },
              { label: "Состояние", value: textValue(translate(lot.condition)) },
              { label: "Ключи", value: textValue(translate(lot.keys)) },
            ]}
          />
          <SpecPanel
            rows={[
              { label: "Аукцион", value: sourceLabel(lot.source) },
              { label: "Номер лота", value: lot.lotNumber },
              { label: "Stock", value: lot.stockNumber !== lot.lotNumber ? lot.stockNumber : "" },
              { label: "Дата торгов", value: <AuctionTime iso={lot.auctionAt} soon={soon} variant="lot" /> },
              { label: "Документ", value: textValue(displayName(lot.titleDoc)) },
              { label: "Локация", value: place },
              { label: "Дорожка", value: textValue(lot.lane) },
              { label: "Текущая ставка", value: lot.currentBid != null ? formatMoney(lot.currentBid) : "Не объявлена", price: true },
            ]}
          />
          <a className="external" href={lot.url} target="_blank" rel="noreferrer">
            Открыть лот на {sourceLabel(lot.source)}
          </a>
          {historyModel ? (
            <Link className="external" href={`/archive?make=${historyMake}&model=${historyModel}`}>
              История продаж
            </Link>
          ) : null}
        </aside>
      </div>
      {history.items.length > 0 ? (
        <section className="section section--tight">
          <div className="section-head">
            <h2>Уже уходили с торгов</h2>
            <Link href={`/archive?make=${historyMake}&model=${historyModel}`}>Весь архив</Link>
          </div>
          <div className="sales-wrap">
            <table className="sales">
              <thead>
                <tr>
                  <th>Дата</th>
                  <th>Авто</th>
                  <th>Пробег</th>
                  <th>Цена</th>
                </tr>
              </thead>
              <tbody>
                {history.items.map((sale) => (
                  <tr key={sale.id}>
                    <td>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Minsk" }).format(new Date(sale.auctionAt))}</td>
                    <td>
                      <Link href={`/lot/${sale.id}`}>{sale.name || [sale.year || null, sale.make, sale.model].filter(Boolean).join(" ")}</Link>
                    </td>
                    <td>{formatOdometer(sale.odometer, sale.odometerUnit)}</td>
                    <td className="price">{sale.price != null ? formatMoney(sale.price) : "Не объявлена"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      {related.length > 0 ? (
        <section className="section section--tight">
          <div className="section-head">
            <h2>Ещё {lot.make}{lot.year ? ` ${lot.year}` : ""}</h2>
            <Link href={`/search?category=${lot.category}&make=${nameKey(lot.make)}${lot.year ? `&yearFrom=${lot.year}&yearTo=${lot.year}` : ""}`}>Все модели</Link>
          </div>
          <div className="cards">
            {related.map((item) => (
              <LotCard key={item.id} lot={item} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
