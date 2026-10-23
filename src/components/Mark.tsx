// Monograma FT em linha fina: o F e o T dividem a barra de cima (ligadura)
// e um ponto na cor de destaque fecha a marca. O traço tem espessura fixa
// em pixels de tela (vector-effect), então fica nítido e fino tanto no
// cabeçalho quanto grande na abertura.
type MarkProps = {
  className?: string;
  title?: string;
  /** espessura do traço em px de tela */
  weight?: number;
};

export function Mark({ className, title, weight = 1.5 }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M3 4H21M3 4V20M3 12H10M15 4V20"
        fill="none"
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx="19.5" cy="19" r="1.15" fill="var(--accent)" data-mark-cursor="" />
    </svg>
  );
}
