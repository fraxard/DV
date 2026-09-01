import React from 'react';
import { useState, useEffect } from 'react';
import styles from './Nav.module.css';

const links = [
  { label: 'Product', href: '#product' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Security', href: '#security' },
  { label: 'Pricing', href: '#pricing' },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const handleLinkClick = () => setMenuOpen(false);

  return (
    <header className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`} role="banner">
      <div className={`container ${styles.inner}`}>

        {/* Logo */}
        <a href="/" className={styles.logo} aria-label="DigiVirasat home">
          DigiVirasat<span className={styles.dot}>.</span>
        </a>

        {/* Desktop links */}
        <nav className={styles.links} aria-label="Primary navigation">
          {links.map(l => (
            <a key={l.label} href={l.href} className={styles.link}>{l.label}</a>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className={styles.actions}>
          <a href="/auth" className={`btn btn--ghost ${styles.signIn}`}>Sign In</a>
          <a href="/auth?mode=signup" className={`btn btn--primary`}>Get Started</a>
        </div>

        {/* Hamburger */}
        <button
          className={styles.hamburger}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen1 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen2 : ''}`} />
          <span className={`${styles.bar} ${menuOpen ? styles.barOpen3 : ''}`} />
        </button>
      </div>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`} aria-hidden={!menuOpen}>
        <nav className={styles.mobileLinks}>
          {links.map(l => (
            <a key={l.label} href={l.href} className={styles.mobileLink} onClick={handleLinkClick}>{l.label}</a>
          ))}
          <div className={styles.mobileDivider} />
          <a href="/auth" className={styles.mobileLink} onClick={handleLinkClick}>Sign In</a>
          <a href="/auth?mode=signup" className={`btn btn--primary btn--lg`} style={{width:'100%',marginTop:'8px'}} onClick={handleLinkClick}>Get Started</a>
        </nav>
      </div>
    </header>
  );
}