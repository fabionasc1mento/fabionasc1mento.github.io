"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { SplitLetters } from "./motion/SplitLetters";
import { Timecode } from "./motion/Timecode";
import styles from "./Header.module.css";

export function Header() {
  const { t, toggle } = useLanguage();

  const links = [
    { href: "#experiencia", label: t.nav.experience },
    { href: "#projetos", label: t.nav.projects },
    { href: "#formacao", label: t.nav.education },
    { href: "#contato", label: t.nav.contact },
  ];

  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <a href="#topo" className={`display ${styles.name}`}>
          <SplitLetters text={t.hero.name} dataAttr="name-end" />
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
        <button type="button" className={`label ${styles.lang}`} onClick={toggle} aria-label={t.langSwitch.aria}>
          {t.langSwitch.label}
        </button>
      </div>
    </header>
  );
}
