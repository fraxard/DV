import React from 'react';
import styles from './CTA.module.css';

export default function CTA() {
  return (
    <section className={styles.section}>
      <div className="container">
        <div className={styles.inner} data-reveal>

          <div className={styles.content}>
            <h2 className={styles.title}>
              Your legacy deserves<br />more than a folder.
            </h2>
            <p className={styles.sub}>
              Start organising what matters. It takes less than ten minutes 
              to create your vault and assign your first nominee.
            </p>
            <div className={styles.actions}>
              <a href="/auth?mode=signup" className="btn btn--blue btn--lg">
                Create Your Free Vault
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </a>
              <span className={styles.note}>No credit card required</span>
            </div>
          </div>

          <div className={styles.right} aria-hidden="true">
            <div className={styles.card}>
              <div className={styles.cardIcon}>🔒</div>
              <p className={styles.cardText}>Your vault is ready when you are.</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}