"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { SectionBar } from "./SectionBar";
import { Typewriter } from "./motion/Typewriter";
import styles from "./Contact.module.css";

// Contato como um terminal: fundo preto, título digitado com cursor
// vermelho e os links como "comandos".
export function Contact() {
  const { t } = useLanguage();

  return (
    <footer id="contato" className={styles.contact} aria-labelledby="contato-titulo" data-section data-floating-hide="">
      <SectionBar number="05" title={t.nav.contact} meta={t.sections.contact} dark />
      <div className={`container frame ${styles.inner}`} data-observe>
        <div className={styles.body}>
          <h2 id="contato-titulo" className={`display ${styles.title}`}>
            <span className={styles.prompt} aria-hidden="true">
              &gt;{" "}
            </span>
            <Typewriter text={t.contact.title} speed={60} />
          </h2>
          <p className={`rise ${styles.text}`}>{t.contact.text}</p>
          <ul className={styles.links}>
            {t.contact.links.map((link, i) => (
              <li key={link.label} className="rise" style={{ ["--i" as string]: i + 2 }}>
                <a href={link.href} className={`label ${styles.link}`} target="_blank" rel="noreferrer">
                  <span className="ast" aria-hidden="true">
                    ✱
                  </span>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className={`container frame label ${styles.bottom}`}>
        <p>© {new Date().getFullYear()} Fábio Tarcio</p>
        <p className={styles.exit} aria-hidden="true">
          process exited with code 0
        </p>
        <p>{t.footer}</p>
      </div>
    </footer>
  );
}
