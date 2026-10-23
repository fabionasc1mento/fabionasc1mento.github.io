import { SectionBar } from "./SectionBar";
import { PixelBox } from "./motion/PixelBox";
import { Scramble } from "./motion/Scramble";
import styles from "./Section.module.css";

type SectionProps = {
  id: string;
  number: string;
  title: string;
  meta: string;
  /** Conteúdo ocupa a largura toda (sem a coluna lateral de rótulos) */
  wide?: boolean;
  children: React.ReactNode;
};

// Layout comum das seções: barra fixa numerada, título grande em minúsculas
// numa linha própria (decodifica ao entrar na tela) e, abaixo, uma coluna
// estreita de rótulos ao lado do conteúdo, separadas por linhas do grid.
export function Section({ id, number, title, meta, wide, children }: SectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-titulo`} data-section>
      <SectionBar number={number} title={title} meta={meta} />
      <div className={`container frame ${styles.wrap}`} data-observe>
        <div className={styles.head}>
          <p className={`label tarja ${styles.sec}`}>
            <span aria-hidden="true">✱ </span>sec.{number}
          </p>
          <Scramble as="h2" id={`${id}-titulo`} text={title} className={`display glitch-in ${styles.title}`} duration={800} />
        </div>
        <span className={`draw-x ${styles.hline}`} aria-hidden="true" />
        {wide ? (
          children
        ) : (
        <div className={styles.grid}>
          <aside className={styles.side} aria-hidden="true">
            <div className={styles.sideSticky}>
              <p className="label tarja">{number} / 05</p>
              <PixelBox className={styles.pixels} />
            </div>
          </aside>
          <span className={`draw-y ${styles.divider}`} aria-hidden="true" />
          <div className={styles.content}>{children}</div>
        </div>
        )}
      </div>
    </section>
  );
}
