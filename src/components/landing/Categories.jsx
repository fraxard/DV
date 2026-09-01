import React from 'react';
import styles from './Categories.module.css';

const categories = [
  { icon: '🏠', label: 'Property', sub: 'Real estate, land, home' },
  { icon: '📊', label: 'Investments', sub: 'Stocks, MF, SIPs' },
  { icon: '🏦', label: 'Financial', sub: 'Bank accounts, FDs' },
  { icon: '📋', label: 'Insurance', sub: 'Life, health, vehicle' },
  { icon: '₿', label: 'Crypto', sub: 'Wallets, private keys' },
  { icon: '🔑', label: 'Passwords', sub: 'Logins, credentials' },
  { icon: '🪙', label: 'Physical Assets', sub: 'Gold, jewellery' },
  { icon: '📁', label: 'Documents', sub: 'PAN, Aadhaar, will' },
  { icon: '💌', label: 'Personal', sub: 'Messages, memories' },
];

export default function Categories() {
  return (
    <section className={styles.section}>
      <div className="container">

        <div className={styles.layout}>
          <div className={styles.left} data-reveal>
            <span className="label">What's Protected</span>
            <h2 className={styles.title}>
              Everything your family<br />will ever need to find.
            </h2>
            <p className={styles.body}>
              Nine structured categories cover the full breadth of a modern
              Indian family's financial and digital life — from property
              papers to crypto wallets.
            </p>
            <a href="/auth?mode=signup" className={`btn btn--primary`}>
              Start Your Vault
            </a>
          </div>

          <div className={styles.grid} data-reveal data-reveal-delay="1">
            {categories.map((cat, i) => (
              <div key={cat.label} className={styles.card}>
                <span className={styles.icon}>{cat.icon}</span>
                <span className={styles.cardLabel}>{cat.label}</span>
                <span className={styles.cardSub}>{cat.sub}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </section>
  );
}