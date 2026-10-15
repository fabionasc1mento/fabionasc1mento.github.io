"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Experience.module.css";

export function Experience() {
  const { t } = useLanguage();

  return (
    <Section id="experiencia" number="01" title={t.experience.title} meta={t.sections.experience}>
      <ol className={styles.timeline}>
        {t.experience.jobs.map((job, i) => (
          <li key={job.company} className={styles.job} data-current={i === 0} data-reveal>
            <span className={`draw-x ${styles.rule}`} aria-hidden="true" />
            <p className={`label rise ${styles.period}`}>
              {i === 0 && (
                <span className={`ast ${styles.live}`} aria-hidden="true">
                  ●{" "}
                </span>
              )}
              {job.period}
            </p>
            <div className="rise" style={{ ["--i" as string]: 1 }}>
              <h3 className={`display ${styles.company}`}>{job.company}</h3>
              <p className={`label ${styles.role}`}>{job.role}</p>
              <p className={styles.description}>{job.description}</p>
              <ul className="stack" aria-label={t.stackLabel}>
                {job.stack.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  );
}
