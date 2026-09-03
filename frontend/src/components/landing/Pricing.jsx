import React from 'react';
import styles from './Pricing.module.css';

const plans = [
  {
    name: 'Basic',
    price: '₹999',
    period: 'per year',
    description: 'For individuals who want to start organising their digital legacy.',
    features: [
      'Up to 3 asset categories',
      '1 nominated contact',
      '5 GB secure storage',
      'Email support',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
  {
    name: 'Family',
    price: '₹1,999',
    period: 'per year',
    description: 'For families who want complete coverage and peace of mind.',
    features: [
      'All asset categories',
      'Up to 5 nominees',
      '20 GB secure storage',
      'Document uploads',
      'Priority support',
    ],
    cta: 'Get Started',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Legacy',
    price: '₹4,999',
    period: 'per year',
    description: 'For comprehensive planning that includes legal and professional contacts.',
    features: [
      'Everything in Family',
      'Unlimited nominees',
      '100 GB secure storage',
      'Lawyer integration',
      'Onboarding assistance',
    ],
    cta: 'Get Started',
    highlighted: false,
  },
];

export default function Pricing() {
  return (
    <section className={styles.section} id="pricing">
      <div className="container">

        <div className={styles.header} data-reveal>
          <span className="label">Pricing</span>
          <h2 className={styles.title}>Simple, honest pricing.</h2>
          <p className={styles.sub}>
            No hidden fees. Cancel anytime. Your vault stays active as long as you choose.
          </p>
        </div>

        <div className={styles.grid}>
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`${styles.card} ${plan.highlighted ? styles.cardHighlighted : ''}`}
              data-reveal
              data-reveal-delay={i + 1}
            >
              {plan.badge && (
                <div className={styles.badge}>{plan.badge}</div>
              )}
              <div className={styles.cardTop}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <p className={styles.planDesc}>{plan.description}</p>
              </div>
              <div className={styles.priceRow}>
                <span className={styles.price}>{plan.price}</span>
                <span className={styles.period}>{plan.period}</span>
              </div>
              <div className={styles.divider} />
              <ul className={styles.features}>
                {plan.features.map(f => (
                  <li key={f} className={styles.feature}>
                    <span className={styles.featureCheck} aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="/auth?mode=signup"
                className={`btn btn--lg ${plan.highlighted ? styles.ctaHighlighted : styles.ctaDefault}`}
                style={{width:'100%', marginTop:'auto'}}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>

        <p className={styles.note} data-reveal>
          All plans include a 14-day free trial. No credit card required to start.
        </p>

      </div>
    </section>
  );
}