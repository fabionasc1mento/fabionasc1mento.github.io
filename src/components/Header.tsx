"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Timecode } from "./motion/Timecode";
import { ThemeToggle } from "./ThemeToggle";
import { Mark } from "./Mark";
import styles from "./Header.module.css";

export function Header() {
  const { t, toggle } = useLanguage();

  const links = [
    { href: "#experiencia", label: t.nav.experience },
    { href: "#projetos", label: t.nav.projects },
    { href: "#formacao", label: t.nav.education },
    { href: "#curriculo", label: t.nav.resume },
    { href: "#contato", label: t.nav.contact },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="#topo" className={`display ${styles.name}`}>
          <Mark className={styles.mark} />
          <span>{t.hero.name}</span>
        </a>
        <nav aria-label={t.nav.aria}>
          <ul className={`label ${styles.links}`}>
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href}>{link.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <Timecode className={`label ${styles.timecode}`} />
        <div className={styles.controls}>
          <ThemeToggle />
          <button type="button" className={`label ${styles.lang}`} onClick={toggle} aria-label={t.langSwitch.aria}>
            {t.langSwitch.label}
          </button>
        </div>
      </div>
    </header>
  );
}
