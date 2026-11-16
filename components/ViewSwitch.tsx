import Link from "next/link";

export function ViewSwitch({ query, view }: { query: string; view: 1 | 2 | 4 }) {
  return (
    <div className="view-switch" role="group" aria-label="Количество в ряду">
      {([1, 2, 4] as const).map((count) => {
        const params = new URLSearchParams(query);
        if (count === 4) params.delete("view");
        else params.set("view", String(count));
        const value = params.toString();
        const active = view === count;
        const label = count === 1 ? "По одному" : count === 2 ? "По два" : "По четыре";
        return (
          <Link key={count} href={value ? `/search?${value}` : "/search"} aria-label={label} aria-current={active ? "true" : undefined} className={active ? "is-active" : undefined}>
            <span className={`view-glyph view-glyph--${count}`} aria-hidden="true">
              {Array.from({ length: count }, (_, index) => (
                <i key={index} />
              ))}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
