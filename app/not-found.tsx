import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <div className="empty">
        <h1>Лот не найден</h1>
        <p>Его нет в текущем каталоге или дата торгов уже прошла.</p>
        <Link href="/search">Вернуться к поиску</Link>
      </div>
    </main>
  );
}
