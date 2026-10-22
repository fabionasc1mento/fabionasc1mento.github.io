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
        {degrees.map((degree, i) => (
          <li key={degree.name} className={styles.degree} data-observe>
            <span className={`draw-x ${styles.rule}`} aria-hidden="true" />
            <h3 className={`display rise ${styles.degreeName}`}>{degree.name}</h3>
            <p className={`label rise ${styles.meta}`} style={{ ["--i" as string]: 1 }}>
              {degree.school}
              <span className={styles.sep} aria-hidden="true">
                {" "}/{" "}
              </span>
              {degree.period}
              {i === 0 && (
                <span className={`ast ${styles.live}`} aria-hidden="true">
                  {" "}●
                </span>
              )}
            </p>
          </li>
        ))}
      </ul>

      <div className={styles.extras} data-observe>
        <div className={`rise ${styles.box}`}>
          <h3 className={`label ${styles.subtitle}`}>
            <span className="ast" aria-hidden="true">
              ✱{" "}
            </span>
            {coursesTitle}
          </h3>
          <ul className={styles.list}>
            {courses.map((course) => (
              <li key={course}>{course}</li>
            ))}
          </ul>
        </div>
        <div className={`rise ${styles.box}`} style={{ ["--i" as string]: 1 }}>
          <h3 className={`label ${styles.subtitle}`}>
            <span className="ast" aria-hidden="true">
              ✱{" "}
            </span>
            {languagesTitle}
          </h3>
          <ul className={styles.list}>
            {languages.map((language) => (
              <li key={language.name} className={styles.language}>
                <span>{language.name}</span>
                <span className={`label ${styles.level}`}>{language.level}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
