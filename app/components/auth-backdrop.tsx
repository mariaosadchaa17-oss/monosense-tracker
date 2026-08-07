import { CreditCard, Repeat2 } from "lucide-react";

const FLOATING_CARDS = [
  { style: { top: "14%", left: "16%" }, rotate: -8, label: "Продукти", value: "−₴1 248", tone: "danger" as const },
  { style: { top: "18%", right: "15%" }, rotate: 7, label: "Бюджет", value: "82% виконано", tone: "neutral" as const },
  { style: { bottom: "30%", left: "12%" }, rotate: 5, label: "Зарплата", value: "+₴24 500", tone: "positive" as const },
  { style: { bottom: "26%", right: "13%" }, rotate: -6, label: "Ціль: Резерв", value: "60% накопичено", tone: "neutral" as const },
  { style: { top: "42%", left: "6%" }, rotate: -4, label: "Основна картка", icon: "card" as const },
  { style: { top: "46%", right: "6%" }, rotate: 6, label: "Netflix щомісяця", icon: "repeat" as const },
  { style: { bottom: "14%", left: "32%" }, rotate: 3, label: "Кава", value: "−₴185", tone: "neutral" as const },
];

export function AuthBackdrop() {
  return (
    <div className="auth-v3-backdrop" aria-hidden="true">
      {FLOATING_CARDS.map((card, index) => (
        <div
          key={index}
          className="auth-v3-float-card"
          style={{ ...card.style, "--r": `${card.rotate}deg`, animationDelay: `${index * 0.4}s` } as unknown as React.CSSProperties}
        >
          {card.icon === "card" && <CreditCard size={14} className="auth-v3-float-icon" />}
          {card.icon === "repeat" && <Repeat2 size={14} className="auth-v3-float-icon" />}
          <span className="auth-v3-float-label">{card.label}</span>
          {card.value && (
            <span
              className={
                card.tone === "positive"
                  ? "auth-v3-float-value auth-v3-float-value-positive"
                  : card.tone === "danger"
                  ? "auth-v3-float-value auth-v3-float-value-danger"
                  : "auth-v3-float-value"
              }
            >
              {card.value}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
