import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LotCard } from "@/components/LotCard";
import { LotImage } from "@/components/LotImage";
import { getLot, relatedLots } from "@/lib/db";
import { categoryLabel, formatMoney, formatOdometer, nameKey, sourceLabel, translate } from "@/lib/format";
import { AuctionTime } from "@/components/AuctionTime";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lot = getLot((await params).id);
  if (!lot) return { title: "Лот не найден" };
  const title = [lot.year || null, lot.make, lot.model].filter(Boolean).join(" ");
  return { title: `${title}, лот ${lot.lotNumber}` };
}

function Spec({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export default async function LotPage({ params }: { params: Promise<{ id: string }> }) {
  const lot = getLot((await params).id);
  if (!lot) notFound();
  const title = [lot.year || null, lot.make, lot.model].filter(Boolean).join(" ");
  const related = relatedLots(lot);
  const place = [lot.city, lot.state].filter(Boolean).join(", ") || lot.location;
  const soon = new Date(lot.auctionAt).getTime() - Date.now() < 48 * 60 * 60 * 1000;

  return (
    <main className="page lot-page">
      <p className="back">
        <Link href={`/search?category=${lot.category}&make=${nameKey(lot.make)}`}>← {lot.make}</Link>
      </p>
      <div className="lot-grid">
        <div className="photo-frame">
          <LotImage src={lot.image} alt={title} className="lot-photo" />
          <div className="card-badges">
            <span className={`badge badge--${lot.source}`}>{sourceLabel(lot.source)}</span>
            {soon ? <span className="badge badge--soon">Скоро</span> : null}
          </div>
        </div>
        <div className="lot-summary">
          <div className="lot-badges">
            <span className={`badge badge--${lot.source}`}>{sourceLabel(lot.source)}</span>
            <span className="badge badge--plain">{categoryLabel(lot.category)}</span>
          </div>
          <h1>{title}</h1>
          {lot.series && lot.series.toLowerCase() !== lot.model.toLowerCase() ? <p className="series">{lot.series}</p> : null}
          <AuctionTime iso={lot.auctionAt} soon={soon} variant="lot" />
          <p className="lot-place">{place}</p>
          <dl className="price-row">
            <div>
              <dt>Текущая ставка</dt>
              <dd>{lot.currentBid != null ? formatMoney(lot.currentBid) : "Не объявлена"}</dd>
            </div>
            <div>
              <dt>Оценка</dt>
              <dd>{lot.acv != null ? formatMoney(lot.acv) : "—"}</dd>
            </div>
          </dl>
          <a className="external" href={lot.url} target="_blank" rel="noreferrer">
            Открыть лот на {sourceLabel(lot.source)}
          </a>
        </div>
      </div>
      <dl className="specs">
        <Spec label="Номер лота" value={lot.lotNumber} />
        <Spec label="Stock" value={lot.stockNumber !== lot.lotNumber ? lot.stockNumber : ""} />
        <Spec label="VIN" value={lot.vin || "Скрыт аукционом"} />
        <Spec label="Год" value={lot.year ? String(lot.year) : ""} />
        <Spec label="Пробег" value={formatOdometer(lot.odometer, lot.odometerUnit)} />
        <Spec label="Основное повреждение" value={translate(lot.primaryDamage)} />
        <Spec label="Второе повреждение" value={translate(lot.secondaryDamage)} />
        <Spec label="Состояние" value={translate(lot.condition)} />
        <Spec label="Документ" value={translate(lot.titleDoc)} />
        <Spec label="Ключи" value={translate(lot.keys)} />
        <Spec label="Двигатель" value={lot.engine} />
        <Spec label="Топливо" value={translate(lot.fuel)} />
        <Spec label="КПП" value={translate(lot.transmission)} />
        <Spec label="Привод" value={translate(lot.drive)} />
        <Spec label="Цвет" value={translate(lot.color)} />
        <Spec label="Дорожка" value={lot.lane} />
        <Spec label="Площадка" value={lot.location} />
      </dl>
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
