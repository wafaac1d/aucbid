import Link from "next/link";
import { categoryLabel, formatMoney, formatOdometer, sourceLabel, translate, vehicleTitle } from "@/lib/format";
import type { Lot } from "@/lib/types";
import { AuctionTime } from "./AuctionTime";
import { CardPhotos } from "./CardPhotos";

export function LotCard({ lot }: { lot: Lot }) {
  const startsIn = new Date(lot.auctionAt).getTime() - Date.now();
  const soon = startsIn > 0 && startsIn < 48 * 60 * 60 * 1000;
  const title = vehicleTitle(lot);
  const damage = translate(lot.primaryDamage);
  const price = formatMoney(lot.currentBid ?? 0);
  const href = `/lot/${lot.id}`;

  return (
    <article className="card">
      <div className="card-photo">
        <CardPhotos
          lotId={lot.id}
          source={lot.source}
          image={lot.image}
          alt={title}
          href={href}
          cached={lot.images.length > 1 ? lot.images : []}
          badges={
            <div className="card-badges">
              <span className={`badge badge--${lot.source}`}>{sourceLabel(lot.source)}</span>
              {soon ? <span className="badge badge--soon">Скоро</span> : null}
            </div>
          }
        />
      </div>
      <Link href={href} className="card-link">
        <div className="card-body">
          <p className="card-kicker">{categoryLabel(lot.category)}</p>
          <h3>{title}</h3>
          <AuctionTime iso={lot.auctionAt} soon={soon} />
          <p className="card-meta">{[lot.city || lot.location, lot.state].filter(Boolean).join(", ")}</p>
          <p className="card-meta">{[formatOdometer(lot.odometer, lot.odometerUnit), damage].filter((item) => item && item !== "—").join(" · ") || "Пробег не указан"}</p>
          <p className="card-price">
            <span>Ставка</span>
            <strong>{price}</strong>
          </p>
        </div>
      </Link>
    </article>
  );
}
