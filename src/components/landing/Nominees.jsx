import React from 'react';
import styles from './Nominees.module.css';

export default function Nominees() {
  return (
    <section className={styles.section}>
      <div className="container">

        <div className={styles.layout}>

          {/* Visual */}
          <div className={styles.visual} data-reveal aria-hidden="true">
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTitle}>Nominees</span>
                <span className={styles.cardCount}>3 assigned</span>
              </div>

              {[
                { initials: 'SR', name: 'Sunita Rao', rel: 'Spouse', access: 'Full Access', color: '#EEF3FF' },
                { initials: 'AK', name: 'Arjun Kumar', rel: 'Son', access: 'Selected Assets', color: '#F0FDF4' },
                { initials: 'PL', name: 'Priya Law Firm', rel: 'Legal Counsel', access: 'Documents Only', color: '#FFF7ED' },
              ].map((n, i) => (
                <div key={i} className={styles.nomineeRow}>
                  <div className={styles.nomineeAvatar} style={{background: n.color}}>{n.initials}</div>
                  <div className={styles.nomineeInfo}>
                    <span className={styles.nomineeName}>{n.name}</span>
                    <span className={styles.nomineeRel}>{n.rel}</span>
                  </div>
                  <div className={styles.nomineeAccess}>{n.access}</div>
                </div>
              ))}

              <div className={styles.cardFooter}>
                <div className={styles.verificationState}>
                  <div className={styles.verifyDot} />
                  <span>All nominees verified</span>
                </div>
              </div>
            </div>

            {/* Arrow/flow diagram */}
            <div className={styles.flowNote}>
              Access releases only after<br />manual verification
            </div>
          </div>

          {/* Text */}
          <div className={styles.content} data-reveal data-reveal-delay="1">
            <span className="label">Legacy & Nominees</span>
            <h2 className={styles.title}>
              Decide who receives what,<br />and exactly when.
            </h2>
            <p className={styles.body}>
              A nominee is someone you trust to receive access to specific parts 
              of your vault. This could be a spouse with full access, a child 
              with selected documents, or a lawyer who receives only what they 
              need to execute your wishes.
            </p>
            <ul className={styles.list}>
              <li>
                <span className={styles.listCheck}>✓</span>
                <span>Assign different access levels to each nominee</span>
              </li>
              <li>
                <span className={styles.listCheck}>✓</span>
                <span>Nominees only see what you've allowed them to see</span>
              </li>
              <li>
                <span className={styles.listCheck}>✓</span>
                <span>Access is released through a verified process — not automatically</span>
              </li>
              <li>
                <span className={styles.listCheck}>✓</span>
                <span>Update nominees at any time as your life changes</span>
              </li>
            </ul>
            <a href="/auth?mode=signup" className="btn btn--primary">
              Set Up Nominees
            </a>
          </div>

        </div>
      </div>
    </section>
  );
}