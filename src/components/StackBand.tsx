"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Marquee } from "./motion/Marquee";

// Faixa rolante com as tecnologias que já aparecem no site (experiências e
// projetos), sem repetir. Nada novo: só junta o que está nas seções.
export function StackBand() {
  const { t } = useLanguage();
  const all = [
    ...t.experience.jobs.flatMap((job) => job.stack),
    ...t.projects.featured.stack,
    ...t.projects.small.flatMap((project) => project.stack),
  ];
  const unique = Array.from(new Set(all));
  return <Marquee items={unique} label={t.stackLabel} />;
}
