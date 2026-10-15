"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { ExtractionDemo } from "./ExtractionDemo";
import { GlitchPhoto } from "./motion/GlitchPhoto";
import { PixelBox } from "./motion/PixelBox";
import { SplitLetters } from "./motion/SplitLetters";
import styles from "./Hero.module.css";

export function Hero() {
  const { t } = useLanguage();
  const words = t.hero.lead.split(" ");

  return (
    <section id="topo" className={`container frame ${styles.hero}`} data-reveal>
      {/* Faixa de cima: foto 1-bit, legendas e caixa de pixels */}
      <div className={styles.band}>
        <div className={styles.photo}>
          <GlitchPhoto alt={t.contact.photoAlt} />
        </div>
        <div className={`label ${styles.caption}`}>
          <span>fig.01</span>
          <span className={styles.captionDim}>portfolio / 2026</span>
        </div>
        <PixelBox className={styles.pixels} />
        <div className={`label ${styles.corner}`}>
          <span className="ast">✱</span>
          <span>pt / en</span>
        </div>
        <span className={`draw-y ${styles.vline}`} style={{ left: "33.333%" }} />
        <span className={`draw-y ${styles.vline}`} style={{ left: "75%" }} />
      </div>
      <span className={`draw-x ${styles.hline}`} />

      {/* Nome grande: as letras voam até o cabeçalho conforme a rolagem */}
      <div className={styles.nameRow}>
        <span className={`ast ${styles.astLeft}`} aria-hidden="true">
          ✱
        </span>
        <p className={`display ${styles.name}`}>
          <SplitLetters text={t.hero.name} dataAttr="name-start" />
        </p>
        <span className={`ast ${styles.astRight}`} aria-hidden="true">
          ✱
        </span>
      </div>
      <span className={`draw-x ${styles.hline}`} />

      {/* Título, texto e o bloco vermelho com as ações */}
      <div className={styles.lede}>
        <div className={styles.intro}>
          <h1 className={`rise ${styles.title}`}>{t.hero.title}</h1>
          <p className={styles.lead}>
            {words.map((word, i) => (
              <span key={i} className={`rise ${styles.word}`} style={{ ["--i" as string]: Math.min(i, 14) + 4 }}>
                {word}{" "}
              </span>
            ))}
          </p>
        </div>
        <div className={`wipe-up ${styles.redbox}`}>
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

      <div className={styles.demo}>
        <ExtractionDemo />
      </div>
    </section>
  );
}
