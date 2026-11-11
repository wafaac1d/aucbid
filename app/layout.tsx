import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Aucbid — авто с торгов IAAI и Copart",
    template: "%s — Aucbid",
  },
  description: "Автомобили, мотоциклы и ATV с аукционов IAAI и Copart, у которых уже назначена дата торгов. Поиск по марке, модели, году, VIN и номеру лота.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={manrope.className}>
        <Suspense fallback={<div className="header header--fallback" />}>
          <Header />
        </Suspense>
        {children}
        <Footer />
      </body>
    </html>
  );
}
