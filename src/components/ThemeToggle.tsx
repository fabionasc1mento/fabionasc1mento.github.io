"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./ThemeToggle.module.css";

type Theme = "light" | "dark";

const THEME_COLOR: Record<Theme, string> = { light: "#e3e3e1", dark: "#0f0f0e" };

// Botão claro/escuro. O tema fica no atributo data-theme do <html> (o CSS
// troca as cores a partir dele) e a escolha é salva no navegador.
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [theme, setTheme] = useState<Theme>("dark");

  // O script do layout já aplicou o tema salvo; aqui só lemos qual é
  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const html = document.documentElement;
    html.classList.add("theme-switching");
    html.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[next]);
    try {
      window.localStorage.setItem("theme", next);
    } catch {
      // sem localStorage, a troca vale só até recarregar a página
    }
    window.setTimeout(() => html.classList.remove("theme-switching"), 350);
    setTheme(next);
  };

  return (
    <button
      type="button"
      className={`${styles.toggle} ${className ?? ""}`}
      onClick={toggle}
      aria-label={theme === "dark" ? t.themeSwitch.toLight : t.themeSwitch.toDark}
      data-theme-state={theme}
    >
      {/* Círculo meio cheio: gira meia volta a cada troca */}
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor" />
      </svg>
    </button>
  );
}
