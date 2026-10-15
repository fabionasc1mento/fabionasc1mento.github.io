import styles from "./GlitchPhoto.module.css";

type GlitchPhotoProps = {
  alt: string;
  className?: string;
};

// Foto em pontilhado 1-bit com "fatias" da versão vermelha que tremem de
// tempos em tempos (e no hover), como sinal de vídeo com interferência.
export function GlitchPhoto({ alt, className }: GlitchPhotoProps) {
  return (
    <div className={`${styles.photo} ${className ?? ""}`}>
      <img src="/img/fabio-dither.png" alt={alt} width={640} height={800} className={styles.base} />
      {[0, 1, 2].map((i) => (
        <div key={i} className={styles.slice} data-slice={i} aria-hidden="true">
          <img src="/img/fabio-red.webp" alt="" width={640} height={800} />
        </div>
      ))}
    </div>
  );
}
