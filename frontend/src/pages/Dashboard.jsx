import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './Dashboard.module.css';

const categories = [
  { icon: '🏠', label: 'Property', count: 3, tag: 'Organised', tagType: 'success' },
  { icon: '📊', label: 'Investments', count: 5, tag: 'Organised', tagType: 'success' },
  { icon: '🏦', label: 'Financial', count: 2, tag: 'Review', tagType: 'warning' },
  { icon: '📋', label: 'Insurance', count: 2, tag: 'Organised', tagType: 'success' },
  { icon: '₿', label: 'Crypto', count: 0, tag: 'Add keys', tagType: 'muted' },
  { icon: '🔑', label: 'Passwords', count: 18, tag: 'Organised', tagType: 'success' },
  { icon: '🪙', label: 'Physical', count: 4, tag: 'Organised', tagType: 'success' },
  { icon: '📁', label: 'Documents', count: 7, tag: 'Organised', tagType: 'success' },
  { icon: '💌', label: 'Personal', count: 1, tag: 'Add more', tagType: 'muted' },
];

const recentActivity = [
  { icon: '📊', text: 'Mutual fund added to Investments', time: '2h ago' },
  { icon: '👤', text: 'Nominee Sunita Rao verified', time: '1d ago' },
  { icon: '📋', text: 'LIC policy document uploaded', time: '3d ago' },
  { icon: '🔑', text: '3 new passwords added', time: '5d ago' },
];

const navItems = [
  { id: 'dashboard', label: 'Home' },
  { id: 'vault', label: 'Vault' },
  { id: 'nominees', label: 'Nominees' },
  { id: 'activity', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState('dashboard');

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const readiness = 74;

  return (
    <div className={styles.root}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <a href="/" className={styles.logo}>
            DV<span className={styles.logoDot}>.</span>
          </a>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.notifBtn} aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            <span className={styles.notifDot} />
          </button>
          <button className={styles.avatar} onClick={logout} title="Sign out">
            {initials}
          </button>
        </div>
      </header>

      {/* ── Main scroll area ────────────────────────────────── */}
      <main className={styles.main}>

        {/* Greeting */}
        <section className={styles.greeting}>
          <div>
            <p className={styles.greetLabel}>Good morning,</p>
            <h1 className={styles.greetName}>{user?.name?.split(' ')[0] ?? 'there'} 👋</h1>
          </div>
          <button className={styles.addBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
            Add asset
          </button>
        </section>

        {/* Legacy Readiness card */}
        <section className={styles.readinessCard}>
          <div className={styles.readinessTop}>
            <div>
              <p className={styles.readinessTitle}>Legacy Readiness</p>
              <p className={styles.readinessSub}>3 of 9 categories need attention</p>
            </div>
            <span className={styles.readinessPct}>{readiness}%</span>
          </div>
          <div className={styles.readinessBar}>
            <div className={styles.readinessFill} style={{ width: `${readiness}%` }} />
          </div>
          <div className={styles.readinessTags}>
            <span className={`${styles.rTag} ${styles.rTagWarning}`}>📋 Insurance incomplete</span>
            <span className={`${styles.rTag} ${styles.rTagMuted}`}>₿ Crypto missing</span>
          </div>
        </section>

        {/* Stats strip */}
        <div className={styles.statsStrip}>
          {[
            { num: '42', label: 'Assets' },
            { num: '3', label: 'Nominees' },
            { num: '12', label: 'Documents' },
          ].map((s) => (
            <div key={s.label} className={styles.statCard}>
              <span className={styles.statNum}>{s.num}</span>
              <span className={styles.statLabel}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Vault categories */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Vault</h2>
            <button className={styles.seeAll}>View all</button>
          </div>
          <div className={styles.catGrid}>
            {categories.map((cat) => (
              <div key={cat.label} className={styles.catCard}>
                <div className={styles.catTop}>
                  <span className={styles.catIcon}>{cat.icon}</span>
                  <span className={`${styles.catTag} ${styles[`catTag--${cat.tagType}`]}`}>
                    {cat.tag}
                  </span>
                </div>
                <span className={styles.catLabel}>{cat.label}</span>
                <span className={styles.catCount}>
                  {cat.count > 0 ? `${cat.count} item${cat.count !== 1 ? 's' : ''}` : 'Empty'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Activity</h2>
            <button className={styles.seeAll}>See all</button>
          </div>
          <div className={styles.activityList}>
            {recentActivity.map((item, i) => (
              <div key={i} className={styles.activityRow}>
                <div className={styles.activityIcon}>{item.icon}</div>
                <div className={styles.activityInfo}>
                  <p className={styles.activityText}>{item.text}</p>
                  <span className={styles.activityTime}>{item.time}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.activityChevron}><path d="M9 18l6-6-6-6" /></svg>
              </div>
            ))}
          </div>
        </section>

        {/* Nominees quick glance */}
        <section className={`${styles.section} ${styles.sectionLast}`}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Nominees</h2>
            <button className={styles.seeAll}>Manage</button>
          </div>
          <div className={styles.nomineeList}>
            {[
              { initials: 'SR', name: 'Sunita Rao', rel: 'Spouse', access: 'Full Access', color: '#EEF3FF' },
              { initials: 'AK', name: 'Arjun Kumar', rel: 'Son', access: 'Selected', color: '#F0FDF4' },
              { initials: 'PL', name: 'Priya Lawyers', rel: 'Legal', access: 'Docs only', color: '#FFF7ED' },
            ].map((n, i) => (
              <div key={i} className={styles.nomineeRow}>
                <div className={styles.nomineeAvatar} style={{ background: n.color }}>
                  {n.initials}
                </div>
                <div className={styles.nomineeInfo}>
                  <span className={styles.nomineeName}>{n.name}</span>
                  <span className={styles.nomineeRel}>{n.rel}</span>
                </div>
                <span className={styles.nomineeAccess}>{n.access}</span>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* ── Floating bottom nav ──────────────────────────────── */}
      <nav className={styles.bottomNav} aria-label="Primary navigation">
        <div className={styles.bottomNavInner}>
          <div className={styles.navLogo}>DV.</div>
          {navItems.map((item) => {
            const active = activeNav === item.id;
            return (
              <button
                key={item.id}
                className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                onClick={() => setActiveNav(item.id)}
              >
                {item.label}
              </button>
            );
          })}
          <button className={`${styles.navItem} ${styles.navItemCta}`} onClick={logout}>
            Sign out
          </button>
        </div>
      </nav>
    </div>
  );
}