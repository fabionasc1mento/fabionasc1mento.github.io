import { memo } from "react";
import { Mark } from "../Mark";
import styles from "./Preloader.module.css";

// Linhas de "boot" no canto: decoração em forma de comando, iguais nos
// dois idiomas (por isso o componente não depende do idioma e não
// re-renderiza na troca).
const LOG = [
  "$ ssh visitor@fabionasc1mento.github.io",
  "connecting... access granted",
  "> ./portfolio --mode=cybercore",
];

// Abertura encenada (landing-motion, preloader "staged"): só começa depois
// que a página carregou; uma cortina preta recua da esquerda para a direita
// revelando o painel vermelho, com paradas em 30% e 60%, e o contador é
// empurrado para fora pela borda. Na saída o painel desce e a marca sobe,
// enquanto o hero já entra por baixo. Uma vez por sessão (script do <head>).
export const Preloader = memo(function Preloader() {
  return (
    <div
      className={styles.preloader}
      data-preloader="staged"
      data-stops="30,60"
      data-holds="0.16,0.2"
      data-durations="0.6,0.62,1.25"
      data-overshoot="0.28"
      data-hold-end="0.35"
      data-exit-duration="1.05"
      data-max="7000"
      aria-hidden="true"
    >
      <div className={styles.brand} data-preloader-split="">
        <Mark className={styles.mark} />
      </div>

      <div className={`label ${styles.log}`}>
        {LOG.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div data-preloader-curtain="" />
      <span className={styles.rider} data-preloader-rider="" />
      <span className={`display ${styles.count}`} data-preloader-count="">
        0
      </span>
    </div>
  );
});
