import React from 'react';
import styles from './Footer.module.css';

const navLinks = [
  { label: 'Product', href: '#product' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
];

const legalLinks = [
  { label: 'Privacy Policy', href: '#' },
  { label: 'Terms of Service', href: '#' },
  { label: 'Help Centre', href: '#' },
];

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">

        <div className={styles.top}>
          <div className={styles.brand}>
            <a href="/" className={styles.logo}>
              DigiVirasat<span className={styles.dot}>.</span>
            </a>
            <p className={styles.tagline}>
              Secure your digital legacy.<br />Protect what matters most.
            </p>
          </div>

          <nav className={styles.nav} aria-label="Footer navigation">
            <div className={styles.navCol}>
              <span className={styles.colTitle}>Product</span>
              {navLinks.map(l => (
                <a key={l.label} href={l.href} className={styles.navLink}>{l.label}</a>
              ))}
            </div>
            <div className={styles.navCol}>
              <span className={styles.colTitle}>Legal</span>
              {legalLinks.map(l => (
                <a key={l.label} href={l.href} className={styles.navLink}>{l.label}</a>
              ))}
            </div>
            <div className={styles.navCol}>
              <span className={styles.colTitle}>Get Started</span>
              <a href="/auth" className={styles.navLink}>Sign In</a>
              <a href="/auth?mode=signup" className={styles.navLink}>Create Account</a>
            </div>
          </nav>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copy}>© 2026 DigiVirasat. All rights reserved.</span>
          <span className={styles.madeIn}>Made for Indian families 🇮🇳</span>
        </div>

      </div>
    </footer>
  );
}