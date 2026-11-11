import Link from "next/link";
import { categoryLabel, formatMoney, formatOdometer, sourceLabel, translate } from "@/lib/format";
import type { Lot } from "@/lib/types";
import { AuctionTime } from "./AuctionTime";
import { LotImage } from "./LotImage";

export function LotCard({ lot }: { lot: Lot }) {
  const soon = new Date(lot.auctionAt).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  const title = [lot.year || null, lot.make, lot.model].filter(Boolean).join(" ");
  const damage = translate(lot.primaryDamage);
  const price = lot.currentBid != null ? formatMoney(lot.currentBid) : lot.acv != null ? formatMoney(lot.acv) : "";
  const priceLabel = lot.currentBid != null ? "Ставка" : lot.acv != null ? "Оценка" : "";

  return (
    <article className="card">
      <Link href={`/lot/${lot.id}`} className="card-link">
        <div className="card-photo">
          <LotImage src={lot.image} alt={title} />
          <div className="card-badges">
            <span className={`badge badge--${lot.source}`}>{sourceLabel(lot.source)}</span>
            {soon ? <span className="badge badge--soon">Скоро</span> : null}
          </div>
        </div>
        <div className="card-body">
          <p className="card-kicker">{categoryLabel(lot.category)}</p>
          <h3>{title}</h3>
          <AuctionTime iso={lot.auctionAt} soon={soon} />
          <p className="card-meta">{[lot.city || lot.location, lot.state].filter(Boolean).join(", ")}</p>
          <p className="card-meta">{[formatOdometer(lot.odometer, lot.odometerUnit), damage].filter((item) => item && item !== "—").join(" · ") || "Пробег не указан"}</p>
          <p className="card-price">
            {price ? (
              <>
                <span>{priceLabel}</span>
                <strong>{price}</strong>
              </>
            ) : (
              <span>Ставка не объявлена</span>
            )}
          </p>
        </div>
      </Link>
    </article>
  );
}
