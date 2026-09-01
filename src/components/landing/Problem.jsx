import React from 'react';
import styles from './Problem.module.css';

const problems = [
  {
    num: '01',
    headline: 'Critical documents disappear.',
    body: 'Property papers, insurance policies, and bank records scattered across physical files, email inboxes, and forgotten folders — impossible to find in a crisis.',
  },
  {
    num: '02',
    headline: 'Passwords are lost forever.',
    body: 'Locked devices, inaccessible email accounts, lost cryptocurrency wallets. When access is gone, it\'s gone. Billions in assets become unreachable every year.',
  },
  {
    num: '03',
    headline: 'Investments go unclaimed.',
    body: 'Stocks, mutual funds, and fixed deposits nominees never knew about. Without a clear record, these assets often remain frozen or unclaimed indefinitely.',
  },
  {
    num: '04',
    headline: 'Families carry the burden alone.',
    body: 'At the hardest moment, loved ones are left searching for information that should have been simple to find. This grief compounds into legal confusion and financial loss.',
  },
];

export default function Problem() {
  return (
    <section className={styles.section} id="product">
      <div className="container">

        <div className={styles.header} data-reveal>
          <span className="label">The Problem</span>
          <h2 className={styles.title}>
            Most people leave nothing<br />behind but confusion.
          </h2>
        </div>

        <div className={styles.grid}>
          {problems.map((p, i) => (
            <div key={p.num} className={styles.item} data-reveal data-reveal-delay={i + 1}>
              <span className={styles.num}>{p.num}</span>
              <div className={styles.rule} />
              <h3 className={styles.itemHeadline}>{p.headline}</h3>
              <p className={styles.itemBody}>{p.body}</p>
            </div>
          ))}
        </div>

        <div className={styles.statement} data-reveal>
          <blockquote className={styles.quote}>
            India has 1.4 billion people and almost no structured way to pass on a digital life.
          </blockquote>
        </div>

      </div>
    </section>
  );
}