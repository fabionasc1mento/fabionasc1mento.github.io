"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Mark } from "./Mark";
import styles from "./FloatingBar.module.css";

const RESUME_FILE = "/curriculo-fabio-tarcio.pdf";

// Barra flutuante (landing-motion "floating CTA"): aparece quando o
// manifesto entra na tela e some quando o contato chega, para o contato
// estar sempre a um clique. O runtime cuida de mostrar/esconder e de tirar
// os links do Tab enquanto ela está escondida.
export function FloatingBar() {
  const { t } = useLanguage();
  const whatsapp = t.contact.links.find((link) => link.label === "WhatsApp");

  return (
    <div className={styles.bar} data-floating-cta="" aria-hidden="true">
      <Mark className={styles.mark} />
      <span className={`label ${styles.text}`}>{t.floating.text}</span>
      {whatsapp && (
        <a className={`button button-primary ${styles.action}`} href={whatsapp.href} target="_blank" rel="noreferrer">
          {t.floating.whatsapp}
        </a>
      )}
      <a className={`button button-ghost ${styles.action}`} href={RESUME_FILE} download="Curriculo_Fabio_Tarcio.pdf">
        {t.floating.resume} <span aria-hidden="true">↓</span>
      </a>
    </div>
  );
}
