import Link from "next/link";

export function Pagination({ page, pages, query }: { page: number; pages: number; query: string }) {
  if (pages <= 1) return null;
  const href = (next: number) => {
    const params = new URLSearchParams(query);
    if (next > 1) params.set("page", String(next));
    else params.delete("page");
    const value = params.toString();
    return value ? `/search?${value}` : "/search";
  };
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(pages, windowStart + 4);
  const items: number[] = [];
  for (let current = Math.max(1, windowEnd - 4); current <= windowEnd; current += 1) items.push(current);

  return (
    <nav className="pager" aria-label="Страницы">
      <Link href={href(Math.max(1, page - 1))} aria-disabled={page === 1} className={page === 1 ? "is-disabled" : undefined}>
        Назад
      </Link>
      {items.map((item) => (
        <Link key={item} href={href(item)} className={item === page ? "is-current" : undefined} aria-current={item === page ? "page" : undefined}>
          {item}
        </Link>
      ))}
      <Link href={href(Math.min(pages, page + 1))} aria-disabled={page === pages} className={page === pages ? "is-disabled" : undefined}>
        Дальше
      </Link>
    </nav>
  );
}
