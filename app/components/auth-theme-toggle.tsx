"use client";
import { useEffect, useState } from "react";

const THEMES = [
  { id: "mulberry-mint", label: "Mulberry mint", logo: "/logo-rivna-mulberry.png" },
  { id: "espresso-cream", label: "Espresso cream", logo: "/logo-rivna-cream.png" },
];

export function AuthThemeToggle() {
  const [theme, setTheme] = useState("mulberry-mint");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("rivna-skin") : null;
    if (saved && THEMES.some((item) => item.id === saved)) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.skin = theme;
    localStorage.setItem("rivna-skin", theme);
  }, [theme]);

  const current = THEMES.find((item) => item.id === theme) || THEMES[0];
  const next = THEMES.find((item) => item.id !== theme) || THEMES[1];

  return (
    <>
      <button
        type="button"
        className="auth-v3-theme-btn"
        onClick={() => setTheme(next.id)}
        aria-label={`Перемкнути на тему ${next.label}`}
        title={next.label}
      >
        <span className="auth-v3-theme-dot" />
      </button>
<<<<<<< HEAD
     <img src={current.logo} alt="rivna" className="auth-v3-logo" width={230} height={127} fetchPriority="high" />
=======
      <img src={current.logo} alt="rivna" className="auth-v3-logo" width={230} height={127} fetchPriority="high" />
>>>>>>> 08db7e078322599d3a1d5876e84a43bf23e80531
    </>
  );
}
