import React, { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  FileText,
  FolderOpen,
  Gem,
  Home,
  KeyRound,
  Landmark,
  LayoutDashboard,
  ListChecks,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import styles from './Dashboard.module.css';

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
  const now = new Date();
  const [calendarDate, setCalendarDate] = useState(
    new Date(now.getFullYear(), now.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [activeNav, setActiveNav] = useState('Home');

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
          <div className={styles.logoMark}>DV</div>

          <button
            className={`${styles.railButton} ${activeNav === 'Home' ? styles.railButtonActive : ''}`}
            onClick={() => setActiveNav('Home')}
            aria-label="Home"
          >
            <LayoutDashboard size={15} strokeWidth={1.8} />
          </button>
          <button
            className={`${styles.railButton} ${activeNav === 'Vault' ? styles.railButtonActive : ''}`}
            onClick={() => setActiveNav('Vault')}
            aria-label="Vault"
          >
            <FolderOpen size={15} strokeWidth={1.8} />
          </button>
          <button
            className={`${styles.railButton} ${activeNav === 'Nominees' ? styles.railButtonActive : ''}`}
            onClick={() => setActiveNav('Nominees')}
            aria-label="Nominees"
          >
            <UsersRound size={15} strokeWidth={1.8} />
          </button>
          <button
            className={`${styles.railButton} ${activeNav === 'Activity' ? styles.railButtonActive : ''}`}
            onClick={() => setActiveNav('Activity')}
            aria-label="Activity"
          >
            <ListChecks size={15} strokeWidth={1.8} />
          </button>
          <button
            className={`${styles.railButton} ${activeNav === 'Documents' ? styles.railButtonActive : ''}`}
            onClick={() => setActiveNav('Documents')}
            aria-label="Documents"
          >
            <FileText size={15} strokeWidth={1.8} />
          </button>
        </div>

        <div className={styles.sidebarBottom}>
          <button className={styles.railButton} aria-label="Notifications">
            <Bell size={15} strokeWidth={1.8} />
          </button>
          <button className={styles.profileIcon} aria-label="Profile">
            A
          </button>
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
              <div><strong>02</strong><span>nominees</span></div>
              <button className={styles.darkAction}>Continue <ChevronRight size={12} /></button>
            </div>
          </section>

          {/* Nominees */}
          <section className={`${styles.card} ${styles.nomineeCardPanel}`}>
            <div className={styles.cardTop}>
              <div>
                <span className={styles.cardKicker}>PEOPLE</span>
                <h3>Nominees</h3>
              </div>
              <span className={styles.countPill}>02</span>
            </div>

            <div className={styles.nomineeList}>
              <div className={styles.personRow}>
                <div className={styles.avatar}>S</div>
                <div className={styles.personInfo}>
                  <strong>Sarah</strong>
                  <span>Spouse</span>
                </div>
                <span className={styles.share}>50%</span>
              </div>
              <div className={styles.personRow}>
                <div className={`${styles.avatar} ${styles.avatarAlt}`}>J</div>
                <div className={styles.personInfo}>
                  <strong>John</strong>
                  <span>Son</span>
                </div>
                <span className={styles.share}>50%</span>
              </div>
            </div>

            <button className={styles.textAction}><Plus size={12} /> Add nominee</button>
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
              {todayItems.map((item) => (
                <div className={styles.todoRow} key={item.title}>
                  <span className={styles.todoCheck}>{item.done ? <Check size={11} /> : ''}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </div>
                  <ChevronRight size={12} className={styles.todoArrow} />
                </div>
              ))}
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

            <button className={styles.textAction}>View all assets <ChevronRight size={12} /></button>
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
              <button><span><WalletCards size={13} /></span>Add asset</button>
              <button><span><UsersRound size={13} /></span>Add nominee</button>
              <button><span><Upload size={13} /></span>Upload doc</button>
              <button><span><CalendarDays size={13} /></span>Add date</button>
            </div>
          </section>

          {/* Financial overview */}
          <section className={`${styles.card} ${styles.financeCard}`}>
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
          </section>

          {/* Activity */}
          <section className={`${styles.card} ${styles.activityCard}`}>
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
          </section>

          {/* Smaller category cards */}
          <section className={`${styles.card} ${styles.smallInfoCard} ${styles.documentsCard}`}>
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
          </section>

          <section className={`${styles.card} ${styles.smallInfoCard} ${styles.protectionCard}`}>
            <div className={styles.cardTop}>
              <div><span className={styles.cardKicker}>PROTECTION</span><h3>Coverage</h3></div>
              <ShieldCheck size={14} className={styles.mutedIcon} />
            </div>
            <strong className={styles.bigSmallNumber}>82<span>%</span></strong>
            <div className={styles.thinProgress}><span style={{ width: '82%' }} /></div>
            <span className={styles.smallMuted}>3 policies · 2 contacts</span>
          </section>

          <section className={`${styles.card} ${styles.smallInfoCard} ${styles.digitalCard}`}>
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
          </section>

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

            <button className={styles.darkAction}>Continue organising <ChevronRight size={12} /></button>
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
          <div className={styles.navLogo}>DV.</div>
          {['Home', 'Vault', 'Nominees', 'Activity', 'Settings'].map((item) => (
            <button
              key={item}
              className={activeNav === item ? styles.navItemActive : styles.navItem}
              onClick={() => setActiveNav(item)}
            >
              {item}
            </button>
          ))}
          <button className={styles.signOutBtn}>Sign out</button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
