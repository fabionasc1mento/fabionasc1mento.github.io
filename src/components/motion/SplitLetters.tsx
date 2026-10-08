type SplitLettersProps = {
  text: string;
  className?: string;
  letterClassName?: string;
  /** Marca cada letra com data-<attr> para as animações acharem e medirem */
  dataAttr?: string;
};

// Separa o texto em um <span> por letra, para animar letra a letra.
// Leitor de tela lê o texto inteiro (escondido só visualmente) e ignora
// as letras soltas (aria-hidden).
export function SplitLetters({ text, className, letterClassName, dataAttr }: SplitLettersProps) {
  const data = dataAttr ? { [`data-${dataAttr}`]: "" } : {};
  return (
    <span className={className}>
      <span className="visually-hidden">{text}</span>
      {Array.from(text).map((char, i) => (
        <span key={i} aria-hidden="true" className={letterClassName} {...data}>
          {char === " " ? " " : char}
        </span>
      ))}
    </span>
  );
}
