"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { ExtractionDemo } from "./ExtractionDemo";
import { SplitLetters } from "./motion/SplitLetters";
import styles from "./Hero.module.css";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section id="topo" className={`container ${styles.hero}`}>
      {/* Nome grande: as letras voam até o cabeçalho conforme a rolagem */}
      <p className={styles.name}>
        <SplitLetters text={t.hero.name} dataAttr="name-start" />
      </p>
      <div className={styles.intro}>
        <h1 className={styles.title}>{t.hero.title}</h1>
        <p className={styles.lead}>{t.hero.lead}</p>
        <div className={styles.actions}>
          <a href="#projetos" className="button button-primary">
            {t.hero.ctaProjects}
          </a>
          <a href="#contato" className="button button-ghost">
            {t.hero.ctaContact}
          </a>
        </div>
      </div>
      <ExtractionDemo />
    </section>
  );
}
