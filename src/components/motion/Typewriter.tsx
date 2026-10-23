"use client";

import { useEffect, useRef, useState } from "react";

type TypewriterProps = {
  text: string;
  className?: string;
  /** ms por letra */
  speed?: number;
  /** mostra o cursor azul piscando no fim */
  cursor?: boolean;
};

// Digita o texto letra por letra quando entra na tela, como num terminal.
export function Typewriter({ text, className, speed = 45, cursor = true }: TypewriterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(text);

  useEffect(() => {
    setShown(text);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout>;
    setShown("");
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        let i = 0;
        const step = () => {
          i++;
          setShown(text.slice(0, i));
          if (i < text.length) timer = setTimeout(step, speed);
        };
        timer = setTimeout(step, 250);
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, [text, speed]);

  return (
    <span ref={ref} className={className}>
      <span className="visually-hidden">{text}</span>
      <span aria-hidden="true">{shown}</span>
      {cursor && <span className="cursor" aria-hidden="true" />}
    </span>
  );
}
