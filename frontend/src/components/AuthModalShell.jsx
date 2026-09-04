import React from 'react';
import { X } from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import styles from './AuthModalShell.module.css';

export default function AuthModalShell({
    children,
    visualEyebrow,
    visualTitle,
    visualDescription,
    visualFooter,
    visualBadge,
    onClose,
    stage = 'verify',
}) {
    return (
        <div className={styles.root}>
            <div className={styles.dashboardBackdrop}>
                <Dashboard />
            </div>

            <div
                className={`${styles.modal} ${stage === 'profile' ? styles.stageForward : ''
                    }`}
            >
                {onClose && (
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <X size={15} />
                    </button>
                )}

                <section className={`${styles.panel} ${styles.formPanel}`}>
                    <div className={styles.formInner}>
                        {children}
                    </div>
                </section>

                <section className={`${styles.panel} ${styles.visualPanel}`}>
                    <div className={styles.visualGrid} />
                    <div className={styles.visualGlow} />

                    <div className={styles.visualContent}>
                        <p className={styles.visualEyebrow}>
                            {visualEyebrow}
                        </p>

                        <h2 className={styles.visualTitle}>
                            {visualTitle}
                        </h2>

                        <p className={styles.visualDescription}>
                            {visualDescription}
                        </p>
                        {visualBadge}
                    </div>

                    {visualFooter && (
                        <div className={styles.visualFooter}>
                            {visualFooter}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}