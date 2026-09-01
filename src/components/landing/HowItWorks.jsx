import React from 'react';
import styles from './HowItWorks.module.css';

const steps = [
  {
    num: '1',
    title: 'Organise',
    body: 'Add your assets, documents, accounts, and passwords into your private vault. Structure everything in one place, clearly categorised.',
    detail: 'Property · Investments · Passwords · Insurance · Documents',
  },
  {
    num: '2',
    title: 'Secure',
    body: 'Your vault is protected and accessible only to you. No one else can view, access, or retrieve your information without your explicit permission.',
    detail: 'Private access · Secure storage · Controlled by you',
  },
  {
    num: '3',
    title: 'Assign',
    body: 'Choose trusted nominees — family, a lawyer, or both. Define exactly what each person can access, and under what circumstances.',
    detail: 'Family · Legal · Granular permissions',
  },
  {
    num: '4',
    title: 'Preserve',
    body: 'When the time comes, DigiVirasat guides your nominees through a verified process to access what they need — clearly and without confusion.',
    detail: 'Verified handover · Step-by-step guidance',
  },
];

export default function HowItWorks() {
  return (
    <section className={styles.section} id="how-it-works">
      <div className="container">

        <div className={styles.header} data-reveal>
          <span className="label">How It Works</span>
          <h2 className={styles.title}>Four steps to complete peace of mind.</h2>
        </div>

        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div key={step.num} className={styles.step} data-reveal data-reveal-delay={i + 1}>
              <div className={styles.stepTop}>
                <span className={styles.stepNum}>{step.num}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
              </div>
              <p className={styles.stepBody}>{step.body}</p>
              <span className={styles.stepDetail}>{step.detail}</span>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}