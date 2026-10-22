// Monograma FT: as letras dividem a barra de cima (ligadura) e o bloco
// vermelho no canto é um cursor de terminal. Desenhado numa grade 9×9 de
// pixels; as cores vêm do tema (currentColor e --red).
const INK = "M0 0h9v1h-9zM0 1h9v1h-9zM0 2h2v1h-2zM5 2h2v1h-2zM0 3h2v1h-2zM5 3h2v1h-2zM0 4h4v1h-4zM5 4h2v1h-2zM0 5h4v1h-4zM5 5h2v1h-2zM0 6h2v1h-2zM5 6h2v1h-2zM0 7h2v1h-2zM5 7h2v1h-2zM0 8h2v1h-2zM5 8h2v1h-2z";
const CURSOR = "M8 7h1v1h-1zM8 8h1v1h-1z";

type MarkProps = {
  className?: string;
  title?: string;
};

export function Mark({ className, title }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 9 9"
      shapeRendering="crispEdges"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d={INK} fill="currentColor" />
      <path d={CURSOR} fill="var(--red)" data-mark-cursor="" />
    </svg>
  );
}
