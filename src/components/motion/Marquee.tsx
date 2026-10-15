import styles from "./Marquee.module.css";

// Faixa que rola sem parar com as tecnologias, separadas por ✱.
// O conteúdo é repetido duas vezes para o loop não ter emenda.
export function Marquee({ items, label }: { items: string[]; label: string }) {
  const row = (hidden: boolean) => (
    <ul className={styles.row} aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <li key={`${item}-${i}`}>
          <span className="ast" aria-hidden="true">
            ✱
          </span>
          {item}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.marquee} role="region" aria-label={label}>
      <div className={styles.track}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
