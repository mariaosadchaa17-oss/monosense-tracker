"use client";
import { useState } from "react";

const PAGES = ["Головна", "Операції", "Бюджет", "Рахунки", "Накопичення", "Аналітика", "Борги", "Налаштування"];
const MODALS: { id: string; label: string }[] = [
  { id: "expense", label: "Додати витрату/дохід" },
  { id: "account", label: "Новий рахунок" },
  { id: "goal", label: "Нова ціль" },
  { id: "debt", label: "Новий борг" },
  { id: "recurring", label: "Регулярний платіж" },
  { id: "transfer", label: "Переказ / обмін" },
  { id: "budget", label: "Ліміт категорії" },
  { id: "category", label: "Нова категорія" },
  { id: "invite", label: "Запросити учасника" },
  { id: "rate", label: "Власний курс" },
];

export default function DevPage() {
  const [status, setStatus] = useState("");

  async function resetOnboarding() {
    setStatus("Скидаю...");
    const response = await fetch("/api/dev/reset-onboarding", { method: "POST" });
    const result = await response.json();
    setStatus(response.ok ? "Готово, зараз відкриється онбординг" : result.error || "Помилка");
    if (response.ok) window.setTimeout(() => (window.location.href = "/"), 500);
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "32px 20px", fontFamily: "sans-serif" }}>
      <h1 style={{ marginBottom: 4 }}>Dev-панель</h1>
      <p style={{ color: "#888", marginBottom: 24, fontSize: 13 }}>
        Швидкий перехід до будь-якого стану застосунку. Не для звичайних користувачів.
      </p>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>Сторінки</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {PAGES.map((page) => (
            <a
              key={page}
              href={`/?page=${encodeURIComponent(page)}`}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 13, textDecoration: "none", color: "#222" }}
            >
              {page}
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>Модалки</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {MODALS.map((modal) => (
            <a
              key={modal.id}
              href={`/?modal=${modal.id}`}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 13, textDecoration: "none", color: "#222" }}
            >
              {modal.label}
            </a>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 15, marginBottom: 10 }}>Онбординг та вхід</h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <button
            onClick={resetOnboarding}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 13, cursor: "pointer", background: "#fff" }}
          >
            Показати онбординг знову
          </button>
          <a href="/auth" style={{ border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 13, textDecoration: "none", color: "#222" }}>
            Екран входу
          </a>
          <a href="/auth?mode=register" style={{ border: "1px solid #ddd", borderRadius: 8, padding: "8px 12px", fontSize: 13, textDecoration: "none", color: "#222" }}>
            Екран реєстрації
          </a>
          {status && <span style={{ fontSize: 12, color: "#666" }}>{status}</span>}
        </div>
      </section>
    </main>
  );
}
