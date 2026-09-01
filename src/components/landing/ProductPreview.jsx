import React from 'react';

import styles from './ProductPreview.module.css';

export default function ProductPreview() {
  return (
    <section className={styles.section}>
      <div className="container">

        <div className={styles.header} data-reveal>
          <span className="label">Product Preview</span>
          <h2 className={styles.title}>
            Your entire legacy, clearly organised.
          </h2>
          <p className={styles.sub}>
            A clean, private space for everything that matters — built to feel calm rather than complicated.
          </p>
        </div>

        {/* Browser mockup */}
        <div className={styles.browser} data-reveal data-reveal-delay="1">
          <div className={styles.browserBar}>
            <div className={styles.browserDots}>
              <span /><span /><span />
            </div>
            <div className={styles.browserUrl}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              app.digivirasat.com/vault
            </div>
          </div>

          <div className={styles.appLayout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
              <div className={styles.sidebarLogo}>DV.</div>

              <nav className={styles.sidebarNav}>
                {[
                  { icon: '▦', label: 'Dashboard', active: false },
                  { icon: '🔒', label: 'Vault', active: true },
                  { icon: '👥', label: 'Nominees', active: false },
                  { icon: '📋', label: 'Activity', active: false },
                ].map(item => (
                  <div key={item.label} className={`${styles.sidebarItem} ${item.active ? styles.sidebarItemActive : ''}`}>
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </nav>

              <div className={styles.sidebarFooter}>
                <div className={styles.sidebarUser}>
                  <div className={styles.sidebarAvatar}>AK</div>
                  <div className={styles.sidebarUserInfo}>
                    <span className={styles.sidebarName}>Ayush K.</span>
                    <span className={styles.sidebarPlan}>Family Plan</span>
                  </div>
                </div>
              </div>
            </aside>

            {/* Main content */}
            <main className={styles.main}>
              {/* Header */}
              <div className={styles.mainHeader}>
                <div>
                  <h3 className={styles.mainTitle}>My Vault</h3>
                  <span className={styles.mainSub}>12 assets · 3 nominees assigned</span>
                </div>
                <div className={styles.mainActions}>
                  <div className={styles.searchBar}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    Search assets...
                  </div>
                  <button className={styles.addBtn}>+ Add Asset</button>
                </div>
              </div>

              {/* Readiness bar */}
              <div className={styles.readiness}>
                <div className={styles.readinessTop}>
                  <span className={styles.readinessLabel}>Legacy Readiness</span>
                  <span className={styles.readinessPct}>94%</span>
                </div>
                <div className={styles.readinessBar}>
                  <div className={styles.readinessFill} style={{width: '94%'}} />
                </div>
              </div>

              {/* Asset grid */}
              <div className={styles.assetGrid}>
                {[
                  { icon: '🏠', label: 'Property', count: '3 assets', tag: 'Organised', tagType: 'success' },
                  { icon: '📊', label: 'Investments', count: '5 assets', tag: 'Organised', tagType: 'success' },
                  { icon: '🏦', label: 'Financial', count: '2 assets', tag: 'Review', tagType: 'warning' },
                  { icon: '📋', label: 'Insurance', count: '2 assets', tag: 'Organised', tagType: 'success' },
                  { icon: '₿', label: 'Crypto', count: '1 asset', tag: 'Add keys', tagType: 'muted' },
                  { icon: '🔑', label: 'Passwords', count: '18 assets', tag: 'Organised', tagType: 'success' },
                ].map((asset, i) => (
                  <div key={i} className={styles.assetCard}>
                    <div className={styles.assetCardTop}>
                      <div className={styles.assetCardIcon}>{asset.icon}</div>
                      <span className={`${styles.assetTag} ${styles['assetTag--' + asset.tagType]}`}>
                        {asset.tag}
                      </span>
                    </div>
                    <span className={styles.assetCardLabel}>{asset.label}</span>
                    <span className={styles.assetCardCount}>{asset.count}</span>
                  </div>
                ))}
              </div>
            </main>
          </div>
        </div>

      </div>
    </section>
  );
}