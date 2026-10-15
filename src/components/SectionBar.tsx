import { Scramble } from "./motion/Scramble";
import styles from "./SectionBar.module.css";

type SectionBarProps = {
  number: string;
  title: string;
  meta: string;
  dark?: boolean;
};

// Barra que gruda logo abaixo do cabeçalho enquanto a seção está na tela:
// "✱ 01 / EXPERIÊNCIA ................ 2022 – HOJE"
export function SectionBar({ number, title, meta, dark }: SectionBarProps) {
  return (
    <div className={styles.bar} data-dark={dark || undefined}>
      <div className={`container frame label ${styles.inner}`}>
        <p>
          <span className="ast" aria-hidden="true">
            ✱{" "}
          </span>
          <span className={styles.number}>{number}</span>
          <span className={styles.slash} aria-hidden="true">
            /
          </span>
          <Scramble text={title} duration={500} />
        </p>
        <Scramble as="p" text={meta} className={styles.meta} duration={600} />
      </div>
    </div>
  );
}
