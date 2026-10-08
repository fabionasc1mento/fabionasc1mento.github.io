"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Experience.module.css";

export function Experience() {
  const { t } = useLanguage();

  return (
    <Section id="experiencia" title={t.experience.title}>
      <ol className={styles.timeline}>
        {t.experience.jobs.map((job, i) => (
          <li key={job.company} className={styles.job} data-current={i === 0}>
            <p className={styles.period}>{job.period}</p>
            <div>
              <h3 className={styles.company}>{job.company}</h3>
              <p className={styles.role}>{job.role}</p>
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
