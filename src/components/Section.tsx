import styles from "./Section.module.css";

type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

// Layout comum das seções: título à esquerda (fixo ao rolar no desktop)
// e conteúdo à direita. No celular vira uma coluna só.
export function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={`${id}-titulo`}>
      <div className={`container ${styles.grid}`}>
        <h2 id={`${id}-titulo`} className={styles.title}>
          {title}
        </h2>
        <div>{children}</div>
      </div>
    </section>
  );
}
