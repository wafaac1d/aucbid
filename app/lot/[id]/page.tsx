import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LotCard } from "@/components/LotCard";
import { LotGallery } from "@/components/LotGallery";
import { getLot, relatedLots } from "@/lib/db";
import { categoryLabel, displayName, formatMoney, formatOdometerDetail, nameKey, sourceLabel, translate } from "@/lib/format";
import { AuctionTime } from "@/components/AuctionTime";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lot = getLot((await params).id);
  if (!lot) return { title: "Лот не найден" };
  const title = [lot.year || null, lot.make, lot.model].filter(Boolean).join(" ");
  return { title: `${title}, лот ${lot.lotNumber}` };
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

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const lot = getLot((await params).id);
  if (!lot) notFound();
  const title = [lot.year || null, lot.make, lot.model].filter(Boolean).join(" ");
  const related = relatedLots(lot);
  const place = [lot.city, lot.state].filter(Boolean).join(", ") || lot.location;
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
        {lot.series && lot.series.toLowerCase() !== lot.model.toLowerCase() ? <p className="series">{lot.series}</p> : null}
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
        </aside>
      </div>
      {related.length > 0 ? (
        <section className="section section--tight">
          <div className="section-head">
            <h2>Ещё {lot.make}</h2>
            <Link href={`/search?category=${lot.category}&make=${nameKey(lot.make)}`}>Все модели</Link>
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
