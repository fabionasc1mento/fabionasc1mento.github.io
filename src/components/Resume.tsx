"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Resume.module.css";

// Caminho do PDF dentro de /public (o site é estático, então é só um link)
const RESUME_FILE = "/curriculo-fabio-tarcio.pdf";
const RESUME_DOWNLOAD_NAME = "Curriculo_Fabio_Tarcio.pdf";

// Seção do currículo: prévia da página à esquerda (revelada por uma cortina
// e "escaneada" por uma linha vermelha) e, ao lado, o arquivo com os botões
// de baixar e abrir.
export function Resume() {
  const { t } = useLanguage();
  const { resume } = t;

  return (
    <Section id="curriculo" number="04" title={resume.title} meta={t.sections.resume}>
      <div className={styles.layout}>
        <a
          href={RESUME_FILE}
          target="_blank"
          rel="noopener"
          className={`wipe-in ${styles.preview}`}
          data-reveal
          aria-label={resume.open}
        >
          <img
            src="/img/curriculo-preview.webp"
            alt={resume.previewAlt}
            width={640}
            height={906}
            loading="lazy"
          />
          <span className={styles.scan} aria-hidden="true" />
        </a>

        <div className={styles.info} data-reveal>
          <p className={`label rise ${styles.file}`}>
            <span className="ast" aria-hidden="true">
              ✱{" "}
            </span>
            {RESUME_DOWNLOAD_NAME}
          </p>
          <p className={`label rise ${styles.fileInfo}`} style={{ ["--i" as string]: 1 }}>
            {resume.fileInfo}
          </p>
          <span className={`draw-x ${styles.rule}`} aria-hidden="true" />
          <p className={`rise ${styles.text}`} style={{ ["--i" as string]: 2 }}>
            {resume.text}
          </p>
          <div className={`rise ${styles.actions}`} style={{ ["--i" as string]: 3 }}>
            <a href={RESUME_FILE} download={RESUME_DOWNLOAD_NAME} className="button button-primary">
              <span aria-hidden="true">↓</span>
              {resume.download}
            </a>
            <a href={RESUME_FILE} target="_blank" rel="noopener" className="button button-ghost">
              {resume.open}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <p className={`label rise ${styles.note}`} style={{ ["--i" as string]: 4 }}>
            {resume.note}
          </p>
        </div>
      </div>
    </Section>
  );
}
