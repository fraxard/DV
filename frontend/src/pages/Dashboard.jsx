import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  FileText,
  FolderOpen,
  Home,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Plus,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import styles from './Dashboard.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const categories = [
  { name: 'Financial', count: 4, icon: Landmark },
  { name: 'Investments', count: 5, icon: TrendingUp },
  { name: 'Documents', count: 12, icon: FileText },
  { name: 'Property', count: 2, icon: Home },
  { name: 'Insurance', count: 3, icon: ShieldCheck },
  { name: 'Digital', count: 7, icon: KeyRound },
];

const activity = [
  { time: '02:42 PM', title: 'Passport added', meta: 'Documents', icon: FileText },
  { time: '11:18 AM', title: 'Nominee updated', meta: 'People', icon: UsersRound },
  { time: 'Yesterday', title: 'Insurance policy added', meta: 'Protection', icon: ShieldCheck },
  { time: '31 Aug', title: 'Bank account added', meta: 'Financial', icon: Landmark },
];

const todayItems = [
  { title: 'Review nominee allocation', meta: 'Nominees', done: false },
  { title: 'Check insurance renewal', meta: 'Protection', done: false },
  { title: 'Upload missing document', meta: 'Documents', done: false },
];

const calendarEvents = {
  5: [{ label: 'Review nominees', type: 'review' }],
  10: [{ label: 'Insurance renewal', type: 'renewal' }],
  17: [{ label: 'Document review', type: 'review' }],
  24: [{ label: 'Legacy check-in', type: 'legacy' }],
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function buildCalendar(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
  while (cells.length % 7 !== 0) cells.push(null);

  return cells;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const now = new Date();
  const [calendarDate, setCalendarDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [nomineeSummary, setNomineeSummary] = useState({
    total_nominees: 0,
    total_assets: 0,
    nominees: [],
  });
  const [loadingNominees, setLoadingNominees] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchDashboardNominees = async () => {
      try {
        setLoadingNominees(true);
        const res = await fetch(`${API_URL}/nominees/dashboard-summary`, {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setNomineeSummary(data);
          }
        }
      } catch (err) {
        console.error('Failed to load dashboard nominees:', err);
      } finally {
        if (isMounted) {
          setLoadingNominees(false);
        }
      }
    };

    fetchDashboardNominees();
    return () => {
      isMounted = false;
    };
  }, []);
  const location = useLocation();
  const activeNav = location.pathname === '/dashboard' ? 'Home'
    : location.pathname.startsWith('/vault') ? 'Vault'
      : location.pathname.startsWith('/nominees') ? 'Nominees'
        : location.pathname.startsWith('/activity') ? 'Activity'
          : location.pathname.startsWith('/documents') ? 'Documents'
            : location.pathname.startsWith('/settings') ? 'Settings'
              : 'Home';

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const calendar = useMemo(() => buildCalendar(year, month), [year, month]);

  const selectedEvents =
    month === now.getMonth() && year === now.getFullYear()
      ? calendarEvents[selectedDay] || []
      : [];

  const changeMonth = (delta) => {
    setCalendarDate(new Date(year, month + delta, 1));
    setSelectedDay(1);
  };

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.ambientGlow} />

      {/* Compact workspace rail */}
      <aside className={styles.sidebar} aria-label="Workspace navigation">
        <div className={styles.sidebarTop}>
          <Link className={styles.logoMark} to="/dashboard" aria-label="DigiVirasat dashboard">DV</Link>

          <Link
            className={`${styles.railButton} ${activeNav === 'Home' ? styles.railButtonActive : ''}`}
            to="/dashboard"
            aria-label="Home"
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Vault' ? styles.railButtonActive : ''}`}
            to="/vault"
            aria-label="Vault"
          >
            <FolderOpen size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Nominees' ? styles.railButtonActive : ''}`}
            to="/nominees"
            aria-label="Nominees"
          >
            <UsersRound size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Activity' ? styles.railButtonActive : ''}`}
            to="/activity"
            aria-label="Activity"
          >
            <ListChecks size={15} strokeWidth={1.8} />
          </Link>
          <Link
            className={`${styles.railButton} ${activeNav === 'Documents' ? styles.railButtonActive : ''}`}
            to="/documents"
            aria-label="Documents"
          >
            <FileText size={15} strokeWidth={1.8} />
          </Link>
        </div>

        <div className={styles.sidebarBottom}>
          <Link className={styles.railButton} to="/activity" aria-label="Notifications">
            <Bell size={15} strokeWidth={1.8} />
          </Link>
          <Link className={styles.profileIcon} to="/settings" aria-label="Profile">
            {(user?.full_name || user?.name || 'A').charAt(0).toUpperCase()}
          </Link>
        </div>
      </aside>

      <main className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>PERSONAL LEGACY / HOME</span>
            <h1>Your digital legacy</h1>
          </div>
          <div className={styles.headerMeta}>
            <span><Clock3 size={12} /> Last reviewed today</span>
            <span className={styles.securePill}><ShieldCheck size={12} /> Secure</span>
          </div>
        </div>

        <div className={styles.mainGrid}>
          {/* Hero */}
          <section className={`${styles.card} ${styles.heroCard}`}>
            <div className={styles.heroPattern} />
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>YOUR LEGACY</span>
                <h2>Good evening.</h2>
              </div>
              <div className={styles.heroSpark}><Sparkles size={14} /></div>
            </div>

            <div className={styles.heroMiddle}>
              <p>Your digital legacy is taking shape.</p>
              <div className={styles.heroScoreRow}>
                <strong>68<span>%</span></strong>
                <div>
                  <span>LEGACY READY</span>
                  <small>3 things need your attention</small>
                </div>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressValue} style={{ width: '68%' }} />
              </div>
            </div>

            <div className={styles.heroFooter}>
              <div><strong>24</strong><span>assets</span></div>
              <div><strong>06</strong><span>categories</span></div>
              <div><strong>{String(nomineeSummary.total_nominees).padStart(2, '0')}</strong><span>nominees</span></div>
              <Link className={styles.darkAction} to="/vault">Continue <ChevronRight size={12} /></Link>
            </div>
          </section>

          {/* Nominees */}
          <section className={`${styles.card} ${styles.nomineeCardPanel}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>PEOPLE</span>
                <h3>Nominees</h3>
              </div>
              <span className={styles.countPill}>
                {String(nomineeSummary.total_nominees).padStart(2, '0')}
              </span>
            </div>

            <div className={styles.nomineeList}>
              {loadingNominees ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#8c938e', fontSize: '11px' }}>
                  Loading nominees...
                </div>
              ) : nomineeSummary.nominees.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#8c938e', fontSize: '11px' }}>
                  No nominees yet. Add your trusted beneficiaries.
                </div>
              ) : (
                nomineeSummary.nominees.map((n, idx) => (
                  <div className={styles.personRow} key={n.id}>
                    <div className={`${styles.avatar} ${idx % 2 === 1 ? styles.avatarAlt : ''}`}>
                      {(n.full_name || 'N').charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.personInfo}>
                      <strong>{n.full_name}</strong>
                      <span>{n.relationship}</span>
                    </div>
                    <span className={styles.share}>
                      {parseFloat(Number(n.overall_share || 0).toFixed(2))}%
                    </span>
                  </div>
                ))
              )}
            </div>

            <Link className={styles.textAction} to="/nominees?new=1"><Plus size={12} /> Add nominee</Link>
          </section>

          {/* Calendar */}
          <section className={`${styles.card} ${styles.calendarCard}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>PLAN AHEAD</span>
                <h3>Legacy calendar</h3>
              </div>
              <CalendarDays size={15} className={styles.mutedIcon} />
            </div>

            <div className={styles.calendarToolbar}>
              <strong>{monthNames[month]} {year}</strong>
              <div>
                <button onClick={() => changeMonth(-1)} aria-label="Previous month"><ChevronLeft size={13} /></button>
                <button onClick={() => changeMonth(1)} aria-label="Next month"><ChevronRight size={13} /></button>
              </div>
            </div>

            <div className={styles.weekdays}>
              {weekdayNames.map((day) => <span key={day}>{day}</span>)}
            </div>

            <div className={styles.calendarGrid}>
              {calendar.map((day, index) => {
                const hasEvent = day && month === now.getMonth() && year === now.getFullYear() && calendarEvents[day];
                const isToday = day === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const isSelected = day === selectedDay;

                return (
                  <button
                    key={`${day || 'empty'}-${index}`}
                    className={`${styles.dayCell} ${!day ? styles.dayEmpty : ''} ${isToday ? styles.dayToday : ''} ${isSelected ? styles.daySelected : ''}`}
                    disabled={!day}
                    onClick={() => day && setSelectedDay(day)}
                  >
                    {day}
                    {hasEvent && <i />}
                  </button>
                );
              })}
            </div>

            <div className={styles.selectedEvent}>
              <div className={styles.eventDot} />
              <div>
                <span>{selectedEvents[0]?.label || 'No scheduled review'}</span>
                <small>{selectedEvents.length ? 'Scheduled legacy task' : 'Your calendar is clear'}</small>
              </div>
            </div>
          </section>

          {/* Today */}
          <section className={`${styles.card} ${styles.todayCard}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>ATTENTION</span>
                <h3>Today</h3>
              </div>
              <span className={styles.countPill}>03</span>
            </div>

            <div className={styles.todoList}>
              {todayItems.map((item) => {
                const target = item.meta === 'Nominees'
                  ? '/nominees'
                  : item.meta === 'Protection'
                    ? '/vault'
                    : '/documents';
                return (
                  <Link className={styles.todoRow} to={target} key={item.title}>
                    <span className={styles.todoCheck}>{item.done ? <Check size={11} /> : ''}</span>
                    <div>
                      <strong>{item.title}</strong>
                      <span>{item.meta}</span>
                    </div>
                    <ChevronRight size={12} className={styles.todoArrow} />
                  </Link>
                );
              })}
            </div>

            <div className={styles.cardFooterNote}>
              <span>3 actions remaining</span>
              <ListChecks size={12} />
            </div>
          </section>

          {/* Vault */}
          <section className={`${styles.card} ${styles.vaultCard}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>ORGANISE</span>
                <h3>Your vault</h3>
              </div>
              <span className={styles.countPill}>24</span>
            </div>

            <div className={styles.categoryGrid}>
              {categories.map(({ name, count, icon: Icon }) => (
                <div className={styles.categoryRow} key={name}>
                  <span className={styles.categoryIcon}><Icon size={12} strokeWidth={1.7} /></span>
                  <span>{name}</span>
                  <strong>{String(count).padStart(2, '0')}</strong>
                </div>
              ))}
            </div>

            <Link className={styles.textAction} to="/vault">View all assets <ChevronRight size={12} /></Link>
          </section>

          {/* Vault Health */}
          <section className={`${styles.card} ${styles.healthCard}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>STATUS</span>
                <h3>Vault health</h3>
              </div>
              <ShieldCheck size={15} className={styles.mutedIcon} />
            </div>

            <div className={styles.healthRing}>
              <div>
                <strong>68</strong>
                <span>%</span>
              </div>
            </div>
            <span className={styles.healthLabel}>Good progress</span>

            <div className={styles.miniChecks}>
              <span><i /> Account secured</span>
              <span><i /> Nominees added</span>
              <span className={styles.pending}><i /> Emergency plan</span>
            </div>
          </section>

          {/* Quick actions */}
          <section className={`${styles.card} ${styles.quickCard}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>SHORTCUTS</span>
                <h3>Quick actions</h3>
              </div>
              <Plus size={15} className={styles.mutedIcon} />
            </div>

            <div className={styles.quickGrid}>
              <Link to="/vault?new=asset"><span><WalletCards size={13} /></span>Add asset</Link>
              <Link to="/nominees?new=1"><span><UsersRound size={13} /></span>Add nominee</Link>
              <Link to="/documents?upload=1"><span><Upload size={13} /></span>Upload doc</Link>
              <Link to="/calendar?new=1"><span><CalendarDays size={13} /></span>Add date</Link>
            </div>
          </section>

          {/* Financial overview */}
          <Link className={`${styles.card} ${styles.financeCard}`} to="/vault?category=financial">
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>OVERVIEW</span>
                <h3>Financial snapshot</h3>
              </div>
              <Landmark size={15} className={styles.mutedIcon} />
            </div>

            <div className={styles.financeMain}>
              <div>
                <span>Total recorded value</span>
                <strong>₹12.4L</strong>
              </div>
              <button className={styles.eyeButton}>••••</button>
            </div>
            <div className={styles.financeBreakdown}>
              <div><span>Financial</span><strong>₹6.2L</strong></div>
              <div><span>Investments</span><strong>₹4.1L</strong></div>
              <div><span>Property</span><strong>₹2.1L</strong></div>
            </div>
            <div className={styles.financeBar}>
              <span style={{ width: '50%' }} />
              <span style={{ width: '33%' }} />
              <span style={{ width: '17%' }} />
            </div>
          </Link>

          {/* Activity */}
          <Link className={`${styles.card} ${styles.activityCard}`} to="/activity">
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>TIMELINE</span>
                <h3>Recent activity</h3>
              </div>
              <span className={styles.liveDot}>LIVE</span>
            </div>

            <div className={styles.activityList}>
              {activity.map(({ time, title, meta, icon: Icon }) => (
                <div className={styles.activityRow} key={`${time}-${title}`}>
                  <span className={styles.activityIcon}><Icon size={12} strokeWidth={1.7} /></span>
                  <div>
                    <strong>{title}</strong>
                    <span>{meta}</span>
                  </div>
                  <time>{time}</time>
                </div>
              ))}
            </div>
          </Link>

          {/* Smaller category cards */}
          <Link to="/documents" className={`${styles.card} ${styles.smallInfoCard} ${styles.documentsCard}`}>
            <div className={styles.cardTop}>
              <div><span className={styles.cardKicker}>ARCHIVE</span><h3>Documents</h3></div>
              <FileText size={14} className={styles.mutedIcon} />
            </div>
            <strong className={styles.bigSmallNumber}>12</strong>
            <div className={styles.microRows}>
              <span>Identity <b>04</b></span>
              <span>Legal <b>02</b></span>
              <span>Financial <b>03</b></span>
            </div>
          </Link>

          <Link to="/vault?category=insurance" className={`${styles.card} ${styles.smallInfoCard} ${styles.protectionCard}`}>
            <div className={styles.cardTop}>
              <div><span className={styles.cardKicker}>PROTECTION</span><h3>Coverage</h3></div>
              <ShieldCheck size={14} className={styles.mutedIcon} />
            </div>
            <strong className={styles.bigSmallNumber}>82<span>%</span></strong>
            <div className={styles.thinProgress}><span style={{ width: '82%' }} /></div>
            <span className={styles.smallMuted}>3 policies · 2 contacts</span>
          </Link>

          <Link to="/vault?category=digital" className={`${styles.card} ${styles.smallInfoCard} ${styles.digitalCard}`}>
            <div className={styles.cardTop}>
              <div><span className={styles.cardKicker}>DIGITAL</span><h3>Online legacy</h3></div>
              <KeyRound size={14} className={styles.mutedIcon} />
            </div>
            <strong className={styles.bigSmallNumber}>24</strong>
            <div className={styles.microRows}>
              <span>Accounts <b>14</b></span>
              <span>Passwords <b>08</b></span>
              <span>Domains <b>03</b></span>
            </div>
          </Link>

          {/* Legacy readiness */}
          <section className={`${styles.card} ${styles.readinessCard}`}>
            <div>
              <span className={styles.cardKicker}>NEXT STEP</span>
              <h3>Legacy readiness</h3>
              <p>You're building a complete handover for the people who matter.</p>
            </div>

            <div className={styles.readinessChecklist}>
              <span><Check size={11} /> Account secured</span>
              <span><Check size={11} /> Nominees assigned</span>
              <span><Check size={11} /> Documents added</span>
              <span className={styles.pendingItem}>○ Emergency instructions</span>
              <span className={styles.pendingItem}>○ Will / legal documents</span>
              <span className={styles.pendingItem}>○ Personal message</span>
            </div>

            <Link className={styles.darkAction} to="/vault">Continue organising <ChevronRight size={12} /></Link>
          </section>
        </div>

        <div className={styles.pageFooter}>
          <span>DIGIVIRASAT · PRIVATE LEGACY WORKSPACE</span>
          <span>Everything important, organised.</span>
        </div>
      </main>

      {/* Existing floating navigation stays */}
      <div className={styles.bottomFloatingNav}>
        <div className={styles.navMenu}>
          <Link className={styles.navLogo} to="/dashboard">DV.</Link>
          {[
            ['Home', '/dashboard'],
            ['Vault', '/vault'],
            ['Nominees', '/nominees'],
            ['Activity', '/activity'],
            ['Settings', '/settings'],
          ].map(([item, path]) => (
            <Link
              key={item}
              className={activeNav === item ? styles.navItemActive : styles.navItem}
              to={path}
            >
              {item}
            </Link>
          ))}
          <button
            className={styles.signOutBtn}
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
