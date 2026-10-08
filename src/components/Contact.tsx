"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import styles from "./Contact.module.css";

export function Contact() {
  const { t } = useLanguage();

  return (
    <footer id="contato" className={styles.contact} aria-labelledby="contato-titulo">
      <div className={`container ${styles.inner}`}>
        <img
          src="/img/fabio.webp"
          alt={t.contact.photoAlt}
          width={640}
          height={800}
          loading="lazy"
          className={styles.photo}
        />
        <div>
          <h2 id="contato-titulo" className={styles.title}>
            {t.contact.title}
          </h2>
          <p className={styles.text}>{t.contact.text}</p>
          <ul className={styles.links}>
            {t.contact.links.map((link) => (
              <li key={link.label}>
                <a href={link.href} className={styles.link} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="container">
        <div className={styles.bottom}>
          <p>© {new Date().getFullYear()} Fábio Tarcio</p>
          <p>{t.footer}</p>
        </div>
      </div>
    </footer>
  );
}
