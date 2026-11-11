"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { SyncButton } from "@/components/SyncButton";

const LINKS = [
  { href: "/search", label: "Каталог", category: "" },
  { href: "/search?category=car", label: "Авто", category: "car" },
  { href: "/search?category=motorcycle", label: "Мото", category: "motorcycle" },
  { href: "/search?category=atv", label: "ATV", category: "atv" },
];

export function Header() {
  const pathname = usePathname();
  const params = useSearchParams();
  const category = params.get("category") || "";

  return (
    <header className="header">
      <Link href="/" className="logo" aria-label="Aucbid, на главную">
        <span className="logo-mark" aria-hidden="true">
          A
        </span>
        <span>Aucbid</span>
      </Link>
      <nav className="nav" aria-label="Разделы">
        {LINKS.map((link) => {
          const active = pathname === "/search" && category === link.category;
          return (
            <Link key={link.href} href={link.href} className={active ? "is-active" : undefined} aria-current={active ? "page" : undefined}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="header-actions">
        <SyncButton />
        <form className="header-search" action="/search" method="get">
          <input name="q" placeholder="VIN или номер лота" aria-label="Поиск по VIN или номеру лота" />
          <button type="submit" aria-label="Найти">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </form>
      </div>
    </header>
  );
}
