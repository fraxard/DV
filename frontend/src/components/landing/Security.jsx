import React from 'react';
import styles from './Security.module.css';

const principles = [
  {
    title: 'Your data belongs to you.',
    body: 'DigiVirasat never sells, shares, or uses your information for any purpose other than securely storing and delivering it to your nominees.',
  },
  {
    title: 'Access is always controlled.',
    body: 'Only you can view or modify your vault. Nominee access is strictly governed by the conditions you set — nothing is released automatically.',
  },
  {
    title: 'Verified handover only.',
    body: 'Any nominee access request goes through a manual verification process. There are no automatic triggers and no false releases.',
  },
  {
    title: 'Private by default.',
    body: 'Your vault contents are not visible to DigiVirasat staff. Our role is to store and facilitate delivery — not to read what you\'ve stored.',
  },
];

export default function Security() {
  return (
    <section className={styles.section} id="security">
      <div className="container">

        <div className={styles.layout}>
          <div className={styles.left} data-reveal>
            <span className="label label--primary" style={{color: 'var(--color-text-inverse-muted)'}}>Security & Privacy</span>
            <h2 className={styles.title}>
              Built on trust,<br />not promises.
            </h2>
            <p className={styles.body}>
              DigiVirasat handles sensitive information that matters to your family's future. 
              We think carefully about how that responsibility should work.
            </p>
            <div className={styles.badge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Private. Protected. Yours.
            </div>
          </div>

          <div className={styles.right}>
            {principles.map((p, i) => (
              <div key={i} className={styles.principle} data-reveal data-reveal-delay={i + 1}>
                <div className={styles.principleCheck}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <div>
                  <h3 className={styles.principleTitle}>{p.title}</h3>
                  <p className={styles.principleBody}>{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}