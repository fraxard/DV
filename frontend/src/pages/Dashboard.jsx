import React from 'react';
import { 
  Bell, Landmark, TrendingUp, Bitcoin, Home, Gem, 
  ShieldCheck, FileText, Key, Mail 
} from 'lucide-react';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  return (
    <div className={styles.dashboardContainer}>
      {/* 1. LEFT SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h2>DV.</h2>
        </div>
        <div className={styles.sidebarBottom}>
          <button className={styles.iconButton}>
            <Bell size={18} />
          </button>
          <button className={styles.profileIcon}>A</button>
        </div>
      </aside>

      {/* MAIN GRID CONTENT */}
      <main className={styles.mainGrid}>
        
        {/* 2. TOP MAIN HERO */}
        <section className={`${styles.card} ${styles.topMain}`}>
          <div className={styles.cardHeader}>
            <h3>Total Wealth & Financial Assets</h3>
            <div className={styles.filterPills}>
              <span className={styles.activePill}>All</span>
              <span>Banks</span>
              <span>Crypto</span>
            </div>
          </div>
          <div className={styles.heroContent}>
            <div className={styles.netWorthBanner}>
              <p>Total Net Worth</p>
              <h1>$1,245,000</h1>
            </div>
            <div className={styles.assetList}>
              <div className={styles.assetItem}>
                <div className={styles.iconWrapper}><Landmark size={18} /></div>
                <div>
                  <h4>Financial</h4>
                  <p>Bank accounts, FDs</p>
                </div>
              </div>
              <div className={styles.assetItem}>
                <div className={styles.iconWrapper}><TrendingUp size={18} /></div>
                <div>
                  <h4>Investments</h4>
                  <p>Stocks, MF, SIPs</p>
                </div>
              </div>
              <div className={styles.assetItem}>
                <div className={styles.iconWrapper}><Bitcoin size={18} /></div>
                <div>
                  <h4>Crypto</h4>
                  <p>Wallets, private keys</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. TOP RIGHT: NOMINEES */}
        <section className={`${styles.card} ${styles.topRight}`}>
          <div className={styles.cardHeader}>
            <h3>Nominees & Access</h3>
            <span className={styles.statusBadge}>100% Covered</span>
          </div>
          <div className={styles.nomineeList}>
            <div className={styles.nomineeCard}>
              <div className={styles.nomineeAvatar}>S</div>
              <div className={styles.nomineeDetails}>
                <h4>Sarah Connor</h4>
                <p>Spouse • 50% Share</p>
              </div>
            </div>
            <div className={styles.nomineeCard}>
              <div className={styles.nomineeAvatar}>J</div>
              <div className={styles.nomineeDetails}>
                <h4>John Connor</h4>
                <p>Son • 50% Share</p>
              </div>
            </div>
          </div>
          <button className={styles.primaryButton}>+ Add Nominee</button>
        </section>

        {/* 4. BOTTOM LEFT */}
        <section className={`${styles.card} ${styles.bottomLeft}`}>
          <div className={styles.cardHeader}>
            <h3>Tangible & Physical</h3>
          </div>
          <div className={styles.categoryContent}>
            <div className={styles.subCategory}>
              <div className={styles.iconWrapper}><Home size={18} /></div>
              <div>
                <h4>Property</h4>
                <p>Real estate, land, home</p>
              </div>
            </div>
            <div className={styles.subCategory}>
              <div className={styles.iconWrapper}><Gem size={18} /></div>
              <div>
                <h4>Physical Assets</h4>
                <p>Gold, jewellery, lockers</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. BOTTOM MID */}
        <section className={`${styles.card} ${styles.bottomMid}`}>
          <div className={styles.cardHeader}>
            <h3>Protection & Vault</h3>
          </div>
          <div className={styles.categoryContent}>
            <div className={styles.subCategory}>
              <div className={styles.iconWrapper}><ShieldCheck size={18} /></div>
              <div>
                <h4>Insurance</h4>
                <p>Life, health, vehicle</p>
              </div>
            </div>
            <div className={styles.subCategory}>
              <div className={styles.iconWrapper}><FileText size={18} /></div>
              <div>
                <h4>Documents</h4>
                <p>PAN, Aadhaar, will</p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. BOTTOM RIGHT */}
        <section className={`${styles.card} ${styles.bottomRight}`}>
          <div className={styles.cardHeader}>
            <h3>Digital & Personal</h3>
          </div>
          <div className={styles.categoryContent}>
            <div className={styles.subCategory}>
              <div className={styles.iconWrapper}><Key size={18} /></div>
              <div>
                <h4>Passwords</h4>
                <p>Logins, credentials, keys</p>
              </div>
            </div>
            <div className={styles.subCategory}>
              <div className={styles.iconWrapper}><Mail size={18} /></div>
              <div>
                <h4>Personal</h4>
                <p>Messages, letters, memories</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 5. BOTTOM NAV BAR - WITH ANIMATIONS */}
      <div className={styles.bottomFloatingNav}>
        <div className={styles.navMenu}>
          <div className={styles.navLogo}>DV.</div>
          <button className={styles.navItemActive}>Home</button>
          <button className={styles.navItem}>Vault</button>
          <button className={styles.navItem}>Nominees</button>
          <button className={styles.navItem}>Activity</button>
          <button className={styles.navItem}>Settings</button>
          <button className={styles.signOutBtn}>Sign out</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;