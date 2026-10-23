"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { ExtractionDemo } from "./ExtractionDemo";
import { PixelBox } from "./motion/PixelBox";
import styles from "./Hero.module.css";

export function Hero() {
  const { t } = useLanguage();

  return (
    <section id="topo" className={`container frame ${styles.hero}`} data-observe>
      {/* Faixa de cima: legenda, caixa de pixels e canto */}
      <div className={styles.band} data-intro="blur">
        <div className={`label ${styles.caption}`}>
          <span>fig.01</span>
          <span className={styles.captionDim}>portfolio / 2026</span>
        </div>
        <div className={styles.pixelCell}>
          <PixelBox className={styles.pixels} />
        </div>
        <div className={`label ${styles.corner}`}>
          <span className="ast">✱</span>
          <span>pt / en</span>
        </div>
      </div>
      <span className={`draw-x ${styles.hline}`} />

      {/* Nome grande */}
      <div className={styles.nameRow} data-intro="blur">
        <span className={`ast ${styles.astLeft}`} aria-hidden="true">
          ✱
        </span>
        <p className={`display ${styles.name}`}>
          {t.hero.name}
        </p>
        <span className={`ast ${styles.astRight}`} aria-hidden="true">
          ✱
        </span>
      </div>
      <span className={`draw-x ${styles.hline}`} />

      {/* Título, texto e o bloco azul com as ações */}
      <div className={styles.lede}>
        <div className={styles.intro} data-intro="blur">
          <h1 className={styles.title}>{t.hero.title}</h1>
        </div>
        <div className={styles.redbox} data-intro="blur">
          <span className={`label ${styles.redLabel}`}>
            <span aria-hidden="true">✱</span> {t.nav.projects} / {t.nav.contact}
          </span>
          <div className={styles.actions}>
            <a href="#projetos" className={`button ${styles.redPrimary}`}>
              {t.hero.ctaProjects}
            </a>
            <a href="#contato" className={`button ${styles.redGhost}`}>
              {t.hero.ctaContact}
            </a>
          </div>
        </div>
        <span className={`draw-y ${styles.vline}`} style={{ left: "62%" }} />
      </div>
      <span className={`draw-x ${styles.hline}`} />

      <div className={styles.demo} data-intro="fade">
        <ExtractionDemo />
      </div>
    </section>
  );
}
