import Link from "next/link";
import { LotCard } from "@/components/LotCard";
import { SearchForm } from "@/components/SearchForm";
import { categoryCounts, listMakes, listModels, searchLots, yearBounds } from "@/lib/db";
import { formatNumber } from "@/lib/format";
import type { Filters } from "@/lib/types";

export const dynamic = "force-dynamic";

const homeFilters: Filters = {
  category: "car",
  source: "",
  make: "",
  model: "",
  yearFrom: null,
  yearTo: null,
  q: "",
  page: 1,
};

export default function HomePage() {
  const counts = categoryCounts();
  const totalLots = counts.car + counts.motorcycle + counts.atv;
  const upcoming = searchLots({ ...homeFilters, category: "" }, 8);
  const makes = listMakes({ category: "car", source: "" });
  const years = yearBounds({ category: "car", source: "" });
  const cars = searchLots(homeFilters, 1);

  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">IAAI и Copart</p>
          <h1>Лоты с уже назначенной датой торгов</h1>
          <p>Автомобили, мотоциклы и ATV. В каталоге нет позиций без даты аукциона: искать можно по марке, модели, году, VIN и номеру лота.</p>
        </div>
        <SearchForm
          values={homeFilters}
          makes={makes}
          models={[]}
          yearMin={years.min}
          yearTo={years.max}
          total={cars.total}
        />
      </section>

      <section className="section">
        {totalLots === 0 ? (
          <div className="empty">
            <h2>Каталог ещё не собран</h2>
            <p>Запустите синхронизацию, чтобы забрать с IAAI и Copart только лоты с датой торгов:</p>
            <code>npm run sync</code>
          </div>
        ) : (
          <>
            <div className="stats">
              <Link href="/search?category=car">
                <strong>{formatNumber(counts.car)}</strong>
                <span>автомобилей</span>
              </Link>
              <Link href="/search?category=motorcycle">
                <strong>{formatNumber(counts.motorcycle)}</strong>
                <span>мотоциклов</span>
              </Link>
              <Link href="/search?category=atv">
                <strong>{formatNumber(counts.atv)}</strong>
                <span>ATV</span>
              </Link>
            </div>
            <div className="section-head">
              <h2>Ближайшие торги</h2>
              <Link href="/search">Весь каталог</Link>
            </div>
            <div className="cards">
              {upcoming.items.map((lot) => (
                <LotCard key={lot.id} lot={lot} />
              ))}
            </div>
            {makes.length > 0 ? (
              <>
                <div className="section-head">
                  <h2>Марки автомобилей</h2>
                </div>
                <div className="make-cloud">
                  {makes.slice(0, 24).map((make) => (
                    <Link key={make.key} href={`/search?category=car&make=${make.key}`}>
                      {make.name}
                      <span>{make.count}</span>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}
