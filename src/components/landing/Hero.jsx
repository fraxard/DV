import React from 'react';
import styles from './Hero.module.css';

export default function Hero() {
  return (
    <section className={styles.hero} aria-label="Hero">
      <div className={styles.layout}>

        {/* Left: text */}
        <div className={styles.content}>
          <div className={styles.label}>
            <span className={styles.labelDot} />
            Digital Legacy Platform
          </div>

          <h1 className={styles.headline}>
            Your life's work, <em>secured</em> for those<br />
            you love.
          </h1>

          <p className={styles.sub}>
            DigiVirasat organises your digital assets, important documents, 
            and final instructions — and delivers them to your trusted nominees, 
            exactly when they need it.
          </p>

          <div className={styles.actions}>
            <a href="/auth?mode=signup" className="btn btn--primary btn--lg">
              Protect Your Legacy
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </a>
            <a href="#how-it-works" className="btn btn--outline btn--lg">See How It Works</a>
          </div>

          <div className={styles.trust}>
            <div className={styles.trustPile}>
              {['AK','RV','MS','PJ','NB'].map(i => (
                <div key={i} className={styles.avatar}>{i}</div>
              ))}
            </div>
            <p className={styles.trustText}>
              Trusted by <strong>10,000+</strong> Indian families
            </p>
          </div>
        </div>

        {/* Right: vault visual */}
        <div className={styles.visual} aria-hidden="true">
          <div className={styles.mockup}>
            <div className={styles.mockupHeader}>
              <div className={styles.mockupDots}>
                <span /><span /><span />
              </div>
              <span className={styles.mockupTitle}>Your Vault</span>
              <span className={styles.mockupBadge}>
                <span className={styles.mockupBadgeDot} />
                Secure
              </span>
            </div>

            <div className={styles.mockupBody}>
              {/* Summary row */}
              <div className={styles.summaryRow}>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryNum}>12</span>
                  <span className={styles.summaryLabel}>Assets</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryNum}>3</span>
                  <span className={styles.summaryLabel}>Nominees</span>
                </div>
                <div className={styles.summaryCard}>
                  <span className={styles.summaryNum}>94%</span>
                  <span className={styles.summaryLabel}>Complete</span>
                </div>
              </div>

              {/* Asset list */}
              <div className={styles.assetList}>
                {[
                  { icon: '🏠', label: 'Property & Real Estate', count: '3 items', color: '#EEF3FF' },
                  { icon: '📊', label: 'Investments & Mutual Funds', count: '5 items', color: '#F0FDF4' },
                  { icon: '🏦', label: 'Bank Accounts & FDs', count: '2 items', color: '#FFF7ED' },
                  { icon: '🔑', label: 'Passwords & Logins', count: '18 items', color: '#FDF4FF' },
                  { icon: '📄', label: 'Insurance Policies', count: '2 items', color: '#F0F9FF' },
                ].map((a, i) => (
                  <div key={i} className={styles.assetRow}>
                    <div className={styles.assetIcon} style={{background: a.color}}>{a.icon}</div>
                    <div className={styles.assetInfo}>
                      <span className={styles.assetLabel}>{a.label}</span>
                      <span className={styles.assetCount}>{a.count}</span>
                    </div>
                    <div className={styles.assetChevron}>›</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className={styles.floatBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            End-to-end protected
          </div>
        </div>
      </div>

      {/* Bottom strip */}
      <div className={styles.strip}>
        <div className="container">
          <div className={styles.stripInner}>
            {[
              { icon: '🔒', text: 'Private by design' },
              { icon: '🇮🇳', text: 'Built for India' },
              { icon: '👨‍👩‍👧', text: 'Nominee-first legacy' },
              { icon: '☁️', text: 'Secure cloud storage' },
            ].map((item, i) => (
              <div key={i} className={styles.stripItem}>
                <span>{item.icon}</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}