"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Projects.module.css";

export function Projects() {
  const { t } = useLanguage();
  const { featured, alpium, small } = t.projects;

  return (
    <Section id="projetos" number="02" title={t.projects.title} meta={t.sections.projects}>
      {/* Estudo de caso principal: problema → solução → resultado */}
      <article className={`wipe-in ${styles.featured}`} data-observe>
        <header className={styles.featuredHeader}>
          <h3 className={`display glitch-in ${styles.featuredName}`}>{featured.name}</h3>
          <p className={`label ${styles.kind}`}>
            <span aria-hidden="true">✱ </span>
            {featured.kind}
          </p>
        </header>
        <ol className={styles.steps} data-reveal-group="" data-stagger="0.12" data-distance="40">
          {featured.steps.map((step, i) => (
            <li key={i} className={styles.step} data-reveal-item="">
              <span className={`label ${styles.stepNumber}`} aria-hidden="true">
                0{i + 1}
              </span>
              <h4 className={`label ${styles.stepLabel}`}>{step.label}</h4>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
        <footer className={styles.featuredFooter}>
          <ul className="stack" aria-label={t.stackLabel}>
            {featured.stack.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className={`label ${styles.note}`}>{featured.note}</p>
        </footer>
      </article>

      {/* Trabalho na ALPIUM: só descrição, os sistemas são de clientes */}
      <article className={styles.alpium} data-reveal="">
        <h3 className={`display ${styles.name}`}>{alpium.name}</h3>
        <p>{alpium.text}</p>
        <ul className={styles.points}>
          {alpium.points.map((point) => (
            <li key={point}>
              <span className="ast" aria-hidden="true">
                ✱
              </span>
              {point}
            </li>
          ))}
        </ul>
        <p className={`label ${styles.note}`}>{alpium.note}</p>
      </article>

      <div className={styles.grid} data-reveal-group="">
        {small.map((project, i) => (
          <article key={project.image} className={styles.card} data-reveal-item="">
            <div className={styles.media}>
              <img src={project.image} alt={project.imageAlt} width={1200} height={600} loading="lazy" />
              <span className={`label ${styles.fig}`} aria-hidden="true">
                fig.0{i + 2}
              </span>
            </div>
            <div className={styles.cardBody}>
              <h3 className={`display ${styles.name}`}>{project.name}</h3>
              {project.note && <p className={`label ${styles.note}`}>{project.note}</p>}
              <p className={styles.cardText}>{project.description}</p>
              <ul className="stack" aria-label={t.stackLabel}>
                {project.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className={styles.links}>
                {project.links.map((link) => (
                  <a key={link.href} href={link.href} className="text-link" target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </p>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}
