import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, CalendarDays, FileText, FolderOpen, Plus, Search,
  Settings, ShieldCheck, Upload, UsersRound, WalletCards
} from 'lucide-react';
import styles from './WorkspacePage.module.css';

const configs = {
  vault: {
    eyebrow: 'ORGANISE',
    title: 'Your vault',
    description: 'A structured home for the assets, records and information that make up your digital legacy.',
    icon: FolderOpen,
    actions: [['Add asset', '/vault?new=asset', WalletCards], ['Upload document', '/documents?upload=1', Upload]],
    stats: [['24', 'total assets'], ['06', 'categories'], ['03', 'need review']],
    rows: [
      ['Financial accounts', '4 assets', 'Reviewed'],
      ['Investments', '5 assets', 'Reviewed'],
      ['Documents', '12 files', '3 pending'],
      ['Property', '2 assets', 'Reviewed'],
      ['Insurance', '3 policies', '1 renewal'],
      ['Digital accounts', '7 accounts', 'Protected'],
    ],
  },
  nominees: {
    eyebrow: 'PEOPLE',
    title: 'Nominees',
    description: 'Manage the people who should receive or access the parts of your legacy you assign to them.',
    icon: UsersRound,
    actions: [['Add nominee', '/nominees?new=1', UsersRound]],
    stats: [['02', 'nominees'], ['50%', 'primary share'], ['100%', 'allocation']],
    rows: [
      ['Sarah', 'Spouse · 50%', 'Primary'],
      ['John', 'Son · 50%', 'Primary'],
    ],
  },
  activity: {
    eyebrow: 'TIMELINE',
    title: 'Recent activity',
    description: 'A clear record of changes made inside your private legacy workspace.',
    icon: ShieldCheck,
    actions: [],
    stats: [['04', 'recent events'], ['Today', 'last activity'], ['Secure', 'workspace']],
    rows: [
      ['Passport added', 'Documents · Today 02:42 PM', 'Completed'],
      ['Nominee updated', 'People · Today 11:18 AM', 'Completed'],
      ['Insurance policy added', 'Protection · Yesterday', 'Completed'],
      ['Bank account added', 'Financial · 31 Aug', 'Completed'],
    ],
  },
  documents: {
    eyebrow: 'ARCHIVE',
    title: 'Documents',
    description: 'Keep important records organised and ready for the people who may need them later.',
    icon: FileText,
    actions: [['Upload document', '/documents?upload=1', Upload]],
    stats: [['12', 'documents'], ['04', 'identity'], ['03', 'financial']],
    rows: [
      ['Passport', 'Identity · PDF', 'Verified'],
      ['Insurance policy', 'Protection · PDF', 'Review'],
      ['Bank statement', 'Financial · PDF', 'Verified'],
      ['Property deed', 'Legal · PDF', 'Review'],
    ],
  },
  calendar: {
    eyebrow: 'PLAN AHEAD',
    title: 'Legacy calendar',
    description: 'Keep renewals, reviews and important legacy milestones visible in one place.',
    icon: CalendarDays,
    actions: [['Add event', '/calendar?new=1', CalendarDays]],
    stats: [['04', 'scheduled'], ['01', 'this month'], ['03', 'upcoming']],
    rows: [
      ['Review nominees', 'Scheduled · 05', 'Upcoming'],
      ['Insurance renewal', 'Scheduled · 10', 'Upcoming'],
      ['Document review', 'Scheduled · 17', 'Upcoming'],
      ['Legacy check-in', 'Scheduled · 24', 'Upcoming'],
    ],
  },
  settings: {
    eyebrow: 'PREFERENCES',
    title: 'Settings',
    description: 'Manage your workspace preferences and account-level options.',
    icon: Settings,
    actions: [],
    stats: [['Secure', 'session'], ['7 days', 'session window'], ['On', 'notifications']],
    rows: [
      ['Profile', 'Personal information', 'Available'],
      ['Security', 'Session and access', 'Protected'],
      ['Notifications', 'Workspace alerts', 'Enabled'],
      ['Preferences', 'Display options', 'Available'],
    ],
  },
};

export default function WorkspacePage({ section }) {
  const location = useLocation();
  const config = configs[section] || configs.vault;
  const Icon = config.icon;
  const hasNew = new URLSearchParams(location.search).get('new');
  const upload = new URLSearchParams(location.search).get('upload');

  return (
    <div className={styles.shell}>
      <main className={styles.content}>
        <Link to="/dashboard" className={styles.back}><ArrowLeft size={13} /> Dashboard</Link>

        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>{config.eyebrow}</span>
            <h1>{config.title}</h1>
            <p>{config.description}</p>
          </div>
          <div className={styles.headerIcon}><Icon size={19} /></div>
        </header>

        {(hasNew || upload) && (
          <div className={styles.notice}>
            <strong>{upload ? 'Upload flow ready' : 'Create flow ready'}</strong>
            <span>
              This route is wired and ready for the real backend action when we build that feature.
            </span>
          </div>
        )}

        <section className={styles.stats}>
          {config.stats.map(([value, label]) => (
            <div className={styles.stat} key={label}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <span className={styles.kicker}>WORKSPACE</span>
              <h2>{config.title} overview</h2>
            </div>
            <div className={styles.actions}>
              {config.actions.map(([label, to, ActionIcon]) => (
                <Link to={to} className={styles.action} key={label}>
                  <ActionIcon size={13} /> {label}
                </Link>
              ))}
            </div>
          </div>

          <div className={styles.rows}>
            {config.rows.map(([title, meta, status]) => (
              <div className={styles.row} key={`${title}-${meta}`}>
                <div className={styles.rowIcon}><Icon size={14} /></div>
                <div className={styles.rowMain}>
                  <strong>{title}</strong>
                  <span>{meta}</span>
                </div>
                <span className={styles.status}>{status}</span>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.empty}>
          <Search size={15} />
          <div>
            <strong>Frontend route is connected.</strong>
            <span>The next step is replacing these preview records with live API data.</span>
          </div>
        </section>
      </main>

      <nav className={styles.bottomNav}>
        <Link to="/dashboard">DV.</Link>
        <Link className={section === 'vault' ? styles.active : ''} to="/vault">Vault</Link>
        <Link className={section === 'nominees' ? styles.active : ''} to="/nominees">Nominees</Link>
        <Link className={section === 'activity' ? styles.active : ''} to="/activity">Activity</Link>
        <Link className={section === 'documents' ? styles.active : ''} to="/documents">Documents</Link>
        <Link className={section === 'calendar' ? styles.active : ''} to="/calendar">Calendar</Link>
        <Link className={section === 'settings' ? styles.active : ''} to="/settings">Settings</Link>
      </nav>
    </div>
  );
}
