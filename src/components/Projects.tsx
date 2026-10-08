"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Projects.module.css";

export function Projects() {
  const { t } = useLanguage();
  const { featured, alpium, small } = t.projects;

  return (
    <Section id="projetos" title={t.projects.title}>
      {/* Estudo de caso principal: problema → solução → resultado */}
      <article className={styles.featured}>
        <header className={styles.featuredHeader}>
          <h3 className={styles.featuredName}>{featured.name}</h3>
          <p className={styles.kind}>{featured.kind}</p>
        </header>
        <ol className={styles.steps}>
          {featured.steps.map((step) => (
            <li key={step.label} className={styles.step}>
              <h4 className={styles.stepLabel}>{step.label}</h4>
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
          <p className={styles.note}>{featured.note}</p>
        </footer>
      </article>

      {/* Trabalho na ALPIUM: só descrição, os sistemas são de clientes */}
      <article className={styles.alpium}>
        <h3 className={styles.name}>{alpium.name}</h3>
        <p>{alpium.text}</p>
        <ul className={styles.points}>
          {alpium.points.map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
        <p className={styles.note}>{alpium.note}</p>
      </article>

      <div className={styles.grid}>
        {small.map((project) => (
          <article key={project.image} className={styles.card}>
            <img
              src={project.image}
              alt={project.imageAlt}
              width={1200}
              height={600}
              loading="lazy"
              className={styles.image}
            />
            <div className={styles.cardBody}>
              <h3 className={styles.name}>{project.name}</h3>
              {project.note && <p className={styles.note}>{project.note}</p>}
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
