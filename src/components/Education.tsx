"use client";

import { useLanguage } from "@/i18n/LanguageProvider";
import { Section } from "./Section";
import styles from "./Education.module.css";

export function Education() {
  const { t } = useLanguage();
  const { degrees, coursesTitle, courses, languagesTitle, languages } = t.education;

  return (
    <Section id="formacao" number="03" title={t.education.title} meta={t.sections.education}>
      <ul className={styles.degrees}>
        {degrees.map((degree) => (
          <li key={degree.name} className={styles.degree}>
            <h3 className={styles.degreeName}>{degree.name}</h3>
            <p className={styles.meta}>
              {degree.school}, {degree.period}
            </p>
          </li>
        ))}
      </ul>

      <div className={styles.extras}>
        <div>
          <h3 className={styles.subtitle}>{coursesTitle}</h3>
          <ul className={styles.list}>
            {courses.map((course) => (
              <li key={course}>{course}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className={styles.subtitle}>{languagesTitle}</h3>
          <ul className={styles.list}>
            {languages.map((language) => (
              <li key={language.name}>
                {language.name} <span className={styles.meta}>{language.level}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
