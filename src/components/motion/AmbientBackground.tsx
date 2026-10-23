"use client";

import { DitherField } from "./DitherField";
import styles from "./AmbientBackground.module.css";

// Fundo da página: fumaça em dithering 1-bit, bem apagada e lenta, atrás
// de todo o conteúdo (o desenho está no DitherField). Texto fino que fica
// solto sobre ela usa a classe .tarja (globals.css) para manter a leitura.
// Por cima, linhas de varredura bem leves, como monitor antigo.
export function AmbientBackground() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <DitherField fixed interactive amount={0.14} speed={0.22} scale={340} pixel={2} />
      <div className={styles.scan} />
    </div>
  );
}
