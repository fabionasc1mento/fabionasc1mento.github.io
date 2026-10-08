import styles from "./SectionBar.module.css";

type SectionBarProps = {
  number: string;
  title: string;
  meta: string;
};

// Barra fina que gruda logo abaixo do cabeçalho enquanto a seção está na tela:
// "01 / Experiência ............ 2022 – hoje"
export function SectionBar({ number, title, meta }: SectionBarProps) {
  return (
    <div className={styles.bar}>
      <div className={`container ${styles.inner}`}>
        <p>
          <span className={styles.number}>{number}</span>
          <span className={styles.slash} aria-hidden="true">
            /
          </span>
          {title}
        </p>
        <p className={styles.meta}>{meta}</p>
      </div>
    </div>
  );
}
