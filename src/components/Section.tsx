import { SectionBar } from "./SectionBar";
import styles from "./Section.module.css";

type SectionProps = {
  id: string;
  number: string;
  title: string;
  meta: string;
  children: React.ReactNode;
};

// Layout comum das seções: barra fixa numerada no topo, título à esquerda
// (fixo ao rolar no desktop) e conteúdo à direita. No celular, uma coluna.
export function Section({ id, number, title, meta, children }: SectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-titulo`} data-section>
      <SectionBar number={number} title={title} meta={meta} />
      <div className={`container ${styles.grid}`}>
        <h2 id={`${id}-titulo`} className={styles.title}>
          {title}
        </h2>
        <div>{children}</div>
      </div>
    </section>
  );
}
