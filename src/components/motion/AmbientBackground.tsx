"use client";

import { OceanField } from "../ocean/OceanField";
import styles from "./AmbientBackground.module.css";

// Fundo da página: um oceano em ASCII, com tubarões e cardumes nadando atrás
// de todo o conteúdo, e água que ondula com o mouse (desenho no OceanField).
// Texto fino que fica solto sobre ele usa a classe .tarja (globals.css) para
// manter a leitura. Por cima, linhas de varredura bem leves, como monitor
// antigo.
export function AmbientBackground() {
  return (
    <div className={styles.ambient} aria-hidden="true">
      <OceanField amount={0.5} />
      <div className={styles.scan} />
    </div>
  );
}
